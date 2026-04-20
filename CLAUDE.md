# CLAUDE.md

TypeScript + Express + MongoDB/Mongoose + Socket.IO + OpenTelemetry backend template.

## Commands

```bash
npm run dev              # Dev server with hot reload
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled code from dist/
npm test                 # Vitest in watch mode
npm run test:run         # Tests once
npm run test:coverage    # Coverage report
npx vitest run <path>    # Single test file
npm run lint:check       # Check linting
npm run lint:fix         # Auto-fix linting
npm run prettier:check   # Check formatting
npm run prettier:fix     # Auto-format
```

## CRITICAL: Import Order in app.ts / server.ts

IMPORTANT: This order MUST be followed exactly. Violating it causes runtime errors.

```typescript
import './app/logging/mongooseMetrics';      // 1. Before Mongoose models
import './app/logging/autoLabelBootstrap';    // 2. Before routes/controllers
import './app/logging/opentelemetry';         // 3. Before instrumented code
import './app/logging/patchBcrypt';           // 4. Third-party patches
import './app/logging/patchJWT';
import router from './routes';               // 5. LAST: Routes
```

## Module Pattern

```
app/modules/[feature]/
├── [feature].interface.ts      # Types
├── [feature].model.ts          # Mongoose schema
├── [feature].controller.ts     # Thin request handlers
├── [feature].service.ts        # Fat business logic
├── [feature].route.ts          # Express routes
└── [feature].validation.ts     # Zod schemas
```

**Flow**: Route → `validateRequest(ZodSchema)` → Controller (`catchAsync`) → Service → Model → `sendResponse()`

## Common Patterns

```typescript
// Controllers: always wrap with catchAsync
export const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUser(req.body);
  sendResponse(res, { success: true, statusCode: 201, message: 'User created', data: result });
});

// Services: throw ApiError for errors
if (!user) throw new ApiError(404, 'User not found');

// Routes: validate with Zod
router.post('/create', validateRequest(UserValidation.createUser), UserController.createUser);

// QueryBuilder for search/filter/sort/pagination
new QueryBuilder(Model.find(), req.query).search(['name', 'email']).filter().sort().paginate();

// AggregationBuilder for complex joins/grouping
new AggregationBuilder(User, req.query).match({ status: 'active' }).lookup(...).execute();
```

## Testing

- Framework: Vitest | DB: MongoDB Memory Server | HTTP: Supertest
- Setup: `tests/setup/vitest.setup.ts` | Path alias: `@/` maps to `src/`

## Codebase Map

> Notun module/file/route add korle ei map UPDATE koro.

### Core Entry Points
| File | Ki Kore |
|------|---------|
| `src/app.ts` | Express app — middleware chain, CORS, cookie, parser |
| `src/server.ts` | Server start, MongoDB connect, Socket.IO init, seed (admin + badges) |
| `src/config/index.ts` | Shob env variable ek jaygay |
| `src/routes/index.ts` | Shob module route register kora hoy ekhane |
| `public/postman-collection.json` | Full Postman collection (all API endpoints) |

### Modules — `src/app/modules/`
| Module | Ki Kore | Key Endpoints |
|--------|---------|---------------|
| `auth/` | Login, register, password reset, email verify, JWT refresh | POST /auth/login, /auth/register, /auth/refresh-token |
| `user/` | User CRUD, profile update, role manage, export | GET /users, GET /users/export, GET /users/:id, PATCH /users/:id, DELETE /users/:id |
| `course/` | Course + module + lesson CRUD | GET /courses, POST /courses |
| `chat/` | Chat room create, group/private | POST /chats, GET /chats |
| `message/` | Message send/receive, Socket.IO real-time | POST /messages, GET /messages/:chatId |
| `notification/` | Push/email/in-app notifications (unified — receiver-scoped per user) + admin broadcast tools | GET /notifications, PATCH /notifications/:id/read, PATCH /notifications/read-all, POST /notifications/admin/send, GET /notifications/admin/sent |
| `gamification/` | Points, badges, leaderboard, student summary | GET /gamification/leaderboard, /gamification/badges, PATCH /gamification/badges/:id |
| `gradebook/` | Student grades, assignment submissions, admin gradebook + summary + export | GET /gradebook/students/summary, /gradebook/students, /gradebook/students/export |
| `feedback/` | Student course reviews, admin feedback management + summary | POST /feedback, GET /feedback/admin/all, PATCH /feedback/:id/respond |
| `enrollment/` | Course enrollment, lesson progress tracking | POST /enrollments, GET /enrollments |
| `quiz/` | Quiz CRUD, quiz attempts, scoring | GET /quizzes, POST /quizzes |
| `community/` | Community posts, discussions | GET /community, POST /community |
| `analytics/` | Dashboard analytics, course analytics | GET /analytics |
| `legal/` | Terms of service, privacy policy management | GET /legal |
| `activity/` | User activity tracking | GET /activity |

