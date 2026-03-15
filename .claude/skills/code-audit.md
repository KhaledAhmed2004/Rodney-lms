---
name: code-audit
description: Deep module-level code audit across security, performance, type safety, architecture, error handling, validation, API response design, database, route design, and testing. Outputs findings to docs/module-audit/.
user_invocable: true
---

# Module Code Audit

You are a senior staff engineer performing a comprehensive code audit. Deeply analyze a module's actual code and produce actionable findings across all quality dimensions.

## Input

The user will provide one of:
- **Module name**: e.g., `community`, `course`, `user`, `chat`
- **Module name + category filter**: e.g., `community --only security,performance`
- **No argument**: Audit the module of the currently focused/open file

Available categories for `--only` filter: `security`, `performance`, `types`, `architecture`, `errors`, `validation`, `response`, `database`, `routes`, `testing`

## Step 0: Resolve Module

1. Map the input to a module directory: `src/app/modules/[module]/`
2. Verify the directory exists. If not, list available modules and ask the user to clarify.
3. If no argument given, detect from the currently open file path.

## Step 1: Read All Module Files (Parallel)

Read ALL of these files in a single parallel batch:

**Core module files:**
- `src/app/modules/[module]/[module].interface.ts`
- `src/app/modules/[module]/[module].model.ts`
- `src/app/modules/[module]/[module].validation.ts`
- `src/app/modules/[module]/[module].service.ts`
- `src/app/modules/[module]/[module].controller.ts`
- `src/app/modules/[module]/[module].route.ts`

**Context files:**
- `src/routes/index.ts` — route registration and path
- Any sub-directories inside the module folder

If any core file is missing, note it as an Architecture finding.

## Step 2: Analyze by Category

Run checks in this order. Apply the project's existing rules from `.claude/rules/` — don't duplicate them, just apply the checks.

### Category 1: SECURITY

**1.1 NoSQL Injection**
- User input used directly in `$regex`, `$where`, `$gt/$lt` without sanitization
- `req.body` / `req.query` / `req.params` passed directly to `.find()`, `.findOne()`, `.updateOne()` without Zod validation
- Search terms not escaped with `escape-string-regexp` before regex use

**1.2 Broken Authentication**
- Endpoints missing `auth()` middleware that should require it
- Auth roles too permissive (any authenticated user accessing admin data)
- JWT/token handling issues

**1.3 Sensitive Data Exposure**
- Password hashes, OTP codes, `authentication` object, device tokens in API responses
- `select: false` fields bypassed via `.create()` raw return
- `console.log` of sensitive data
- Internal fields (`__v`, Mongoose internals) leaked

**1.4 Broken Access Control**
- User A can access/modify User B's data (missing ownership check)
- No authorization check on resource ownership in update/delete
- Role escalation possible

**1.5 Security Misconfiguration**
- Rate limiting missing on sensitive endpoints
- No input length limits (`.max()` on string fields)
- File upload without type/size validation

### Category 2: PERFORMANCE

**2.1 N+1 Queries**
- Loop with DB call per iteration (`.find()` inside `.map()` or `for`)
- Multiple separate queries that could be a single aggregation or populate

**2.2 Unbounded Queries**
- `.find()` without `.limit()` and no pagination on list endpoints

**2.3 Missing Indexes**
- Fields used in `.find()` / `.findOne()` filters not indexed in model
- Compound queries without compound indexes
- Check `schema.index()` calls vs actual query patterns

**2.4 Unnecessary DB Re-fetch**
- Data already in memory but re-fetched with `{ new: true }` or separate `.findById()`

**2.5 Memory Concerns**
- Large arrays loaded entirely into memory without streaming
- Unbounded array fields in schema

### Category 3: TYPE SAFETY

**3.1 `any` Usage**
- Explicit `any` types, `as any` casts
- Implicit `any` from untyped function parameters

**3.2 Unsafe Assertions**
- `as string`, `as number` without runtime validation
- `@ts-ignore` / `@ts-expect-error` comments
- Non-null assertions (`!`) without guards

**3.3 Missing Types**
- Service methods without return type annotations
- Interface fields missing vs actual schema fields

### Category 4: ARCHITECTURE

Apply rules from `.claude/rules/architecture.md`:

**4.1 Module Structure**
- All 6 files present? (interface, model, validation, service, controller, route)
- Controller thin? (only req parsing + sendResponse)
- Service fat? (all business logic here)

**4.2 Separation of Concerns**
- Business logic in route or controller (should be in service)
- DB queries in controller (should be in service)
- Response formatting in service (should be in controller)

**4.3 Code Organization**
- Dead code (unused imports, unreachable code, commented-out blocks)
- DRY violations within the module

### Category 5: ERROR HANDLING

**5.1 Error Coverage**
- All error paths throw `ApiError` with appropriate status codes
- Not-found checks on `.findById()` / `.findOne()` results
- Null/undefined checks before accessing nested properties

**5.2 Error Quality**
- Error messages descriptive and user-facing appropriate
- No stack traces or internal details leaked
- Consistent error message style

**5.3 catchAsync Coverage**
- All controller methods wrapped in `catchAsync`
- No unhandled promise rejections (missing `await`)

### Category 6: INPUT VALIDATION

**6.1 Zod Coverage**
- Every POST/PATCH route has `validateRequest()` middleware
- All required fields have proper Zod validation
- String fields have `.trim()` and reasonable `.max()` limits
- Email fields have `.email().toLowerCase().trim()`

**6.2 Coercion**
- Routes with `fileHandler` use `z.coerce.number()` / `z.coerce.boolean()` for non-string types

**6.3 File Upload Validation**
- Allowed file types specified in `fileHandler` config
- Old file deletion on update handled properly

