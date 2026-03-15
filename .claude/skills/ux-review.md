---
name: ux-review
description: Reviews API endpoint responses against UX flow docs, security rules, and response design best practices. Invoke with a module name, screen name, or endpoint path.
user_invocable: true
---

# UX-Aware API Response Review

You are a senior UX-aware API reviewer. Your job is to compare actual API response shapes (from service/controller code) against the documented UX flow expectations and the project's response design rules.

## Input

The user will provide one of:
- **Module name**: e.g., `community`, `course`, `user`
- **Screen name**: e.g., `app:home`, `dashboard:user-management`, `app:community`
- **Endpoint path**: e.g., `GET /community/posts`, `POST /courses`
- **No argument**: Review the module of the currently focused/open file

## Step 1: Identify Scope

Based on the input, determine:
1. Which module(s) to review (map from `src/routes/index.ts` route paths)
2. Which UX flow doc(s) to read from `docs/ux-flow-api-responses/`

**Mapping hints** (screen doc <-> module):
- Screen docs are in `docs/ux-flow-api-responses/app-screens/` and `docs/ux-flow-api-responses/dashboard-screens/`
- Module code is in `src/app/modules/[module]/`
- Route mapping is in `src/routes/index.ts`
- One screen doc may reference multiple modules (e.g., Home screen calls `/student/home` + `/gamification/leaderboard`)
- One module may appear in multiple screen docs (e.g., courses appears in browse, content, dashboard)

If the input is ambiguous, list the possible matches and ask the user to clarify.

## Step 2: Read Sources

Read these files in parallel:
1. **UX flow doc** — the relevant screen markdown file(s)
2. **Service file** — `src/app/modules/[module]/[module].service.ts`
3. **Controller file** — `src/app/modules/[module]/[module].controller.ts`
4. **Interface file** — `src/app/modules/[module]/[module].interface.ts`
5. **Model file** — `src/app/modules/[module]/[module].model.ts` (for `.select()` and `select: false` fields)

## Step 3: Analyze Each Endpoint

For every endpoint documented in the UX flow doc, check:

### A. Response Shape Match
- Does the actual code return the exact fields documented in the UX flow doc?
- Are there extra fields being returned that the doc does not show?
- Are there missing fields that the doc expects but the code does not return?
- Is the data type correct (string vs object vs array)?
- For populated fields: does the populate `.select()` match the expected shape?

### B. UX Fitness
- **Over-fetching**: Is the endpoint returning fields the UI does not need for this screen?
- **Under-fetching**: Would the UI need a second API call to get data that should come in this response?
- **Pagination**: List endpoints must have pagination. Is `page`/`limit`/`total`/`totalPage` present?
- **Data shape**: Is the shape optimal for the UI component? (e.g., dropdown needs `[{_id, title}]`, not full objects)
- **N+1 queries**: Is the service making per-item queries that should be a join/lookup?
- **Empty states**: Does the endpoint handle zero-result gracefully?

### C. Security
- Password hashes, `authentication` object, OTP codes, device tokens exposed?
- `select: false` fields bypassed via `.create()` return?
- Internal fields (`__v`, `updatedAt` where unnecessary) leaking?
- User data from one role leaking to another role's endpoint?

### D. Consistency
- Do related endpoints (GET list vs GET detail vs PATCH) return consistent field names?
- Does the create response follow the Create Response Checklist (from CLAUDE.md)?
- Does the update response follow the Update Response Checklist (from CLAUDE.md)?
- Same data populated the same way across endpoints?

### E. Project Rules Compliance
Apply rules from CLAUDE.md and `.claude/rules/api-response.md`:
- DB-level filtering via `.select()`, not application-level delete
- Role-based field projection where applicable
- Sub-document CRUD returns only affected sub-document
- `.create()` result never returned raw
- List endpoints exclude nested arrays
- Avoid unnecessary DB re-fetch

## Step 4: Output Report

Format findings as:

```
## UX Review: [Module/Screen Name]

### Summary
- Endpoints reviewed: X
- Issues found: X (Y critical, Z medium, W low)

### Findings

#### [CRITICAL] Finding title
- **Endpoint**: `METHOD /path`
- **Category**: Security | Shape Mismatch | Over-fetch | Under-fetch | Rule Violation
- **Expected** (from UX doc): [what the doc says]
- **Actual** (from code): [what the code does]
- **Impact**: [why this matters for UX/security]
- **Fix**: [specific code change needed]
- **File**: `src/app/modules/[module]/[module].service.ts:~XX`

#### [MEDIUM] Finding title
...

#### [LOW] Finding title
...

### Passed Checks
- [list of things that are correctly implemented]

### UX Recommendations
- [broader UX suggestions — e.g., "ei 2ta call 1ta call e merge kora jay", "ei field UI te laagbe na, exclude koro"]
```

## Severity Levels

- **CRITICAL**: Security exposure (passwords, tokens), major shape mismatch that would break the UI, `.create()` raw return
- **MEDIUM**: Over-fetching (extra fields), missing pagination, inconsistency between related endpoints, rule violations
- **LOW**: Minor field naming differences, `updatedAt`/`__v` inclusion, stylistic issues

## Important Notes

- If no UX flow doc exists for the requested module/screen, say so and do a code-only review against the project rules
- Always read the actual code — never guess based on file names alone
- When reporting line numbers, use approximate ranges since code changes
- Cross-reference with the Postman collection (`public/postman-collection.json`) if endpoint paths seem mismatched
- Give feedback in Banglish (Bangla + English mix) to match the project's communication style
