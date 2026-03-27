# Screen 10: Analytics

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Overview](./02-overview.md) (summary stats), [Course](./04-course.md) (course detail)

---

## UX Flow

### Analytics Dashboard Load
1. Admin "Analytics" e navigate kore (sidebar)
2. Page load e parallel API calls:
   - Summary stats → `GET /dashboard/summary` (→ [Overview](./02-overview.md)) — total students, completion rate (reuse)
   - Quiz performance → `GET /analytics/quiz-performance` (→ 10.3) — avg quiz score calculate korbe
   - User engagement → `GET /analytics/user-engagement?period=month` (→ 10.1) — user growth chart + heatmap data
   - Course completion → `GET /analytics/course-completion` (→ 10.2) — top courses table
   - Trends → `GET /dashboard/trends?months=6` (→ [Overview](./02-overview.md)) — enrollment + completion trend charts
   - Course dropdown → `GET /courses/options` (→ [Course](./04-course.md)) — course filter populate
3. Screen render hoy: filters → stat cards → charts → top courses table

### Filters
1. **Date period selector**: `[7d] [30d] [3m] [6m] [12m]` — shob chart + data te apply hoy
   - Maps to: `?period=week|month|quarter|year` (user engagement endpoint)
   - Trends: `?months=1|3|6|12` (dashboard trends endpoint)
2. **Course filter dropdown**: `GET /courses/options` diye populate — `{ _id, title }`
   - Select korle `?course=COURSE_ID` diye relevant endpoints filter hoy
   - "All Courses" select korle filter remove hoy, global view dekhay
3. **Export CSV**: Analytics data CSV hisebe download — `GET /analytics/export?type=courses` (→ 10.6)

### Stat Cards
1. 3 ta primary stat card:
   - **Total Students**: `500` — `GET /dashboard/summary` → `totalStudents.value`
   - **Avg Completion Rate**: `23%` — `GET /dashboard/summary` → `completionRate.value`
   - **Avg Quiz Score**: `65.5` — `GET /analytics/quiz-performance` → client-side average of all `avgScore` values
2. Each card e value + optional growth indicator (dashboard summary theke)

### Charts

#### Course Completion Trends (Line Chart)
- **Data**: `GET /dashboard/trends?months=6` → `completionTrends[]`
- X-axis: time (monthly), Y-axis: completion count
- Shows: monthly completed enrollments over time

#### Enrollment Trends (Line Chart)
- **Data**: `GET /dashboard/trends?months=6` → `enrollmentTrends[]`
- X-axis: time (monthly), Y-axis: enrollment count
- Shows: monthly new enrollments over time

#### Quiz Score Distribution (Bar Chart)
- **Data**: `GET /analytics/quiz-performance` (→ 10.3)
- X-axis: quiz name, Y-axis: avg score + pass rate
- Shows: per-quiz performance comparison

#### User Growth Over Time (Line Chart)
- **Data**: `GET /analytics/user-engagement?period=month` (→ 10.1)
- X-axis: date, Y-axis: active users count
- Shows: daily active users trend

#### Engagement Heatmap
- **Data**: `GET /analytics/user-engagement?period=quarter` (→ 10.1)
- Visual: day-of-week × week grid, color intensity = active user count
- Shows: kon din/shomoy e students most active

### Top Performing Courses (Table)
1. **Data**: `GET /analytics/course-completion` (→ 10.2)
2. Table columns:

| Column | Field | Source |
|--------|-------|--------|
| Course Name | `title` | response `title` |
| Students Enrolled | `totalEnrollments` | response `totalEnrollments` |
| Completed | `completedEnrollments` | response `completedEnrollments` |
| Completion % | `completionRate` | response `completionRate` |

3. Default sort: `completionRate` descending (top performers first)
4. Course name click korle → `GET /analytics/courses/:courseId` (→ 10.4) — detailed course analytics

### Edge Cases
- **No enrollments yet**: Stat cards shob 0, charts empty state
- **No quiz attempts**: Quiz performance empty, avg quiz score card "N/A"
- **Single course**: Top courses table e 1 row, trends still meaningful
- **Period change**: Charts re-render with new data, stat cards may not change (dashboard summary is overall, not period-based)
- **Course filter active**: Only course-specific analytics dekhay, global charts hide hoy

---

<!-- ═══════════ Analytics Endpoints ═══════════ -->

### 10.1 User Engagement

