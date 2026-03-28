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
   - Engagement heatmap → `GET /analytics/engagement-heatmap?period=quarter` (→ 10.5) — heatmap grid data
   - Course completion → `GET /analytics/course-completion` (→ 10.1) — top courses table
   - Trends → `GET /dashboard/trends?months=6` (→ [Overview](./02-overview.md)) — enrollment + completion trend charts
   - Course dropdown → `GET /courses/options` (→ [Course](./04-course.md)) — course filter populate
   - _(Quiz performance page load e call hoy na — course select korar por call hoy → 10.2)_
3. Screen render hoy: filters → stat cards → charts → top courses table

### Filters
1. **Date period selector**: `[7d] [30d] [3m] [6m] [12m]` — shob chart + data te apply hoy
   - Maps to: `?period=week|month|quarter|year` — shob analytics endpoint e support kore
   - Trends: `?months=1|3|6|12` (dashboard trends endpoint)
   - Period change korle shob section re-fetch hoy updated data diye
2. **Course filter dropdown**: `GET /courses/options` diye populate — `{ _id, title }`
   - Quiz Performance section er jonno required — course select korle oi course er quizzes dekhay
   - Course select na korle Quiz Performance e placeholder: "Select a course to view quiz performance"
   - Top Performing Courses table + Heatmap + Trends — course filter independent, shob shomoy dekhay
3. **Export CSV**: Analytics data CSV/XLSX hisebe download — `GET /analytics/export?type=courses` (→ 10.3)
   - Page er top e Export button thake
   - Click korle download shuru hoy — format default CSV, XLSX option ache

### Stat Cards
1. 2 ta primary stat card (page load e immediately show):
   - **Total Students**: `500` — `GET /dashboard/summary` → `totalStudents.value`
   - **Avg Completion Rate**: `23%` — `GET /dashboard/summary` → `completionRate.value`
2. Each card e value + optional growth indicator (dashboard summary theke)
3. **Avg Quiz Score** — quiz table er summary footer e dekhabe (course select korar por), stat card hisabe na

### Charts

#### Course Completion Trends (Line Chart)
- **Data**: `GET /dashboard/trends?months=6` → `completionTrends[]`
- X-axis: time (monthly), Y-axis: completion count
- Shows: monthly completed enrollments over time
- Date filter change korle `?months` param update hoy

#### Enrollment Trends (Line Chart)
- **Data**: `GET /dashboard/trends?months=6` → `enrollmentTrends[]`
- X-axis: time (monthly), Y-axis: enrollment count
- Shows: monthly new enrollments over time
- Date filter change korle `?months` param update hoy

#### Quiz Performance (Course-specific Table)
- **Requires**: Course dropdown theke ekta course select korte hobe
- **Initial state**: Course select na korle → "Select a course to view quiz performance"
- **Data**: `GET /analytics/courses/:courseId/quizzes?period=month` (→ 10.2)
- Table columns: Quiz name | Avg Score (inline progress bar + number) | Pass Rate (%) | Attempts
- Avg Score color: Green (>70) / Yellow (50-70) / Red (<50) — instant visual feedback
- Default sort: `avgScore` descending — worst performing quiz first
- Date filter change korle `?period` param update hoy — selected period er attempts dekhay
- Course change korle new course er quizzes fetch hoy

