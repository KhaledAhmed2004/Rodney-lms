# Architecture Reference

Detailed architecture concepts for the codebase. Read this when working on specific systems.

## Module Pattern

Every feature module follows this structure:

```
app/modules/[feature]/
├── [feature].interface.ts      # TypeScript types and interfaces
├── [feature].model.ts          # Mongoose schema and model
├── [feature].controller.ts     # Request handlers (thin layer)
├── [feature].service.ts        # Business logic (fat layer)
├── [feature].route.ts          # Express route definitions
└── [feature].validation.ts     # Zod validation schemas
```

**Flow**: Route → Validation (Zod) → Controller (catchAsync) → Service → Model
- Controllers use `sendResponse()` for standardized responses
- Services use QueryBuilder/AggregationBuilder for complex queries

## Query Builders

**QueryBuilder** (`app/builder/QueryBuilder.ts`):
- Chainable: `search()`, `filter()`, `sort()`, `paginate()`, `fields()`, `location()`, `timeFilter()`
- Use for search/filter/sort/pagination queries on a single collection

**AggregationBuilder** (`app/builder/AggregationBuilder.ts`):
- For complex grouping/analytics on a single collection
- **LIMITATION**: Does NOT support cross-collection `$lookup` joins or `$facet` pagination. Jokhon cross-collection join + pagination ekসাথে dorkar hoy, raw `User.aggregate()` use koro

**Raw Aggregation** (use when `QueryBuilder`/`AggregationBuilder` insufficient):
- Cross-collection join + single-query pagination: `$lookup` + `$facet`
- Always type pipeline as `PipelineStage[]` (import from `mongoose`)
- Use `-1 as const` for sort literals to satisfy TypeScript union type `1 | -1`

```typescript
import { PipelineStage } from 'mongoose';

const pipeline: PipelineStage[] = [
  { $match: matchConditions },
  {
    $lookup: {
      from: 'enrollments',          // MongoDB collection name (Mongoose pluralizes model names)
      localField: '_id',
      foreignField: 'student',
      as: 'enrollments',
    },
  },
  {
    $addFields: {
      enrollmentCount: { $size: '$enrollments' },
      lastActiveDate: '$streak.lastActiveDate', // flatten nested field
    },
  },
  {
    $project: { name: 1, email: 1, enrollmentCount: 1, lastActiveDate: 1 },
  },
  {
    $facet: {                        // single round trip: data + total count
      data: [{ $sort: sortSpec }, { $skip: skip }, { $limit: limit }],
      total: [{ $count: 'count' }],
    },
  },
];

const result = await User.aggregate(pipeline);
const data = result[0]?.data ?? [];
const total = result[0]?.total[0]?.count ?? 0;
```

**Shared filter helper pattern** — jodi multiple service methods same `$match` conditions use kore:
```typescript
const buildMatchConditions = (query: Record<string, unknown>) => {
  const conditions: Record<string, unknown> = { status: { $ne: 'DELETE' } };
  if (query.searchTerm) {
    const sanitized = escapeRegex(String(query.searchTerm)); // escape-string-regexp
    conditions.$or = [
      { name: { $regex: sanitized, $options: 'i' } },
      { email: { $regex: sanitized, $options: 'i' } },
    ];
  }
  return conditions;
};
```

Simple queries: Use Mongoose directly.

## File Upload System

Multi-provider system in `app/middlewares/fileHandler.ts`:
- Providers: `local`, `s3`, `cloudinary`, `memory` (testing)
- Features: Sharp image optimization, type validation, per-field max count, auto cleanup

```typescript
fileHandler({
  provider: 's3',
  fields: [
    { name: 'avatar', maxCount: 1, folder: 'avatars', allowedTypes: ['image'] }
  ]
})
```

## Socket.IO Architecture

JWT-authenticated real-time features:
1. Client connects with JWT → Server validates in `socketHelper.ts`
2. User joins private room `user:{userId}` + all chat rooms

**Events**: `join-room`, `leave-room`, `send-message`, `typing`, `stop-typing`, `user-online`, `user-offline`
**Helpers**: `presenceHelper.ts` (presence), `unreadHelper.ts` (unread counts)
**Pattern**: Controllers emit Socket.IO events after DB operations

## Authentication Flow

**Local Auth**: Register (bcrypt hash → save → verify OTP) → Auto-login (tokens returned with OTP verify response) → Password reset (crypto token → email → verify → update)

**JWT Middleware**: `auth()` verifies JWT from cookies/Authorization header, supports role-based access: `auth(USER_ROLES.ADMIN)`

**Auto-login after OTP verify**: Email verify successful hole access + refresh token return koro — user ke manually login korte bolbe na. Industry standard pattern (Discord, Notion, Slack).

**Cookie consistency**: Token return korle **shob endpoint e** (login, verify, refresh) same httpOnly cookie pattern follow koro:
```typescript
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: config.node_env === 'production',
  sameSite: 'lax' as const,
});
```

## Response Format

```typescript
{ success: boolean; statusCode?: number; message?: string; pagination?: { page, limit, totalPage, total }; data?: T }
```

## Response Design Rules

- **Principle of Least Privilege**: API response e shudhu relevant data return koro — unnecessary fields expose kora security + UX both er jonno kharap
- **DB-level filtering**: Response shaping always DB level e koro (`.select()` / `.select('-field')`), application level e manually delete koro na
- **Sub-document CRUD response**: Embedded array item (module, lesson etc.) add/update/reorder korle full parent document return koro na — shudhu affected sub-document(s) return koro
- **Avoid unnecessary DB re-fetch**: Data already memory te thakle (e.g. object build kora, array construct kora) `{ new: true }` diye DB theke re-fetch koro na — directly return koro
- **List endpoint exclusion**: List/manage page er API te nested arrays (modules, lessons etc.) exclude koro `.select('-field')` diye — detail page e alag endpoint e fetch korbe
- **Consistency across endpoints**: Ekta endpoint e fix korle, related endpoints eO same fix apply koro — half-baked fix never acceptable
- **`Model.create()` bypasses `select: false`**: `.create()` er return value te `select: false` fields (password, authentication) ashbe — `.find()` / `.findById()` te kaje laage but `.create()` te na. Fix: create er por `Model.findById(id).select('field1 field2')` diye re-fetch koro. Raw `.create()` result NEVER return koro

### Create Response Checklist
Notun resource create korle (POST):
- Raw `.create()` result NEVER return koro — `.findById(id).select('field1 field2')` diye re-fetch koro
- Default values exclude koro (`status: ACTIVE`, `count: 0`) — client already jane
- `updatedAt` exclude koro — create e same as `createdAt`, redundant
- `__v` exclude koro — internal Mongoose field
- Author/user populate koro NA — client nijer info already jane
- **Return**: `_id` + user-submitted fields + `createdAt`

### Update Response Checklist
Existing resource update korle (PATCH):
- Shudhu changed/changeable fields return koro — client er state e baki data already ache
- Author populate koro NA — user nijer data edit korche, nijer info client e ache
- `status`, `createdAt`, `updatedAt`, counts — exclude koro, edit e relevant na
- Extra DB query avoid koro (like check, re-populate) — unnecessary round trip
- **Return**: `_id` + fields that can change in this endpoint
