# Screen 12: Gamification Management

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Analytics](./10-analytics.md), [User Management](./03-user-management.md)

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

### Badge Evaluation Logic (`checkAndAwardBadges`)

| Criteria Type | How Checked |
|---------------|-------------|
| `POINTS_THRESHOLD` | `PointsLedger.aggregate` — SUM all points for student |
| `COURSES_COMPLETED` | `Enrollment.countDocuments` — status = COMPLETED |
| `QUIZZES_PASSED` | `QuizAttempt.countDocuments` — passed = true, status = COMPLETED |
| `PERFECT_QUIZ` | `QuizAttempt.countDocuments` — percentage = 100, status = COMPLETED |
| `STREAK_DAYS` | `User.streak.longest` field read |
| `CUSTOM` | Skipped — manually awarded by admin |

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

### Gamification Dashboard Load
1. Admin "Gamification" e navigate kore (sidebar)
2. Page load e parallel API calls:
   - Leaderboard → `GET /gamification/leaderboard?page=1&limit=20` (→ 12.2) — student ranking table
   - Badges → `GET /gamification/badges?page=1&limit=20` (→ 12.1) — badge management list
3. Screen render hoy: leaderboard table → badge management table

### Leaderboard Section
1. Paginated table — students ranked by total points
2. Table columns: Rank, Name, Profile Picture, Total Points, Badge Count
3. Default sort: totalPoints descending
4. Pagination: 20 per page (max 100)

