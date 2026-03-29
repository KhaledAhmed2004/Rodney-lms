# Screen 6: Progress

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course Content](./05-course-content.md), [Home](./03-home.md), [Profile](./10-profile.md) (badges in 10.5)

## UX Flow

### Progress Page Load
1. Student bottom nav e "Progress" tab e tap kore
2. Page load e parallel calls:
   - Progress overview → `GET /student/progress` (→ 6.1) — overall %, points, streak, course list
   - Activity calendar → `GET /activity/calendar?month=3&year=2026` (→ 6.2) — current month
   - Achievements → `GET /gamification/my-badges` (→ 6.3) — all badges with counts
3. Screen sections render hoy: progress ring (overall %) → streak card → course progress list → activity calendar → achievements → quiz history

### Activity Calendar
1. Current month er calendar dekhay → `GET /activity/calendar` (→ 6.2) — default current month/year
2. Active days highlighted hoy (je din streak chilo / activity chilo)

### Course Progress Tap
1. Student kono course card e tap kore (progress list theke)
2. Navigate to Course Content screen → `GET /courses/:slug/student-detail` (→ [5.2](./05-course-content.md))

### View Quiz History
1. Student "Quiz History" section e scroll kore
2. Recent 5 ta quiz attempt dekhay → `GET /quizzes/my-attempts?page=1&limit=5` (→ 6.4)
3. Each card dekhay: quiz title, course name, score %, pass/fail, date

---

### 6.1 Get Progress Overview

```
GET /student/progress
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress data retrieved successfully",
  "data": {
    "overallPercentage": 65,
    "points": 450,
    "streak": {
      "current": 7,
      "longest": 14
    },
    "courses": [
      {
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "completionPercentage": 45
      },
      {
        "title": "Advanced JavaScript Patterns",
        "slug": "advanced-javascript-patterns",
        "completionPercentage": 78
      },
      {
        "title": "React & Next.js Masterclass",
        "slug": "react-nextjs-masterclass",
        "completionPercentage": 12
      }
    ]
  }
}
```

---

### 6.2 Get Activity Calendar

```
GET /activity/calendar
Auth: Bearer {{accessToken}}
```

> Default current month/year. UI e current month er calendar dekhay, active/streak days highlighted hoy.

**Response:**
```json
{
  "success": true,
  "message": "Activity calendar retrieved successfully",
  "data": {
    "month": 3,
    "year": 2026,
    "days": [
      "2026-03-01T00:00:00.000Z",
      "2026-03-03T00:00:00.000Z",
      "2026-03-05T00:00:00.000Z",
      "2026-03-07T00:00:00.000Z",
      "2026-03-08T00:00:00.000Z"
    ]
  }
}
```

> `days`: shudhu active dates er array. Client calendar render kore, matching dates highlight kore.

---

### 6.3 Get My Achievements

```
GET /gamification/my-badges
Auth: Bearer {{accessToken}}
```

> ALL active badges return hoy — earned + locked. Client `earned` flag diye style decide kore: `true` = normal, `false` = gray/locked.
> Profile screen (10.5) eO same API — client oikhane `badges.filter(b => b.earned)` diye shudhu earned ones dekhay.

**Response:**
```json
{
  "success": true,
  "message": "Achievements retrieved successfully",
  "data": {
    "totalBadges": 17,
    "earnedBadges": 3,
    "badges": [
      {
        "name": "First Steps",
        "icon": "https://cdn.example.com/first-steps.png",
        "description": "Complete your first lesson",
        "earned": true,
        "earnedAt": "2026-03-05T08:30:00Z"
      },
      {
        "name": "Quiz Master",
        "icon": "https://cdn.example.com/quiz-master.png",
        "description": "Pass 10 quizzes",
        "earned": true,
        "earnedAt": "2026-03-10T12:00:00Z"
      },
      {
        "name": "Rising Star",
        "icon": "https://cdn.example.com/rising-star.png",
        "description": "Earn 100 total points",
        "earned": false,
        "earnedAt": null
      },
      {
        "name": "Streak Champion",
        "icon": "https://cdn.example.com/streak-champion.png",
        "description": "Maintain a 30-day streak",
        "earned": false,
        "earnedAt": null
      }
    ]
  }
}
```

---

### 6.4 Get My Quiz Attempts

```
GET /quizzes/my-attempts?page=1&limit=5
Auth: Bearer {{accessToken}}
```

> Progress screen e recent 5 ta attempt dekhay — full history na.

**Response:**
```json
{
  "success": true,
  "message": "Quiz attempts retrieved successfully",
  "pagination": { "page": 1, "limit": 5, "total": 5, "totalPage": 1 },
  "data": [
    {
      "quizTitle": "Module 1 Quiz",
      "courseName": "Introduction to Web Development",
      "percentage": 41,
      "passed": false,
      "completedAt": "2026-03-14T11:20:00Z"
    },
    {
      "quizTitle": "Module 3 Quiz",
      "courseName": "Introduction to Web Development",
      "percentage": 85,
      "passed": true,
      "completedAt": "2026-03-12T09:15:00Z"
    }
  ]
}
```

