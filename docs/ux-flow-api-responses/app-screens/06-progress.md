# Screen 6: Progress

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course Content](./05-course-content.md)

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
GET /activity/calendar?month=3&year=2026
Auth: Bearer {{accessToken}}
```

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `month` | number | No | Current month | 1–12 |
| `year` | number | No | Current year | 2020–2100 |

> Only active days returned — empty days frontend fill korbe (GitHub/Duolingo pattern).

**Response:**
```json
{
  "success": true,
  "message": "Activity calendar retrieved successfully",
  "data": {
    "month": 3,
    "year": 2026,
    "summary": {
      "totalActiveDays": 18,
      "totalLessons": 45,
      "totalQuizzes": 8,
      "totalPoints": 320
    },
    "days": [
      {
        "date": "2026-03-01T00:00:00.000Z",
        "lessonsCompleted": 3,
        "quizzesTaken": 1,
        "pointsEarned": 25
      },
      {
        "date": "2026-03-03T00:00:00.000Z",
        "lessonsCompleted": 2,
        "quizzesTaken": 0,
        "pointsEarned": 15
      }
    ]
  }
}
```

---

### 6.3 Get My Achievements

```
GET /gamification/my-badges
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Achievements retrieved successfully",
  "data": {
    "totalBadges": 8,
    "earnedBadges": 3,
    "badges": [
      {
        "name": "Quiz Master",
        "icon": "https://cdn.example.com/badge.png",
        "earnedAt": "2026-03-10T12:00:00Z"
      },
      {
        "name": "First Steps",
        "icon": "https://cdn.example.com/first-steps.png",
        "earnedAt": "2026-02-20T08:30:00Z"
      },
      {
        "name": "7-Day Streak",
        "icon": "https://cdn.example.com/streak-7.png",
        "earnedAt": "2026-03-05T14:00:00Z"
      }
    ]
  }
}
```

---

### 6.4 Get My Quiz Attempts

```
GET /quizzes/my-attempts?page=1&limit=10
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz attempts retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
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