### Category 7: API RESPONSE DESIGN

Apply rules from `.claude/rules/api-response.md`:

**7.1 Create Response**
- Raw `.create()` result never returned (re-fetch with `.select()`)
- Only `_id` + user-submitted fields + `createdAt` returned
- Default values, `updatedAt`, `__v` excluded

**7.2 Update Response**
- Only `_id` + changed/changeable fields returned
- No unnecessary re-populate or re-fetch

**7.3 List Response**
- Nested arrays excluded (`.select('-nestedArray')`)
- Pagination present

**7.4 General**
- DB-level `.select()` filtering (not application-level `delete`)
- Role-based field projection where applicable
- Sub-document CRUD returns only affected sub-document
- Consistent field names across related endpoints

### Category 8: DATABASE

Apply rules from `.claude/rules/db-review.md`:

**8.1 Schema Design**
- Embedding vs referencing appropriate for the relationship
- `trim: true` on string fields
- Enum values using `Object.values(ENUM)`
- `{ timestamps: true }` present
- `select: false` on sensitive fields

**8.2 Index Strategy**
- Frequently queried fields indexed
- Compound indexes for filter+sort patterns
- Unique constraints where needed

**8.3 Mongoose Gotchas**
- Unbounded arrays without size limits
- Over-population (3+ level deep populate)
- Missing `.lean()` on read-only queries

### Category 9: ROUTE DESIGN

Apply rules from `.claude/rules/route-design.md`:

**9.1 Declaration Order**
- Fixed paths before param paths (`/export` before `/:id`)
- Middleware chain: `rateLimit -> auth -> fileHandler -> validateRequest -> controller`

**9.2 Naming**
- File named `*.route.ts` (singular), export `PascalCaseRoutes`
- URL paths kebab-case, plural resources

**9.3 Completeness**
- Route registered in `src/routes/index.ts`
- Every POST/PATCH has `validateRequest()`

### Category 10: TESTING

**10.1 Test Existence**
- Does a test file exist for this module? (check `tests/`, `__tests__/`, `*.test.ts`, `*.spec.ts`)
- If no tests, flag as HIGH severity

**10.2 Test Coverage (if tests exist)**
- Happy path covered for each endpoint
- Error cases covered (404, 400, 403)
- Edge cases and auth/role checks tested

## Step 3: Severity Classification

- **CRITICAL**: Security vulnerability, data leak, crash blocker, `.create()` raw return exposing passwords
- **HIGH**: Missing auth, no validation on POST/PATCH, N+1 queries, no tests
- **MEDIUM**: Type safety issues, missing indexes, over-fetching, dead code, missing `.max()` limits
- **LOW**: Style issues, `__v` leaking, missing `.lean()`, minor naming issues

### Skip Criteria
- Do NOT report clearly intentional design decisions documented in comments
- Do NOT flag pagination absence on bounded endpoints (legal pages, user profile)
- Do NOT duplicate `/ux-review` checks (UX flow doc vs code shape comparison)

## Step 4: Output Report

**Check first**: Does `docs/module-audit/[module]-module-audit.md` already exist? If yes, ask user whether to overwrite or do a delta audit.

Write the report to `docs/module-audit/[module]-module-audit.md`:

```markdown
# [Module] Module Audit

**Date**: YYYY-MM-DD
**Module**: `src/app/modules/[module]/`
**Status**: Reviewed

## Files Reviewed

- `src/app/modules/[module]/[module].interface.ts`
- `src/app/modules/[module]/[module].model.ts`
- ... (list all files actually read)

---

## Issues Found

### Security
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|
| 1 | [title] | CRITICAL/HIGH | `file.ts:~line` | [specific fix] |

### Performance
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Type Safety
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Architecture
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Error Handling
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Input Validation
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### API Response Design
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Database
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Route Design
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

### Testing
| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|

---

## What Was Already Good

| # | Pattern | Where |
|---|---------|-------|
| 1 | [good pattern found] | `file.ts` |

---

## Summary

Total issues: X
CRITICAL: X | HIGH: X | MEDIUM: X | LOW: X

**Immediate action**: [CRITICAL + HIGH items]
**Should fix**: [MEDIUM items]
**Technical debt**: [LOW items]

---

## Remaining Considerations

| # | Item | Priority | Note |
|---|------|----------|------|
| 1 | [future improvement] | LOW/MEDIUM | [context] |

> For UX flow doc vs API response shape comparison, run `/ux-review [module]`.
```

If `--only` filter was used, add at top: `**Partial audit** — only [categories] checked.`

## Step 5: Summary to User

After writing the audit doc, give a Banglish summary:

```
Audit complete: docs/module-audit/[module]-module-audit.md

[X] issues found — [Y] CRITICAL, [Z] HIGH, [W] MEDIUM, [V] LOW

Top 3 urgent fixes:
1. [CRITICAL] [brief description]
2. [HIGH] [brief description]
3. [HIGH] [brief description]

Fix korte chaile bolo — batch e shob fixable issues 1 round e fix kore dibo.
UX flow comparison dorkar hole: /ux-review [module]
```

## Important Notes

- **Token efficiency**: Read all files once in parallel. Never re-read files for different categories.
- **Practical checks only**: Check actual code, not theoretical concerns. If the code is fine, say it's fine.
- **Line numbers**: Use approximate line references (`~line`) since code changes.
- **Existing rules**: Apply checks FROM `.claude/rules/` — don't re-invent them.
- **Batch fix ready**: Structure findings so they can be fixed in one batch.
- **No plan file duplication**: Write audit content directly to the audit doc.
- **Communication**: Give feedback in Banglish (Bangla + English mix).