---

## Audit & Review Log

### Changes from Original (2026-03-15)

| What | Before | After |
|------|--------|-------|
| Points source (6.1) | `PointsLedger.aggregate()` — string/ObjectId bug, always 0 | `user.totalPoints` directly |
| `quizResults` (6.1) | 20 items in progress response — duplicate data | Removed (use 6.4 `/quizzes/my-attempts`) |
| `progressByTopics` (6.1) | Misleading name | Renamed to `courses` |
| `GET /activity/streak` (old 6.3) | Separate endpoint | Removed from this page — streak data is in 6.1 progress response |
| `GET /gradebook/my-grades` (old 6.5) | Separate endpoint — duplicate of quiz attempts | Removed from this page |
| My Badges (6.3) | Only returned badge array | Now returns `totalBadges` + `earnedBadges` count + badges array |
| Quiz Attempts (6.4) | Raw document with `_id`, `student`, `score`, `maxScore`, `status`, `attemptNumber` | Cleaned: only `quizTitle`, `courseName`, `percentage`, `passed`, `completedAt` |
| Quiz → Course link | Quiz model had no course reference | Added optional `course` field to Quiz model |
| DB queries (6.1) | 4 (User + Enrollment + QuizAttempt + PointsLedger) | 2 (User + Enrollment) |
| Quiz Attempts query (6.4) | QueryBuilder + populate + post-filter (pagination mismatch) | Raw aggregation `$lookup` + `$facet` (accurate pagination) |
| Progress enrollment filter (6.1) | No status filter — DROPPED/SUSPENDED courses included | Matches `getHome`: only `ACTIVE`/`COMPLETED` |

### Bugs Fixed

| Bug | File | Fix |
|-----|------|-----|
| `PointsLedger.aggregate()` string/ObjectId mismatch — points always 0 | `student-home.service.ts` | Use `user.totalPoints` directly |
| `QuizAttempt.aggregate()` string/ObjectId mismatch — quizProgress always 0 | `student-home.service.ts` | `new Types.ObjectId(studentId)` |
| Deleted course crashes progress page (`e.course.title` on null) | `student-home.service.ts` | `.filter(e => e.course)` null guard |
| Deleted badge crashes achievements (`badge.name` on null) | `gamification.service.ts` | `.filter(({ badge }) => badge)` null guard |
| Deleted quiz returns `undefined` fields in attempts | `quiz.service.ts` | `.filter(a => a.quiz)` null guard |
| Controller message mismatch with doc | `gamification.controller.ts`, `quiz.controller.ts` | Messages updated to match doc |
| Unused `PointsLedger` import | `student-home.service.ts` | Removed |
| Deleted course crashes home page (`e.course._id` on null) | `student-home.service.ts` | `.filter(e => e.course)` null guard on `getHome()` |
| Deleted badge crashes home page (`sb.badge.name` on null) | `student-home.service.ts` | `.filter(sb => sb.badge)` null guard on `getHome()` |
| `getMyAttempts` pagination mismatch — total includes deleted-quiz attempts | `quiz.service.ts` | Rewritten with raw aggregation `$lookup` + `$unwind` (auto-filters deleted) + `$facet` pagination |
| `getMyPoints` string/ObjectId mismatch — totalPoints always 0 | `gamification.service.ts` | `new Types.ObjectId(studentId)` in aggregate `$match` |
| `getMySummary` string/ObjectId mismatch — totalPoints always 0 | `gamification.service.ts` | `new Types.ObjectId(studentId)` in aggregate `$match` |
| `getProgress` includes DROPPED/SUSPENDED enrollments | `student-home.service.ts` | Added `status: { $in: ['ACTIVE', 'COMPLETED'] }` filter |

### QA Scenarios Verified

