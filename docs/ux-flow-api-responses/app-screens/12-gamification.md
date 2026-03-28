# Screen 12: Gamification (Admin Dashboard)

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)

---

## Points System Architecture

> Full flow doc: **[`docs/decisions/gamification-points-flow.md`](../../decisions/gamification-points-flow.md)** — detailed event flows, duplicate rules, badge criteria

```
Student Action (quiz pass, lesson complete, course finish...)
    ↓
Service function (enrollment / quiz / community)
    ↓
GamificationHelper.awardPoints(studentId, reason, referenceId)
    ├── Duplicate check (PointsLedger e same reason + referenceId ache kina → skip)
    ├── PointsLedger.create() — audit trail
    ├── User.totalPoints $inc — running total
    └── DailyActivity.pointsEarned $inc — daily tracking
    ↓
GamificationHelper.checkAndAwardBadges(studentId)
    ↓
Protita active badge er criteria check → threshold meet korle → StudentBadge create
    ↓
Leaderboard e totalPoints diye rank hoy
```

**Helper**: `src/app/helpers/gamificationHelper.ts` — `awardPoints()` + `checkAndAwardBadges()`

### Point Values

| Action | Points | Reason Enum |
|--------|:------:|-------------|
| Lesson complete | 10 | `LESSON_COMPLETE` |
| Quiz pass | 25 | `QUIZ_PASS` |
| Quiz perfect (100%) | 50 | `QUIZ_PERFECT` |
| Course complete | 100 | `COURSE_COMPLETE` |
| First enrollment | 5 | `FIRST_ENROLLMENT` |
| Streak bonus | 15 | `STREAK_BONUS` |
| Community post | 5 | `COMMUNITY_POST` |

### 17 Badges (Auto-Seeded)

| Category | Badges | Unlock Criteria |
|----------|--------|-----------------|
| Points | Rising Star → Point Collector → Point Master → Point Legend | 100 / 500 / 1,000 / 5,000 total points |
| Courses | First Steps → Course Explorer → Course Master → Course Legend | 1 / 3 / 5 / 10 courses completed |
| Quizzes | Quiz Starter → Quiz Master → Quiz Champion | 1 / 10 / 25 quizzes passed |
| Perfect Quiz | Perfect Score → Perfectionist | 1 / 5 perfect (100%) quiz scores |
| Streak | Consistent Learner → Streak Champion → Streak Legend | 7 / 30 / 100 day streak |
| Custom | Early Adopter | Admin-awarded manually (threshold: 0) |

> Badges are **seeded on app startup** (`src/DB/seedBadges.ts`). No create/delete API — admin shudhu description, threshold, isActive edit korte pare.

### Database Collections

| Collection | Purpose | Key Index |
|------------|---------|-----------|
| `pointsledgers` | Audit trail — every point award | `{ student: 1, createdAt: -1 }`, `{ reason: 1 }` |
| `badges` | Master badge definitions (17 seeded) | `{ isActive: 1 }` |
| `studentbadges` | Earned badges per student | `{ student: 1, badge: 1 }` (unique) |

### Integration Status — ACTIVE