```
GET /analytics/user-engagement?period=month
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| `period` | string | `month` | `week`, `month`, `quarter`, `year` | Date range for engagement data |

**Response (200):**
```json
{
  "success": true,
  "message": "User engagement retrieved successfully",
  "data": [
    { "date": "2026-03-01", "activeUsers": 45 },
    { "date": "2026-03-02", "activeUsers": 52 },
    { "date": "2026-03-03", "activeUsers": 38 }
  ]
}
```

> Daily active user count — `DailyActivity` collection theke aggregate hoy. Engagement heatmap + user growth chart duitai ei data theke render hoy.

---

### 10.2 Course Completion

```
GET /analytics/course-completion
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Course completion rates retrieved successfully",
  "data": [
    {
      "courseId": "664b1b2c3d4e5f6a7b8c9d0e",
      "title": "Introduction to Web Development",
      "totalEnrollments": 150,
      "completedEnrollments": 35,
      "completionRate": 23
    },
    {
      "courseId": "664b2c3d4e5f6a7b8c9d0f1",
      "title": "Advanced JavaScript",
      "totalEnrollments": 80,
      "completedEnrollments": 28,
      "completionRate": 35
    }
  ]
}
```

> Published courses er completion stats. "Top Performing Courses" table ei data diye render hoy. `completionRate` integer (rounded).

---

### 10.3 Quiz Performance

```
GET /analytics/quiz-performance
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Quiz performance retrieved successfully",
  "data": [
    {
      "quizId": "664d1b2c3d4e5f6a7b8c9d0e",
      "title": "Module 1 Quiz",
      "avgScore": 65.5,
      "totalAttempts": 120,
      "passRate": 72.5,
      "avgTimeSpent": 1500
    },
    {
      "quizId": "664d2c3d4e5f6a7b8c9d0f1",
      "title": "Final Exam",
      "avgScore": 58.2,
      "totalAttempts": 45,
      "passRate": 60.0,
      "avgTimeSpent": 2400
    }
  ]
}
```

> Completed quiz attempts theke aggregate. `avgScore` 1 decimal rounded. `avgTimeSpent` seconds e. "Avg Quiz Score" stat card er value — client-side e shob quiz er `avgScore` average kore calculate korbe.

---

> **Note**: `GET /analytics/courses/:courseId` + `GET /analytics/students/:studentId` — ei 2 ta endpoint code e ache but analytics screen er part na. Course detail → [Course](./04-course.md) screen e, Student detail → [User Management](./03-user-management.md) screen e belong kore.

---

## API Dependency Map

Analytics screen e multiple module er endpoint use hoy:

| UI Section | Endpoint | Module |
|-----------|----------|--------|
| Total Students card | `GET /dashboard/summary` | Dashboard |
| Avg Completion card | `GET /dashboard/summary` | Dashboard |
| Enrollment Trends chart | `GET /dashboard/trends` | Dashboard |
| Completion Trends chart | `GET /dashboard/trends` | Dashboard |
| Course filter dropdown | `GET /courses/options` | Course |
| User Growth chart | `GET /analytics/user-engagement` | Analytics |
| Engagement Heatmap | `GET /analytics/user-engagement` | Analytics |
| Top Courses table | `GET /analytics/course-completion` | Analytics |
| Quiz Score chart | `GET /analytics/quiz-performance` | Analytics |
| Avg Quiz Score card | `GET /analytics/quiz-performance` | Analytics (client-side avg) |

---

## Current Gaps

| # | Gap | Impact | Priority | Note |
|---|-----|--------|:--------:|------|
| 1 | **No date filter on most endpoints** | Shudhu `user-engagement` e `?period` ache. `course-completion`, `quiz-performance` — always all-time data return kore | P2 | Date filter add korte hole service e `createdAt` based `$match` add lagbe |
| 2 | **No CSV export endpoint** | Admin analytics data export korte parbe na | P2 | `ExportBuilder` already ache — controller e use korte parbe |
| 3 | **Avg Quiz Score — client-side calculation** | Backend e single "avg quiz score" field nai — frontend shob quiz er avgScore average kore | P3 | Dedicated summary endpoint banano jay, but client-side calculation acceptable |
| 4 | **No validation schemas** | Query params, path params er kono Zod validation nai | P2 | `period` param e invalid value dile silently default `month` use hoy — error message nai |
| 5 | **`getCourseCompletion` — N+1 query pattern** | `Promise.all(courses.map(...))` — each course er jonno 2 ta `countDocuments` call. 20 courses = 40 queries | P1 | Single aggregation pipeline diye replace korte parbe |

---

## Audit & Review Log

### Initial Creation (2026-03-28)

- Comprehensive UX flow added — filters, stat cards, charts, top courses table, course detail view
- API dependency map — kon UI section kon module er endpoint use kore
- 6 gaps documented with priority (N+1 query P1, date filter + export P2)
- Response examples updated with realistic data + field descriptions
- Edge cases documented

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/analytics/analytics.service.ts` | Business logic, aggregations, query patterns |
| `src/app/modules/analytics/analytics.controller.ts` | Handler pattern, query param handling |
| `src/app/modules/analytics/analytics.route.ts` | Auth, route order, validation |
| `src/app/modules/dashboard/dashboard.service.ts` | Summary + trends endpoints (reused in analytics) |
| `src/app/modules/course/course.service.ts` | `getCourseOptions` — dropdown populate |