| Scenario | Expected | Status |
|----------|----------|--------|
| New student (0 courses, 0 badges, 0 quizzes) | Empty arrays, all counts 0 | OK |
| Course deleted, enrollment exists | Filtered out, no crash | OK |
| Badge deleted, StudentBadge exists | Filtered out, count accurate | OK |
| Quiz deleted, attempt exists | Filtered out, no crash | OK |
| `completionPercentage` undefined on enrollment | Falls back to 0, no NaN | OK |
| Student with no points | `points: 0` | OK |
| Deleted course in home page | Filtered out from `enrolledCourses` + `courseProgress` calc | OK |
| Deleted badge in home page | Filtered out from `recentBadges` | OK |
| Quiz deleted, attempt pagination | `$unwind` auto-drops, `$facet` count accurate | OK |
| DROPPED enrollment in progress | Excluded — only ACTIVE/COMPLETED shown | OK |
| `/gamification/my-points` aggregate | `Types.ObjectId` cast — correct match | OK |
| `/gamification/my-summary` aggregate | `Types.ObjectId` cast — correct match | OK |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/modules/student-home/student-home.service.ts` | `getProgress()` rewrite + enrollment status filter, `getHome()` aggregate bug fix + null guards for courses & badges, unused import cleanup |
| `src/app/modules/gamification/gamification.service.ts` | `getMyBadges()` — `totalBadges`/`earnedBadges` counts + null guard; `getMyPoints()` + `getMySummary()` — ObjectId cast fix |
| `src/app/modules/gamification/gamification.controller.ts` | Message updated |
| `src/app/modules/quiz/quiz.service.ts` | `getMyAttempts()` — rewritten with raw aggregation (`$lookup` + `$facet`) for accurate pagination + deleted quiz handling |
| `src/app/modules/quiz/quiz.controller.ts` | Message updated |
| `src/app/modules/quiz/quiz.interface.ts` | Added `course?: Types.ObjectId` to `IQuiz` |
| `src/app/modules/quiz/quiz.model.ts` | Added `course` field (ref: Course) |
| `public/postman-collection.json` | Progress endpoint description updated |

---

### Round 2 — Doc-Code Audit (2026-03-29) — All Fixed

**1. [CRITICAL] getMyBadges — shudhu earned badges return korto, unearned badges missing**
- **Problem:** `StudentBadge.find({ student })` shudhu earned badges fetch korto. Doc bole ALL active badges return hobe `earned: true/false` flag shoho. Progress screen e locked/gray badges dekhano impossible chilo. `totalBadges: 17` count thakleo `badges[]` array e shudhu 3 ta earned badge thakto — baki 14 ta missing
- **Fix:** Rewritten — `Badge.find({ isActive: true })` diye ALL active badges fetch kore, `StudentBadge.find()` diye earned map banay, merge kore protita badge e `earned` flag + `earnedAt` add kore. Sorting: earned first (earnedAt desc), then unearned
- **Affected:** 6.3 Get My Achievements, 10.5 Top Badges (same API)

**2. [HIGH] getMyBadges — `description` field populate e missing**
- **Problem:** `populate('badge', 'name icon')` — shudhu `name` + `icon` niye ashto. Badge schema te `description: { type: String, required: true }` ache, but response e ashto na. Doc e protita badge e `description` dekhay
- **Fix:** New implementation e `Badge.find().select('name description icon')` diye direct fetch — populate er bodole. `description` ekhon response e ache
- **Affected:** 6.3 Get My Achievements, 10.5 Top Badges

**3. [MEDIUM] getProgress — soft-deleted user access possible**
- **Problem:** `User.findById(studentId)` e kono `status` check chilo na. Profile screen (10.1) e QA-4 audit e fix kora hoisilo, but progress endpoint e same fix apply hoy nai. Deleted user with unexpired JWT progress data access korte parto
- **Fix:** `User.findOne({ _id: studentId, status: { $ne: 'DELETE' } })` + `if (!user) throw ApiError(404, 'User not found')`
- **Affected:** 6.1 Get Progress Overview

**4. [HIGH] getMyAttempts — negative page/limit causes MongoDB crash**
- **Problem:** `page` ar `limit` query theke raw `Number()` diye parse hoto — negative value (`page=-1`, `limit=-5`) truthy tai default e fallback hoto na. `$skip: -20` ba `$limit: -5` MongoDB aggregation e error throw kore. Route e kono `validateRequest` o chilo na (6.2 calendar e Zod ache but 6.4 e nai)
- **Fix:** `Math.max(1, page)` + `Math.min(Math.max(1, limit), 100)` — negative clamp to 1, upper limit cap 100. Service-level fix — no breaking change
- **Affected:** 6.4 Get My Quiz Attempts

**Edge Case Audit (2026-03-29):**

| Endpoint | Edge Cases Checked | Status |
|----------|--------------------|--------|
| 6.1 GET /student/progress | New student (0 data), deleted course, soft-deleted user, DROPPED enrollment, missing completionPercentage, zero division, undefined streak | ✅ All handled |
| 6.2 GET /activity/calendar | No query params, invalid month/year (Zod), no activity, future dates, non-numeric params | ✅ All handled |
| 6.3 GET /gamification/my-badges | New student (0 earned), no badges in system, all earned, badge deactivated after earning, badge deleted, duplicate prevention (unique index), orphaned StudentBadge | ✅ All handled |
| 6.4 GET /quizzes/my-attempts | New student, deleted quiz, quiz without course, deleted course, page beyond data, limit=0, non-numeric params, negative page/limit (fixed), max limit cap (fixed) | ✅ All handled |

**Files Modified:**
| File | Changes |
|------|---------|
| `src/app/modules/gamification/gamification.service.ts` | `getMyBadges()` — rewritten: ALL active badges + earned map merge + `description` field + `earned` flag + sorting |
| `src/app/modules/student-home/student-home.service.ts` | `getProgress()` — `User.findOne` with status check + ApiError import + null guard |
| `src/app/modules/quiz/quiz.service.ts` | `getMyAttempts()` — page/limit clamping: `Math.max(1, page)`, `Math.min(Math.max(1, limit), 100)` |