> Points system **fully wired up**. Duplicate prevention built-in. All calls wrapped in try-catch (failure doesn't block main action).

| Service | Function | Event | Points | Status |
|---------|----------|-------|:------:|:------:|
| `enrollment.service.ts` | `enrollInCourse()` | First enrollment | 5 | Active |
| `enrollment.service.ts` | `completeLesson()` | Lesson complete | 10 | Active |
| `enrollment.service.ts` | `completeLesson()` | Course auto-complete | 100 | Active |
| `enrollment.service.ts` | `updateStatus()` | Course manual complete | 100 | Active |
| `quiz.service.ts` | `submitAttempt()` | Quiz pass (not perfect) | 25 | Active |
| `quiz.service.ts` | `submitAttempt()` | Quiz perfect (100%) | 50 | Active |
| `community.service.ts` | `createPost()` | New community post | 5 | Active |
| _(streak logic)_ | — | Streak milestone | 15 | Not yet |

---

## UX Flow

### Badge Management
1. Admin "Gamification → Badges" e navigate kore
2. Page load → `GET /gamification/badges` (→ 12.1) — paginated badge list
3. Each badge card e dekhay: icon, name, criteria type, threshold, active/inactive toggle
4. Badge card e edit icon → `PATCH /gamification/badges/:id` (→ 12.2) — only description, threshold, isActive changeable
5. Badge disable korte chaile → isActive toggle off (no delete — pre-defined badges)

> **Note**: Badges are pre-defined (seeded/manually inserted). Admin cannot create or delete badges — only update `description`, `criteria.threshold`, and `isActive`.

### Leaderboard (Admin View)
1. Admin "Gamification → Leaderboard" e navigate kore
2. Page load → `GET /gamification/leaderboard` (→ 12.3)
3. Same data as student leaderboard but admin context e — monitoring purpose

### Edge Cases
- **No badges yet**: Empty state — admin needs to seed badges via DB
- **Disable badge**: isActive false korle students ar earn korte parbe na, but previously earned badges visible thake

---

<!-- ═══════════ Badge Management ═══════════ -->

### 12.1 Get All Badges

```
GET /gamification/badges?page=1&limit=20&searchTerm=quiz
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Badges retrieved successfully",
  "pagination": { "page": 1, "limit": 20, "total": 24, "totalPage": 2 },
  "data": [
    {
      "_id": "664i1b2c3d4e5f6a7b8c9d0e",
      "name": "Quiz Master",
      "icon": "https://cdn.example.com/badges/quiz-master.png",
      "criteria": { "type": "QUIZZES_PASSED", "threshold": 10 },
      "isActive": true
    },
    {
      "_id": "664i2c3d4e5f6a7b8c9d0f1",
      "name": "Point Collector",
      "icon": "https://cdn.example.com/badges/point-collector.png",
      "criteria": { "type": "POINTS_THRESHOLD", "threshold": 500 },
      "isActive": true
    },
    {
      "_id": "664i3d4e5f6a7b8c9d0f1a2",
      "name": "Streak Champion",
      "icon": "https://cdn.example.com/badges/streak-champion.png",
      "criteria": { "type": "STREAK_DAYS", "threshold": 30 },
      "isActive": false
    }
  ]
}
```

> List e `description`, `createdAt`, `updatedAt`, `__v` exclude kora hoy `.select()` diye — response lean thake.

---

### 12.2 Update Badge

```
PATCH /gamification/badges/:id
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body** _(all optional):_
```json
{
  "description": "Pass 15 quizzes to earn this badge",
  "criteria": { "threshold": 15 },
  "isActive": false
}
```

> **Restricted fields**: Only `description`, `criteria.threshold`, and `isActive` can be updated. `name`, `criteria.type`, and `icon` are fixed (pre-defined badges).

**Response (200):**
```json
{
  "success": true,
  "message": "Badge updated successfully",
  "data": {
    "_id": "664i1b2c3d4e5f6a7b8c9d0e",
    "name": "Quiz Master",
    "icon": "https://cdn.example.com/badges/quiz-master.png",
    "description": "Pass 15 quizzes to earn this badge",
    "criteria": { "type": "QUIZZES_PASSED", "threshold": 15 },
    "isActive": false
  }
}
```

**Error — Not Found (404):**
```json
{
  "success": false,
  "message": "Badge not found"
}
```

---

### 12.3 Get Leaderboard (Admin View)

```
GET /gamification/leaderboard?page=1&limit=20
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "pagination": { "page": 1, "limit": 20, "total": 156, "totalPage": 8 },
  "data": [
    {
      "studentId": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Sarah Ahmed",
      "profilePicture": "https://cdn.example.com/avatars/sarah.jpg",
      "totalPoints": 2450,
      "badgeCount": 5
    },
    {
      "studentId": "664a2c3d4e5f6a7b8c9d0f1",
      "name": "Rahim Khan",
      "profilePicture": "https://cdn.example.com/avatars/rahim.jpg",
      "totalPoints": 1890,
      "badgeCount": 3
    }
  ]
}
```

> Admin view e `myRank` nai — admin nijer ranking dekhbe na. Monitoring/oversight purpose e use hoy.

---

## Criteria System Reference

### How `criteria.type` Works

Badge seed/update korar shomoy criteria define kora hoy. Each type defines **which student metric** the system checks:

| Criteria Type | What It Measures | Data Source |
|---------------|-----------------|-------------|
| `POINTS_THRESHOLD` | Total points earned | `User.totalPoints` |
| `COURSES_COMPLETED` | Courses with status COMPLETED | `Enrollment.countDocuments({ status: 'COMPLETED' })` |
| `QUIZZES_PASSED` | Quizzes with passing score | `QuizAttempt.countDocuments({ passed: true })` |
| `PERFECT_QUIZ` | Quizzes with 100% score | `QuizAttempt.countDocuments({ scorePercentage: 100 })` |
| `STREAK_DAYS` | Current or longest streak | `User.streak.longest` |
| `CUSTOM` | Manual-only, no auto-evaluation | N/A — admin manually awards |

### How `criteria.threshold` Works

Simple `>=` comparison:
```
Student's metric >= badge.criteria.threshold → badge unlock
```

**Examples:**
- `{ type: "QUIZZES_PASSED", threshold: 10 }` → 10 ta quiz pass korle badge unlock
- `{ type: "POINTS_THRESHOLD", threshold: 1000 }` → 1000 points earn korle unlock
- `{ type: "STREAK_DAYS", threshold: 30 }` → 30 din consecutive active thakle unlock

### Evaluation Flow (Auto-Award)

```
Trigger Event (lesson complete, quiz pass, etc.)
    ↓