### Badge Management Section
1. Paginated table — all 17 seeded badges
2. Table columns: Name, Icon, Criteria Type, Threshold, Active Status
3. Admin badge e click korle → `GET /gamification/badges/:id` (→ 12.1a) call hoy → edit form e current values load hoy (description, threshold, isActive)
4. Admin can edit:
   - Description edit
   - Criteria threshold change (e.g., change "Rising Star" from 100 to 150 points)
   - Active/Inactive toggle (inactive badges won't be evaluated)
5. No create or delete — badges are seeded, admin edits only

### Edge Cases
- **No points awarded yet**: All stats 0, leaderboard empty, badges all unearneable
- **Badge threshold changed**: Existing earned badges unaffected — only future evaluations use new threshold
- **Badge deactivated**: Won't be checked in `checkAndAwardBadges()` — but already-earned badges stay
- **Tie in leaderboard**: Students with same points — order determined by aggregation (effectively random for ties)

---

<!-- ═══════════ Gamification Endpoints ═══════════ -->

### 12.1 Get All Badges

```
GET /gamification/badges?page=1&limit=20
Auth: Bearer {{accessToken}} (STUDENT, SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `searchTerm` | string | — | Search by badge name |
| `sort` | string | — | Sort field (e.g. `-criteria.threshold`) |

**Response (200):**
```json
{
  "success": true,
  "message": "Badges retrieved successfully",
  "pagination": { "page": 1, "limit": 20, "total": 17, "totalPage": 1 },
  "data": [
    {
      "_id": "664e1b2c3d4e5f6a7b8c9d01",
      "name": "Rising Star",
      "description": "Earn 100 points to prove you are on the rise",
      "icon": "https://cdn.example.com/badges/rising-star.png",
      "criteria": {
        "type": "POINTS_THRESHOLD",
        "threshold": 100
      },
      "isActive": true
    },
    {
      "_id": "664e1b2c3d4e5f6a7b8c9d02",
      "name": "First Steps",
      "description": "Complete your first course",
      "icon": "https://cdn.example.com/badges/first-steps.png",
      "criteria": {
        "type": "COURSES_COMPLETED",
        "threshold": 1
      },
      "isActive": true
    }
  ]
}
```

> List view e `createdAt`, `updatedAt`, `__v` excluded. `description` included. Searchable by `name`.

---

### 12.1a Get Badge By ID

```
GET /gamification/badges/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Badge MongoDB ObjectId |

**Response (200):**
```json
{
  "success": true,
  "message": "Badge retrieved successfully",
  "data": {
    "_id": "664e1b2c3d4e5f6a7b8c9d01",
    "name": "Rising Star",
    "description": "Earn 100 points to prove you are on the rise",
    "icon": "https://cdn.example.com/badges/rising-star.png",
    "criteria": {
      "type": "POINTS_THRESHOLD",
      "threshold": 100
    },
    "isActive": true
  }
}
```

> Admin badge e click korle ei endpoint call hoy — edit form e current `description`, `criteria.threshold`, `isActive` values load kore dekhay. List endpoint e description excluded thake (lean list view), but edit er age full details dorkar.

**Error (404):**
```json
{
  "success": false,
  "message": "Badge not found"
}
```

---

### 12.1b Update Badge

```
PATCH /gamification/badges/:id
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Badge MongoDB ObjectId |

**Form Data** (all optional):
- `description`: "Awarded when you earn 150 total points"
- `icon`: (file — badge image upload)
- `criteria[threshold]`: 150
- `isActive`: false

> Form-data tai `criteria.threshold` bracket notation e pathate hobe: `criteria[threshold]`. Number/boolean fields e `z.coerce` use hoy.

**Validation:**
| Field | Type | Constraint |
|-------|------|------------|
| `description` | string | min 1, max 500 |
| `icon` | file | Image upload (jpg, png, webp) |
| `criteria[threshold]` | number | min 1 |
| `isActive` | boolean | — |

**Response (200):**
```json
{
  "success": true,
  "message": "Badge updated successfully",
  "data": {
    "_id": "664e1b2c3d4e5f6a7b8c9d01",
    "name": "Rising Star",
    "description": "Awarded when you earn 150 total points",
    "icon": "https://cdn.example.com/badges/rising-star.png",
    "criteria": {
      "type": "POINTS_THRESHOLD",
      "threshold": 150
    },
    "isActive": false
  }
}
```

> `description`, `icon`, `criteria.threshold`, `isActive` changeable. `name`, `criteria.type` immutable (seeded values). Icon upload korle old file auto-delete hoy.

---

### 12.2 Get Leaderboard

```
GET /gamification/leaderboard?page=1&limit=20
Auth: Bearer {{accessToken}} (STUDENT, SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

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
      "profilePicture": null,
      "totalPoints": 1820,
      "badgeCount": 3
    }
  ]
}
```

> Single aggregation pipeline: `PointsLedger` → `$group` (sum points per student) → `$lookup` users (name, profilePicture) → `$lookup` studentbadges (count) → `$sort` totalPoints DESC → `$facet` (data + total). `badgeCount` = number of earned badges.

---

## API Dependency Map

| UI Section | Endpoint | Who |
|-----------|----------|-----|
| Leaderboard table | `GET /gamification/leaderboard` | SUPER_ADMIN |
| Badge management table | `GET /gamification/badges` | SUPER_ADMIN |
| Badge detail (edit form load) | `GET /gamification/badges/:id` | SUPER_ADMIN |
| Badge edit | `PATCH /gamification/badges/:id` | SUPER_ADMIN |

---

## Current Gaps

| # | Gap | Impact | Priority | Note |
|---|-----|--------|:--------:|------|
| ~~1~~ | ~~**`awardPoints()` nowhere called**~~ | ~~Points system inactive~~ | ~~P0~~ | **FIXED** — wired in enrollment, quiz, community services |
| 2 | **Streak bonus points not implemented** | `STREAK_BONUS` reason exists but no milestone trigger | P1 | Streak tracking (current/longest) works via `activityHelper`. Bonus points at milestones (7/14/30/60/90 days) lagbe |
| 3 | **`checkAndAwardBadges()` N+1 queries** | Each badge check = 1 `findOne` + 1 criteria query. 17 badges = ~34 queries per call | P2 | Batch lookup diye optimize kora jay — but low priority karon per-student call, not bulk |
| 4 | **No admin badge award endpoint** | CUSTOM badges (Early Adopter) manually award korar kono API nai | P2 | `POST /gamification/badges/:id/award` lagbe with studentId |

---

## Audit & Review Log

### Initial Creation (2026-03-28)

- Comprehensive system architecture documented — points flow, badge evaluation, leaderboard calculation
- All 7 API endpoints documented with request/response examples
- Point values, badge categories, unlock criteria tables
- Integration status — which services should call gamification helper
- 4 gaps documented (P0: integration missing, P1: streak, P2: N+1 + admin award)
- Edge cases documented

### Points System Wire-up (2026-03-28)

**Fixed:**
- ~~**`awardPoints()` nowhere called**~~ → Wired in 3 services: enrollment (first enroll + lesson + course complete), quiz (pass + perfect), community (post)
- ~~**No duplicate prevention**~~ → `PointsLedger.findOne({ student, reason, referenceId })` check added to `awardPoints()`
- ~~**DailyActivity.pointsEarned never updated**~~ → `awardPoints()` now updates `DailyActivity` via `$inc`
- All gamification calls wrapped in try-catch — failure doesn't block main actions
- Quiz scoring: perfect (100%) = 50 pts, pass (not perfect) = 25 pts — mutually exclusive
- Flow doc created: `docs/decisions/gamification-points-flow.md`
- Rule file created: `.claude/rules/gamification.md` — auto-enforces doc update when code changes

**Files Modified:**
| File | Change |
|------|--------|
| `src/app/helpers/gamificationHelper.ts` | Duplicate prevention + DailyActivity update in awardPoints() |
| `src/app/modules/enrollment/enrollment.service.ts` | 3 integration points (first enroll, lesson complete, course complete) |
| `src/app/modules/quiz/quiz.service.ts` | Quiz pass/perfect points |
| `src/app/modules/community/community.service.ts` | Post creation points |

### Get Badge By ID Endpoint (2026-03-29)

**Added:** `GET /gamification/badges/:id` — admin badge edit form e current values load korar jonno.

**Problem:** List endpoint (`GET /badges`) e `description` excluded chilo (lean list view). But edit korte gele admin current description dekhte parto na — kono single badge fetch endpoint chilo na.

**Fix:**
- `getBadgeById` service method added — returns full badge (minus `createdAt`, `updatedAt`, `__v`)
- Controller + route added (`GET /badges/:id`, SUPER_ADMIN only)
- Doc updated — 12.1a section, UX flow, API dependency map

**Files Modified:**
| File | Change |
|------|--------|
| `gamification.service.ts` | `getBadgeById()` method added |
| `gamification.controller.ts` | `getBadgeById` handler added |
| `gamification.route.ts` | `GET /badges/:id` route added (before PATCH) |

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/gamification/gamification.service.ts` | All 7 service methods, aggregation pipelines |
| `src/app/modules/gamification/gamification.controller.ts` | All handlers, response format |
| `src/app/modules/gamification/gamification.route.ts` | Routes, auth, validation |
| `src/app/modules/gamification/gamification.model.ts` | Badge, StudentBadge, PointsLedger schemas |
| `src/app/modules/gamification/gamification.interface.ts` | Types, enums |
| `src/app/modules/gamification/gamification.validation.ts` | updateBadge Zod schema |
| `src/helpers/gamificationHelper.ts` | awardPoints, checkAndAwardBadges logic |
| `src/enums/gamification.ts` | POINTS_REASON, BADGE_CRITERIA enums |
| `src/DB/seedBadges.ts` | 17 default badge definitions |