#### Engagement Heatmap (GitHub-style)
- **Data**: `GET /analytics/engagement-heatmap?period=quarter` (→ 10.5)
- **Layout**: GitHub contribution graph style — 7 rows (days of week) × N columns (weeks), each cell = 1 day
- **Color**: Green gradient 5-step — `#ebedf0` (no activity) → `#9be9a8` (low) → `#40c463` (medium) → `#30a14e` (high) → `#216e39` (very high)
- **Day labels**: Left side e shudhu **Mon, Wed, Fri** dekhabe (shob 7 din dekhale cramped lage)
- **Month labels**: Grid er top e month name (Jan, Feb, Mar...) — month er first week er column e position hobe
- **Tooltip (hover)**: Cell e hover korle tooltip dekhabe — `"45 active students — Monday, Jan 5, 2026"`
- **Legend**: Top-right ba bottom-right e: `Less □ ░ ▒ ▓ █ More`
- **Cell size**: 12-14px square, 2-3px gap
- **Period filter**: Quarter default (best density). Month ar Year option o thakbe. Week skip — 7 ta cell e heatmap value add kore na
- **Empty state**: Shob cell gray (#ebedf0) + center e text: "No student activity recorded in this period"
- Date filter change korle `?period` param update hoy, pura heatmap re-render

**Frontend implementation** — `react-activity-calendar` library diye:
```tsx
import ActivityCalendar from 'react-activity-calendar';
import { Tooltip as ReactTooltip } from 'react-tooltip';

// API response directly map hoy — 1 liner
const activities = data.map(d => ({
  date: d.date,
  count: d.activeUsers,
  level: d.intensity as 0 | 1 | 2 | 3 | 4,
}));

<ActivityCalendar
  data={activities}
  theme={{
    dark: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  }}
  renderBlock={(block, activity) => (
    <ReactTooltip
      content={`${activity.count} active students on ${activity.date}`}
    >
      {block}
    </ReactTooltip>
  )}
  labels={{ totalCount: '{{count}} active student-days in this period' }}
  showWeekdayLabels  // Mon, Wed, Fri auto-show
/>
```

### Top Performing Courses (Table)
1. **Data**: `GET /analytics/course-completion?period=month` (→ 10.1)
2. Table columns:

| Column | Field | Source |
|--------|-------|--------|
| Course Name | `title` | response `title` |
| Students Enrolled | `totalEnrollments` | response `totalEnrollments` |
| Completed | `completedEnrollments` | response `completedEnrollments` |
| Completion % | `completionRate` | response `completionRate` |

3. Default sort: `completionRate` descending (top performers first)
4. Course name click korle → `GET /analytics/courses/:courseId` (→ 10.4) — detailed course analytics
5. Course filter e specific course select korle ei table hide hoy — shudhu selected course er metrics dekhay
6. Date filter change korle table re-fetch hoy `?period` param diye

### Edge Cases
- **No enrollments yet**: Stat cards shob 0, charts empty state
- **No quiz attempts**: Quiz performance table empty — "No quiz attempts in this period"
- **No course selected**: Quiz performance section placeholder — "Select a course to view quiz performance"
- **Invalid course ID**: 404 error — "Course not found"
- **Single course**: Top courses table e 1 row, trends still meaningful
- **Period change**: Heatmap + Top Courses table + Quiz table re-render with period-filtered data. Stat cards (dashboard summary) overall data dekhay — period-independent
- **Course filter active**: Quiz performance oi course er quizzes dekhay. Top Courses table e shob course thake (independent)

---

<!-- ═══════════ Cross-Module Endpoints (reused from other screens) ═══════════ -->

### Dashboard Summary (reused)

```
GET /dashboard/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Stat cards er data — total students, active students, courses, completion rate. Month-over-month growth delta included.

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "comparisonPeriod": "month",
    "totalStudents": {
      "value": 500,
      "growth": 12,
      "growthType": "increase"
    },
    "activeStudents": {
      "value": 320,
      "growth": 5,
      "growthType": "increase"
    },
    "totalCourses": {
      "value": 15,
      "growth": 2,
      "growthType": "increase"
    },
    "completionRate": {
      "value": 23,
      "growth": 3.5,
      "growthType": "increase"
    }
  }
}
```

> `growthType`: `"increase"` | `"decrease"` | `"same"`. Growth = month-over-month delta. `completionRate.growth` is absolute value (always positive — `growthType` indicates direction). Full docs → [Overview](./02-overview.md).

---

### Dashboard Trends (reused)

```
GET /dashboard/trends?months=6
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| `months` | number | `6` | `1`–`24` | Lookback period in months |

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard trends retrieved successfully",
  "data": {
    "enrollmentTrends": [
      { "period": "2025-10", "label": "Oct 2025", "count": 45 },
      { "period": "2025-11", "label": "Nov 2025", "count": 52 },
      { "period": "2025-12", "label": "Dec 2025", "count": 38 },
      { "period": "2026-01", "label": "Jan 2026", "count": 61 },
      { "period": "2026-02", "label": "Feb 2026", "count": 55 },
      { "period": "2026-03", "label": "Mar 2026", "count": 48 }
    ],
    "completionTrends": [
      { "period": "2025-10", "label": "Oct 2025", "count": 12 },
      { "period": "2025-11", "label": "Nov 2025", "count": 18 },
      { "period": "2025-12", "label": "Dec 2025", "count": 15 },
      { "period": "2026-01", "label": "Jan 2026", "count": 22 },
      { "period": "2026-02", "label": "Feb 2026", "count": 20 },
      { "period": "2026-03", "label": "Mar 2026", "count": 17 }
    ]
  }
}
```

> Monthly trend data. Gap-filled — months with 0 activity still appear with `count: 0`. Sorted ascending by date. `period` = "YYYY-MM", `label` = human-readable "Mon YYYY". Full docs → [Overview](./02-overview.md).

---

### Course Options (reused)

```
GET /courses/options
Auth: None (public)
```

> Course filter dropdown populate korar jonno. Shudhu published courses, alphabetical sorted.

**Response (200):**
```json
{
  "success": true,
  "message": "Course options retrieved successfully",
  "data": [
    { "_id": "664b1b2c3d4e5f6a7b8c9d0e", "title": "Advanced JavaScript" },
    { "_id": "664b2c3d4e5f6a7b8c9d0f1", "title": "Intro to Web Dev" },
    { "_id": "664b3d4e5f6a7b8c9d0f2g3", "title": "React Fundamentals" }
  ]
}
```

> Lightweight endpoint — shudhu `{ _id, title }`. Alphabetical sorted by title. Full docs → [Course](./04-course.md).

---

<!-- ═══════════ Analytics Endpoints ═══════════ -->

### 10.1 Course Completion

```
GET /analytics/course-completion?period=month
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| `period` | string | _(none — all-time)_ | `week`, `month`, `quarter`, `year` | Filter enrollments by creation date. Omit for all-time data |

**Validation**: `period` must be one of `week | month | quarter | year`. Invalid value returns 400 error.

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

> Published courses er completion stats. Single aggregation pipeline — Enrollment collection theke `$group` + `$lookup` to courses. `completionRate` integer (rounded). Sorted by `completionRate` descending.

---

### 10.2 Quiz Performance (Course-specific)

```
GET /analytics/courses/:courseId/quizzes?period=month&page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `courseId` | string | MongoDB ObjectId of the course |

**Query Parameters:**
| Param | Type | Required | Default | Options | Description |
|-------|------|:--------:|---------|---------|-------------|
| `period` | string | No | _(all-time)_ | `week`, `month`, `quarter`, `year` | Filter by attempt date. Omit for all-time |
| `page` | number | No | `1` | 1+ | Page number |
| `limit` | number | No | `10` | 1-100 | Items per page |

**Validation**: `courseId` path param required. `period` must be one of `week | month | quarter | year`. `page` min 1, `limit` min 1 max 100. Invalid values return 400. Invalid courseId returns 404.

**Response (200):**
```json
{
  "success": true,
  "message": "Quiz performance retrieved successfully",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "totalPage": 2
  },
  "data": [
    {
      "title": "Module 1 Quiz",
      "avgScore": 78.3,
      "totalAttempts": 90,
      "passRate": 85.0
    },
    {
      "title": "Module 2 Quiz",
      "avgScore": 65.5,
      "totalAttempts": 120,
      "passRate": 72.5
    },
    {
      "title": "Final Exam",
      "avgScore": 58.2,
      "totalAttempts": 45,
      "passRate": 60.0
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Quiz title |
| `avgScore` | number | Average score (0-100, 1 decimal) |
| `totalAttempts` | number | Total completed attempts |
| `passRate` | number | Pass percentage (0-100, 1 decimal) |

**Pagination Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page |
| `limit` | number | Items per page |
| `total` | number | Total quiz count |
| `totalPage` | number | Total pages |

> Selected course er quizzes er performance data. Sorted by `avgScore` descending. Course er kono quiz na thakle ba kono attempt na thakle empty `data: []` with `total: 0`. "Avg Quiz Score" — client-side e current page er `avgScore` average kore calculate korbe.

**Frontend Implementation Guide:**

**UX Flow:**
1. Admin course dropdown theke ekta course select kore (existing `GET /courses/options` dropdown)
2. Course select korle quiz performance section load hoy — `/analytics/courses/{courseId}/quizzes` diye API call
3. Course select na korle placeholder state dekhay: "Select a course to view quiz performance"

**Visualization — paginated table with progress bars:**

```
┌─ Quiz Performance — Introduction to Web Development ─────────────────┐
│                                                                       │
│ Quiz              │ Avg Score           │ Pass Rate  │ Attempts       │
│───────────────────┼─────────────────────┼────────────┼────────────────│
│ Module 1 Quiz     │ ████████████░░░ 78  │  85.0%     �� 90             │
│ Module 2 Quiz     │ ██████████░░░░░ 66  │  72.5%     │ 120            │
│ Final Exam        │ ████████░░░░░░░ 58  │  60.0%     │ 45             │
│ Pop Quiz          │ ██████░░░░░░░░░ 45  │  48.2%     │ 30             │
├───────────────────┴─────────────────────┴────────────┴────────────────┤
│  Avg Quiz Score: 61.8  │  Overall Pass Rate: 66.4%                    │
├───────────────────────────────────────────────────────────────────────┤
│  Showing 1-10 of 12 quizzes                    [ < ]  1  2  [ > ]    │
└───────────────────────────────────────────────────────────────────────┘
```

1. **Section title**: "Quiz Performance — {Selected Course Title}" — kon course er data dekhche instantly bujha jay
2. **Avg Score column**: Inline progress bar (0-100) + number — Color: Green (>70) / Yellow (50-70) / Red (<50)
3. **Pass Rate column**: Percentage text, same color logic
4. **Attempts column**: Plain number — sample size context
5. **Summary footer**: Avg Quiz Score + Overall Pass Rate — client-side average of current page data
6. **Pagination**: Bottom e — "Showing 1-10 of 12 quizzes" + prev/next buttons. `pagination.total` theke count, `pagination.totalPage` theke page buttons
7. **Sort**: Default `avgScore` descending. Column header click e toggle
8. **Empty state** (no quizzes): "This course has no quizzes yet"
9. **Empty state** (no attempts): "No quiz attempts in this period"
10. **Placeholder** (no course selected): "Select a course to view quiz performance"

---

### 10.3 Export Analytics

```
GET /analytics/export?type=courses&format=csv&period=month
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| `type` | string | _(required)_ | `courses`, `quizzes`, `engagement` | Which analytics data to export |
| `course` | string | _(required for `quizzes`)_ | MongoDB ObjectId | Course ID — required when `type=quizzes` |
| `format` | string | `csv` | `csv`, `xlsx` | Export file format |
| `period` | string | _(none — all-time)_ | `week`, `month`, `quarter`, `year` | Date filter (same as individual endpoints) |

**Validation**: `type` is required. `course` is required when `type=quizzes`. `format` and `period` are optional. Invalid values return 400 error.

**Response**: File download (not JSON). Content-Type depends on format:
- CSV: `text/csv` with `.csv` extension
- XLSX: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `.xlsx` extension

**Export Columns per Type:**

| Type | Columns |
|------|---------|
| `courses` | Course, Enrolled, Completed, Completion % |
| `quizzes` | Quiz, Avg Score, Total Attempts, Pass Rate % _(requires `?course` — course name is in filename)_ |
| `engagement` | Date, Active Users |

**Filename pattern**: `analytics-{type}-{YYYY-MM-DD}.csv` (or `.xlsx`)

> Uses `ExportBuilder` in controller. Service returns same data as the regular endpoints — export just wraps it in CSV/XLSX format.

---

### 10.4 Course Analytics (Detail)

```
GET /analytics/courses/:courseId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `courseId` | string | MongoDB ObjectId of the course |

**Validation**: `courseId` is required string.

**Response (200):**
```json
{
  "success": true,
  "message": "Course analytics retrieved successfully",
  "data": {
    "enrollmentStats": [
      { "_id": "ACTIVE", "count": 45 },
      { "_id": "COMPLETED", "count": 28 },
      { "_id": "IN_PROGRESS", "count": 17 }
    ],
    "progressDistribution": [
      { "_id": 0, "count": 12 },
      { "_id": 25, "count": 18 },
      { "_id": 50, "count": 10 },
      { "_id": 75, "count": 8 },
      { "_id": 100, "count": 2 }
    ]
  }
}
```

> Course detail view — enrollment status breakdown + progress percentage distribution (0-25%, 25-50%, 50-75%, 75-100%). This endpoint belongs to Course detail screen, linked from Top Performing Courses table.

---

### 10.5 Engagement Heatmap

```
GET /analytics/engagement-heatmap?period=quarter
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Options | Description |
|-------|------|---------|---------|-------------|
| `period` | string | `quarter` | `week`, `month`, `quarter`, `year` | Date range for heatmap data |

**Validation**: `period` must be one of `week | month | quarter | year`. Invalid value returns 400 error.

**Response (200):**
```json
{
  "success": true,
  "message": "Engagement heatmap retrieved successfully",
  "data": [
    { "date": "2026-01-01", "activeUsers": 0, "intensity": 0 },
    { "date": "2026-01-02", "activeUsers": 12, "intensity": 1 },
    { "date": "2026-01-03", "activeUsers": 45, "intensity": 3 },
    { "date": "2026-01-04", "activeUsers": 0, "intensity": 0 },
    { "date": "2026-01-05", "activeUsers": 67, "intensity": 4 }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date in `YYYY-MM-DD` format |
| `activeUsers` | number | Unique active users on this day |
| `intensity` | number | Activity level `0`-`4` based on quartile distribution |

> **Gap-filled**: Period er shob din return hoy — zero-activity days `activeUsers: 0, intensity: 0` diye included thake. Grid rendering e kono gap thakbe na.

**Intensity Scale:**
| Level | Meaning | Quartile |
|:-----:|---------|----------|
| 0 | No activity | `activeUsers === 0` |
| 1 | Low | `> 0` and `≤ P25` |
| 2 | Medium | `> P25` and `≤ P50` |
| 3 | High | `> P50` and `≤ P75` |
| 4 | Very high | `> P75` |

> GitHub-style heatmap endpoint. Period er shob din gap-filled return hoy. Percentile calculation server-side e hoy. Sorted ascending by date.

**Frontend Implementation Guide:**

1. **Library**: `react-activity-calendar` (npm install)
2. **Data mapping** (1 liner — API response directly library-compatible):
   ```typescript
   const activities = apiData.map(d => ({
     date: d.date,           // YYYY-MM-DD → library positions on calendar grid
     count: d.activeUsers,   // tooltip e dekhabe
     level: d.intensity,     // 0-4 → color index
   }));
   ```
3. **Color theme** (GitHub green gradient):
   ```typescript
   const theme = {
     light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
     dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
   };
   ```
4. **Tooltip**: Hover e `"45 active students on 2026-01-05"` dekhabe
5. **Labels**: `showWeekdayLabels` prop dile Mon/Wed/Fri auto-show hoy
6. **Legend**: Library built-in legend ache, ba custom `Less □░▒▓█ More` banano jay
7. **Empty state**: Shob `intensity: 0` hole gray grid dekhabe — upore "No activity" message dekhao conditionally (`data.every(d => d.activeUsers === 0)`)
8. **Period options**: Quarter (default), Month, Year. Week skip — 7 ta cell e heatmap value nai

---

## API Dependency Map

Analytics screen e multiple module er endpoint use hoy:

| UI Section | Endpoint | Module | Period Filter |
|-----------|----------|--------|:-------------:|
| Total Students card | `GET /dashboard/summary` | Dashboard | No |
| Avg Completion card | `GET /dashboard/summary` | Dashboard | No |
| Enrollment Trends chart | `GET /dashboard/trends` | Dashboard | `?months` |
| Completion Trends chart | `GET /dashboard/trends` | Dashboard | `?months` |
| Course filter dropdown | `GET /courses/options` | Course | No |
| Engagement Heatmap | `GET /analytics/engagement-heatmap` | Analytics | `?period` |
| Top Courses table | `GET /analytics/course-completion` | Analytics | `?period` |
| Quiz Performance table | `GET /analytics/courses/:courseId/quizzes` | Analytics | `:courseId` (path) + `?period` |
| Avg Quiz Score (footer) | `GET /analytics/courses/:courseId/quizzes` | Analytics (client-side avg) | Same as above |
| Export CSV/XLSX | `GET /analytics/export` | Analytics | `?period` |

---

## Current Gaps

| # | Gap | Impact | Priority | Note |
|---|-----|--------|:--------:|------|
| 1 | **Avg Quiz Score — client-side calculation** | Backend e single "avg quiz score" field nai — frontend shob quiz er avgScore average kore | P3 | Dedicated summary endpoint banano jay, but client-side calculation acceptable — small dataset |
| 2 | **Dashboard summary not period-filtered** | Stat cards (Total Students, Avg Completion) always show overall data, period filter apply hoy na | P3 | Dashboard summary endpoint design e date filter nai — acceptable karon overall metrics meaningful |

---

## Audit & Review Log

### Initial Creation (2026-03-28)

- Comprehensive UX flow added — filters, stat cards, charts, top courses table, course detail view
- API dependency map — kon UI section kon module er endpoint use kore
- 6 gaps documented with priority (N+1 query P1, date filter + export P2)
- Response examples updated with realistic data + field descriptions
- Edge cases documented

### Gap Fixes (2026-03-28)

**Fixed:**
- ~~**N+1 query in `getCourseCompletion`**~~ → Single `Enrollment.aggregate()` pipeline with `$group` + `$lookup` to courses. N*2+1 queries reduced to 1 query.
- ~~**No date filter on `course-completion` + `quiz-performance`**~~ → `?period=week|month|quarter|year` param added. Reuses existing `getStartDate()` helper. Omit for all-time (backward compatible).
- ~~**No CSV export endpoint**~~ → `GET /analytics/export?type=courses|quizzes|engagement&format=csv|xlsx` added. Uses `ExportBuilder` in controller.
- ~~**No validation schemas**~~ → `analytics.validation.ts` created with Zod schemas for all 6 routes. Period, export type, format, path params all validated.

**Remaining:**
- Client-side avg quiz score calculation (P3) — acceptable, not worth dedicated endpoint
- Dashboard summary not period-filtered (P3) — acceptable, overall metrics are meaningful

### Redesign & Audit (2026-03-28)

**Removed endpoints:**
- ~~**User Engagement**~~ (`GET /analytics/user-engagement`) → Redundant — heatmap (10.5) same data + richer. Route, controller removed. Service function retained for export `type=engagement`
- ~~**Student Analytics**~~ (`GET /analytics/students/:studentId`) → Not in UI. Route, controller, service, validation fully removed

**Redesigned:**
- **10.5 Engagement Heatmap** → Gap-filled all days (zero-activity = `intensity: 0`). Removed `dayOfWeek`/`weekIndex` (library computes). UTC-consistent date handling
- **10.2 Quiz Performance** → RESTful redesign: `GET /analytics/courses/:courseId/quizzes` (was `/quiz-performance?course=ID`). Course ID now path param (consistent with `/courses/:courseId`). Added pagination. Course existence validation (404 if invalid). Frontend guide: paginated table with progress bars
- **Stat cards** → Reduced from 3 to 2 (Avg Quiz Score moved to quiz table footer)

**Audit fixes (P0-P1):**
- ~~Export broken — `courseTitle` in columnMap but not in data~~ → Removed from export columns
- ~~Invalid courseId silently returns empty~~ → `Course.exists()` check, throws 404
- ~~Export validation missing `course` for quizzes~~ → `.superRefine()` conditional validation
- ~~Heatmap timezone inconsistency~~ → `setUTCHours()` consistent with MongoDB UTC

### Files Analyzed / Modified

| File | What Changed |
|------|-------------|
| `analytics.service.ts` | Heatmap gap-fill + UTC fix, quiz course-specific + pagination + course validation, dead code removed (`getStudentAnalytics`) |
| `analytics.controller.ts` | Quiz pagination + course param, dead handlers removed (`getUserEngagement`, `getStudentAnalytics`), export `courseTitle` column removed |
| `analytics.route.ts` | Dead routes removed (`/user-engagement`, `/students/:studentId`) |
| `analytics.validation.ts` | New `courseQuizQuerySchema` (courseId path + pagination), export conditional `course` validation, `studentIdParamSchema` removed |