Award points → PointsLedger.create() + User.$inc
    ↓
checkAndAwardBadges(studentId)
    ↓
For each active Badge:
    ├── Get student's current metric for badge.criteria.type
    ├── Compare metric >= badge.criteria.threshold
    ├── If met AND not already earned → create StudentBadge → notify
    └── If already earned → skip (unique index prevents duplicates)
```

### Scalability

- **Adding new criteria type**: Enum e add koro + evaluation function e new case add koro → existing badges untouched
- **Limitation**: Single-metric badges only. Compound criteria (e.g., "5 courses AND 1000 points") dorkar hole `criteria` ke array banate hobe — ekhon dorkar nai (YAGNI)

---

## API Response Design — Field Exposure (Admin)

| Field | Badge List | Badge Update | Reason |
|-------|:-:|:-:|--------|
| `_id` | Yes | Yes | Admin er badge manage korte (edit) lagbe |
| `name` | Yes | Yes | Primary identifier (read-only) |
| `description` | No | Yes | List e space waste, detail e dikhao |
| `icon` | Yes | Yes | Visual representation (read-only) |
| `criteria` | Yes | Yes | Admin ke threshold update korte lagbe (type read-only) |
| `isActive` | Yes | Yes | Admin toggle kore active/inactive |
| `createdAt` | No | No | Internal |
| `updatedAt` | No | No | Internal tracking only |
| `__v` | No | No | Mongoose version key — internal |

---

## Current System Gaps

### What EXISTS (Fully Implemented)
- Data models (PointsLedger, Badge, StudentBadge) with proper schemas + indexes
- Leaderboard aggregation (sorted by points, with `badgeCount` per student via `$facet`)
- Points ledger/history tracking
- Badge management (read, update — pre-defined badges, no create/delete)
- Admin stats endpoint (`GET /admin/stats` — backend-only, UI te nai)
- Badge criteria types defined
- Response field filtering (`.select()` diye `__v`, timestamps exclude)
- **Auto-seed 17 default badges** on server startup (`src/DB/seedBadges.ts`) — missing badges auto-create hoy, admin er changes preserve thake, deleted badges recreate hoy

### What's MISSING (Remaining)

| Gap | Impact | Priority |
|-----|--------|----------|
| ~~**No automatic point awarding**~~ | ~~Gamification non-functional~~ | ~~P0~~ | **FIXED** |
| ~~**No badge evaluation logic**~~ | ~~Badges never auto-awarded~~ | ~~P0~~ | **FIXED** |
| ~~**No points idempotency**~~ | ~~Double-awarding possible~~ | ~~P2~~ | **FIXED** — duplicate check in awardPoints() |
| **No badge notification** (Socket.IO + push) | Silent achievements = no engagement | P2 |
| **Streak bonus points** not wired | Streak tracking works, but milestone points (7/14/30 days) not triggered | P1 |

---

## System Design Improvements

### Security
1. **Never trust client-sent points** — server config theke amount ashbe
2. **StudentBadge creation shudhu `checkAndAwardBadges()` diye** — no direct "grant badge" API

### Backend
- **Event-Driven**: EventEmitter pattern — enrollment/quiz fires event, gamification listens. Decoupled, easy to extend
- **Idempotency**: `{ student, reason, referenceId }` compound unique index — prevents double-awarding
- **Points Config**: Centralized `POINTS_CONFIG` constant — all point values in one place

### Database
- Idempotency index: `{ student: 1, reason: 1, referenceId: 1 }` unique + sparse
- Consider `slug` field on Badge for URL-friendly identifiers
- Periodic `totalPoints` reconciliation job — catches drift between User.totalPoints and PointsLedger sum

---

## Priority Roadmap

| Priority | What | Status |
|----------|------|:------:|
| ~~**P0**~~ | ~~`awardPoints()` + hooks in enrollment/quiz/community~~ | **Done** |
| ~~**P0**~~ | ~~`checkAndAwardBadges()` evaluation~~ | **Done** |
| ~~**P2**~~ | ~~Points idempotency (duplicate prevention)~~ | **Done** |
| **P1** | Streak bonus points at milestones (7/14/30/60/90 days) | Pending |
| **P2** | Badge notifications (Socket.IO + push) | Pending |
| **P3** | `totalPoints` reconciliation job | Pending |
| **P3** | Badge slug, rarity, order fields | Pending |

---

### Default Badge Seed (2026-03-28)

Server startup e `seedBadges()` automatically 17 default badges create kore (if missing). Badge delete korle next server start e recreate hoy. Admin er changes (description, threshold, isActive) preserve thake.

| Criteria Type | Badges | Thresholds |
|---|---|---|
| `POINTS_THRESHOLD` | Rising Star, Point Collector, Point Master, Point Legend | 100, 500, 1000, 5000 |
| `COURSES_COMPLETED` | First Steps, Course Explorer, Course Master, Course Legend | 1, 3, 5, 10 |
| `QUIZZES_PASSED` | Quiz Starter, Quiz Master, Quiz Champion | 1, 10, 25 |
| `PERFECT_QUIZ` | Perfect Score, Perfectionist | 1, 5 |
| `STREAK_DAYS` | Consistent Learner, Streak Champion, Streak Legend | 7, 30, 100 |
| `CUSTOM` | Early Adopter | 0 (manually awarded) |

**Files**: `src/DB/seedBadges.ts` (seed data + logic), `src/server.ts` (calls `seedBadges()` after DB connect)

---

## Audit & Review Log

### Initial Creation (2026-03-27)

- Admin dashboard focused gamification documentation
- Covers: Badge management flows, Admin stats, Criteria system, Security gaps, Roadmap

### Badge System Simplification (2026-03-27)

- Removed `POST /gamification/badges` (create) — badges are pre-defined
- Removed `DELETE /gamification/badges/:id` (delete) — use isActive toggle instead
- Restricted `PATCH /gamification/badges/:id` — only `description`, `criteria.threshold`, `isActive`
- Removed `fileHandler` from badge update route (no icon upload)

### Code Quality Audit & Fixes (2026-03-27)

Full audit korা হয়েছে — doc vs code mismatch, response shape, RESTful design, validation, scalability shob check kora hoyeche.

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | `GET /badges` — `description`, `createdAt`, `updatedAt`, `__v` leak হচ্ছিল | `.select('-description -createdAt -updatedAt -__v')` add |
| 2 | `PATCH /badges/:id` — `createdAt`, `updatedAt`, `__v` leak হচ্ছিল | `.select('-createdAt -updatedAt -__v')` add |
| 3 | `GET /leaderboard` — doc e `badgeCount` ছিল কিন্তু code e ছিল না | `$lookup` to `studentbadges` + `$size` add করা হয়েছে |
| 4 | Validation — `z.coerce.boolean()` JSON e `"false"` → `true` বানাতো (bug) | `z.boolean()` + `z.number()` তে change (fileHandler remove হওয়ায় coerce অপ্রয়োজনীয়) |
| 5 | Leaderboard — `distinct()` সব student IDs memory তে load করতো | `$facet` + `$count` দিয়ে single DB round trip — scalable |
| 6 | Unused `User` import in `gamification.service.ts` | Removed |
| 7 | Admin Stats — UX flow থেকে remove (UI তে নেই), backend endpoint retained | Doc updated, code untouched |

### Edge Case & Response Audit (2026-03-27)

Full API design, response design, edge case audit — RESTful standards, field exposure, input validation shob check.

| # | Issue | Fix Applied |
|---|-------|-------------|
| 8 | `GET /my-points` — history items `student`, `updatedAt`, `__v` leak হচ্ছিল | `.select('points reason description referenceId referenceType createdAt')` add |
| 9 | Leaderboard — negative `page`/`limit` (`-5`) → MongoDB `$skip` error → 500 | `Math.max(1, ...)` + `Math.min(100, ...)` guard add — page min 1, limit 1-100 |
| 10 | `PATCH /badges/:id` — empty body `{}` তে useless DB query হতো | Early return with 400: `"No valid fields to update"` |

**Passed (no fix needed):**
- Route design: RESTful, proper HTTP methods, auth roles separated correctly
- Validation: Zod strips unknown fields + service manually picks — defense in depth
- Security: All routes auth-protected, no field injection, no sensitive data exposure
- Empty states: Leaderboard, badges, my-points, my-badges — all return clean empty responses
- Deleted user in leaderboard: `$unwind` silently excludes — correct behavior
- Badge deleted after earning: `validBadges.filter()` removes orphaned entries — correct
- `params.id` invalid ObjectId: Mongoose CastError → globalErrorHandler catches — acceptable

### Points System Wire-up (2026-03-28)

- Points system fully wired — enrollment, quiz, community services e awardPoints() + checkAndAwardBadges() calls added
- Duplicate prevention added to awardPoints() — PointsLedger.findOne check
- DailyActivity.pointsEarned update added to awardPoints()
- All calls try-catch wrapped — failure doesn't block main actions
- Flow doc: `docs/decisions/gamification-points-flow.md`
- Rule file: `.claude/rules/gamification.md` — auto-enforces doc update

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/gamification/gamification.service.ts` | Business logic, aggregations, gaps |
| `src/app/modules/gamification/gamification.controller.ts` | Response shaping |
| `src/app/modules/gamification/gamification.route.ts` | Auth, middleware chain |
| `src/app/modules/gamification/gamification.validation.ts` | Zod schemas |
| `src/app/modules/gamification/gamification.model.ts` | Schemas, indexes |
| `src/app/modules/gamification/gamification.interface.ts` | Types, enums |