### Middlewares — `src/app/middlewares/`
| File | Ki Kore |
|------|---------|
| `auth.ts` | JWT verify + role check: `auth(USER_ROLES.ADMIN)` |
| `validateRequest.ts` | Zod schema diye request body validate |
| `fileHandler.ts` | File upload — S3/Cloudinary/local, Sharp optimize |
| `globalErrorHandler.ts` | Shob error ek jaygay handle |
| `rateLimit.ts` | API rate limiting |

### Builders — `src/app/builder/`
| File | Ki Kore |
|------|---------|
| `QueryBuilder.ts` | `.search().filter().sort().paginate()` chain |
| `AggregationBuilder.ts` | `.match().lookup().unwind().group()` chain |
| `EmailBuilder/` | Email template + theme + component system |
| `NotificationBuilder/` | Multi-channel notification + scheduler |
| `JobBuilder/` | Background job queue + worker |
| `CacheBuilder/` | Memory/Redis/multi-layer cache |
| `SocketBuilder/` | Socket event handler + throttle |
| `TestBuilder/` | Test factory + helper |
| `PDFBuilder.ts` | PDF generate |
| `ExportBuilder.ts` | Data export (CSV, Excel) |

### Helpers — `src/helpers/`
| File | Ki Kore |
|------|---------|
| `jwtHelper.ts` | JWT sign + verify |
| `emailHelper.ts` | Email send (SMTP) |
| `socketHelper.ts` | Socket.IO init + event setup |
| `paginationHelper.ts` | Page/limit calculate |
| `authHelpers.ts` | Auth utility (hash, compare) |
| `gamificationHelper.ts` | Points award + badge evaluation (awardPoints, checkAndAwardBadges). Flow doc: `docs/decisions/gamification-points-flow.md` |
| `enrollmentHelper.ts` | Enrollment verification (verifyEnrollment with status check) |
| `activityHelper.ts` | User activity tracking helper |
| `presenceHelper.ts` | Socket.IO user presence tracking |
| `unreadHelper.ts` | Unread message count tracking |

### Shared — `src/shared/`
| File | Ki Kore |
|------|---------|
| `catchAsync.ts` | Controller async error wrapper |
| `sendResponse.ts` | Standard API response format |
| `logger.ts` | Winston logger |
| `pick.ts` | Object theke specific key pick |

### Database Seeds — `src/DB/`
| File | Ki Kore |
|------|---------|
| `seedAdmin.ts` | Super admin account create kore (if missing) |
| `seedBadges.ts` | 17 default badges seed kore (if missing) — admin er changes preserve thake |
| `seedFeedback.ts` | Demo feedback data seed (development only) |

### API Routes — `src/routes/index.ts`
| Route | Module |
|-------|--------|
| `/auth` | AuthRoutes |
| `/users` | UserRoutes |
| `/courses` | CourseRoutes |
| `/chats` | ChatRoutes |
| `/messages` | MessageRoutes |
| `/notifications` | NotificationRoutes |
| `/enrollments` | EnrollmentRoutes |
| `/quizzes` | QuizRoutes |
| `/gradebook` | GradebookRoutes |
| `/feedback` | FeedbackRoutes |
| `/gamification` | GamificationRoutes |
| `/community` | CommunityRoutes |
| `/analytics` | AnalyticsRoutes |
| `/legal` | LegalRoutes |
| `/activity` | ActivityRoutes |
| `/dashboard` | DashboardRoutes |
| `/student` | StudentRoutes |

## Environment Variables

See `.env.example` for full list. Key required vars:
- `DATABASE_URL`, `PORT`, `NODE_ENV`
- `JWT_SECRET`, `JWT_EXPIRE_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE_IN`, `BCRYPT_SALT_ROUNDS`
- `EMAIL_FROM`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_HOST`, `EMAIL_PORT`
- `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`
- `FRONTEND_URL`

## Documentation

IMPORTANT: Always update documentation when making code changes. See `.claude/rules/documentation-standards.md` for full standards.

Docs in `docs/` directory:
- `docs/architecture/` - System overview, auth flow, data flow, DB design, module structure, Socket.IO
- `docs/ux-flow-api-responses/` - Screen-wise API flow docs (app-screens/ + dashboard-screens/)
- `docs/decisions/` - Feature decisions & flow docs (gamification points, UX flows)
- `docs/code-quality-audit-report.md` - Code quality audit

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Plan Before Build**: Enter plan mode for any non-trivial task (3+ steps or architectural decisions).
- **Prove It Works**: Never mark a task complete without verification (tests, logs, demonstration).

## Additional Rules

Detailed rules are split into `.claude/rules/`:
- `architecture.md` - Module pattern, query builders, Socket.IO, auth, file uploads
- `logging.md` - Import order, observability system, instrumentation files
- `documentation-standards.md` - Documentation quality standards, update protocol, module status
- `workflow.md` - Core principles, planning, subagent strategy, verification, bug fixing, quality, self-improvement, task management
- `route-design.md` - RESTful route design standards, URL naming, middleware chain order, anti-patterns
- `postman-collection.md` - Postman collection update rules, screen-based structure, must update when adding/changing APIs
