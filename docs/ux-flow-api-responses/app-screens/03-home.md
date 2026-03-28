# Screen 3: Home

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [Course Content](./05-course-content.md), [Progress](./06-progress.md)

## UX Flow

### Home Load
1. Student Home tab e tap kore (or onboarding/login er por auto-navigate hoy)
2. Page load e single call → `GET /student/home` (→ 3.1)
3. Screen render hoy: greeting card (name + points + streak) → progress ring (courseProgress + quizProgress) → enrolled courses carousel → recent badges

### Enrolled Course Tap
1. Student enrolled course card e tap kore
2. Navigate to Course Content screen → `GET /courses/:slug/student-detail` (→ [5.2](./05-course-content.md))

### Browse Courses Button
1. Student "Browse Courses" button e tap kore
2. Navigate to Browse Courses screen (→ [Screen 4](./04-course.md))

### View Progress Button
1. Student "View Progress" button e tap kore
2. Navigate to Progress screen (→ [Screen 6](./06-progress.md))

---

### 3.1 Get Home Data

```
GET /student/home
Auth: Bearer {{accessToken}} (STUDENT)
```

> Aggregated home data — 4 parallel queries internally (user, enrollments, badges, quiz stats).

**Response:**
```json
{
  "success": true,
  "message": "Home data retrieved successfully",
  "data": {
    "name": "John Doe",
    "points": 450,
    "streak": {
      "current": 7,
      "longest": 14
    },
    "yourProgress": {
      "courseProgress": 65,
      "quizProgress": 80
    },
    "enrolledCourses": [
      {
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "thumbnail": "https://cdn.example.com/thumb1.jpg",
        "completionPercentage": 45
      },
      {
        "title": "Advanced JavaScript Patterns",
        "slug": "advanced-javascript-patterns",
        "thumbnail": "https://cdn.example.com/thumb2.jpg",
        "completionPercentage": 78
      }
    ],
    "recentBadges": [
      {
        "name": "Quiz Master",
        "icon": "https://cdn.example.com/badge-quiz.png",
        "earnedAt": "2026-03-10T12:00:00Z"
      },
      {
        "name": "7-Day Streak",
        "icon": "https://cdn.example.com/badge-streak.png",
        "earnedAt": "2026-03-08T09:00:00Z"
      },
      {
        "name": "First Steps",
        "icon": "https://cdn.example.com/badge-first.png",
        "earnedAt": "2026-03-05T08:30:00Z"
      }
    ]
  }
}
```

> `enrolledCourses`: max 10, sorted by `lastAccessedAt` (most recent first). Only ACTIVE + COMPLETED. Deleted courses filtered out.
> `recentBadges`: max 5, sorted by `earnedAt` (newest first). Deleted badges filtered out.
> `courseProgress`: average completion % across all enrolled courses.
> `quizProgress`: (passed quizzes / total completed quizzes) * 100.

---

## Audit & Review Log

### Changes (2026-03-16)

| # | What | Before | After |
|---|------|--------|-------|
| 1 | UX Flow section | Missing | Added Home Load, Enrolled Course Tap, Browse Courses Button, View Progress Button |
| 2 | Leaderboard | Was in Home screen (3.2) | Removed — View Progress button e Progress screen e redirect hoy ([Screen 6](./06-progress.md)) |
| 3 | Courses | Was in Home screen (3.3) | Removed — Browse Courses button e Screen 4 e redirect hoy ([Screen 4](./04-course.md)) |
| 4 | Home response notes | None | Added notes on limits, sorting, filtering, progress calculation |
| 5 | `enrolledCourses` fields | Had `enrollmentId`, `courseId`, `totalLessons`, `status` | Removed — home card e dorkar nai. Navigation slug diye hoy, detail Course Content screen e |
| 6 | `enrolledCourses` populate | `.populate('course', 'title slug thumbnail totalLessons')` | Changed to `'title slug thumbnail'` — `totalLessons` removed |

### Code Audit (2026-03-16) — All Passed

| Check | Doc | Code | Status |
|-------|-----|------|--------|
| Route | `GET /student/home` | `student-home.route.ts:8` | Match |
| Auth | STUDENT | `auth(USER_ROLES.STUDENT)` | Match |
| Message | `"Home data retrieved successfully"` | `controller.ts:14` | Match |
| `name` | string | `service.ts:55` — `user?.name` | Match |
| `points` | number | `service.ts:56` — `user?.totalPoints` | Match |
| `streak` | `{ current, longest }` | `service.ts:57-60` | Match |
| `yourProgress` | `{ courseProgress, quizProgress }` | `service.ts:61-64` | Match |
| `enrolledCourses` fields | `title, slug, thumbnail, completionPercentage` | `service.ts:66-69` | Match |
| `enrolledCourses` limit | max 10 | `service.ts:65` — `.slice(0, 10)` | Match |
| `enrolledCourses` sort | lastAccessedAt desc | `service.ts:15` | Match |
| `enrolledCourses` filter | ACTIVE + COMPLETED | `service.ts:12` | Match |
| `enrolledCourses` null guard | deleted courses filtered | `service.ts:33` | Match |
| `recentBadges` fields | `name, icon, earnedAt` | `service.ts:72-74` | Match |
| `recentBadges` limit | max 5 | `service.ts:19` — `.limit(5)` | Match |
| `recentBadges` sort | earnedAt desc | `service.ts:18` | Match |
| `recentBadges` null guard | deleted badges filtered | `service.ts:34` | Match |

### Bug Fix (2026-03-29)

| Bug | Before | After |
|-----|--------|-------|
| `courseProgress` inflated for 10+ courses | `.limit(10)` on enrollment query — `courseProgress` calculated from top 10 only, not all courses. Home vs Progress screen inconsistent. | `.limit(10)` removed, all enrollments fetched. `courseProgress` uses ALL courses. `.slice(0, 10)` applied at response mapping for display. |

### Files Checked

| File | What Checked |
|------|-------------|
| `src/app/modules/student-home/student-home.service.ts:7-77` | `getHome` — populate fields, response mapping, limits, sorts, filters, null guards, courseProgress calculation |
| `src/app/modules/student-home/student-home.controller.ts:14` | Message: "Home data retrieved successfully" |
| `src/app/modules/student-home/student-home.route.ts:8` | Route: `GET /home`, auth STUDENT only |
