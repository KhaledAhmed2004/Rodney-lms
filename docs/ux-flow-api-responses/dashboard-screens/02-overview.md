# Screen 2: Overview

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Analytics](./10-analytics.md) (detailed breakdowns), [User Management](./03-user-management.md) (user list)

## UX Flow

### Dashboard Load
1. Admin login er por Overview screen e land kore
2. Page load e parallel API calls:
   - Summary cards → `GET /dashboard/summary` (→ 2.1) — total students, courses, enrollments, completion rate + growth deltas
   - Trend charts → `GET /dashboard/trends` (→ 2.2) — enrollment + completion trend charts
   - Recent activity feed → `GET /dashboard/recent-activity` (→ 2.3) — latest enrollments, completions, quiz attempts
3. Screen render hoy: stat cards → trend charts → activity feed

### Stat Cards (with Growth Deltas)
1. 4 ta primary stat card dekhay — each card e value + previous period comparison:
   - Total Students: `500 ↑ 12% vs last month`
   - Active Students: `280 ↓ 3% vs last month`
   - Total Courses: `12 ↑ 2 new`
   - Completion Rate: `23% ↑ 5% vs last month`
2. Card e click korle relevant management screen e navigate (e.g. Total Students → [User Management](./03-user-management.md), Total Courses → [Course](./04-course.md))
3. Growth delta positive hole green arrow (↑), negative hole red arrow (↓), zero hole gray dash (—)

### Trend Charts
1. Enrollment + Completion trend chart dekhay (monthly grouped, last 6 months default)
2. Period selector: `[7d] [30d] [3m] [6m] [12m]` — shob widget e apply hoy
3. Chart format: line/bar chart — x-axis time, y-axis count
4. Daily granularity for 7d/30d, monthly for 3m/6m/12m

### Recent Activity Feed
1. Unified activity feed dekhay — shob type eksathe, sorted by time
2. Tabs: `[All] [Enrollments] [Completions] [Quiz]` — filter by type
3. Default 20 items — `?limit=10` diye customize korte pare
4. Each item e: icon (type badge) + title (full sentence) + relative timestamp ("5 min ago")

---

### 2.1 Get Dashboard Summary

```
GET /dashboard/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "comparisonPeriod": "month",
    "totalStudents": { "value": 500, "growth": 12, "growthType": "increase" },
    "activeStudents": { "value": 280, "growth": 3, "growthType": "decrease" },
    "totalCourses": { "value": 12, "growth": 20, "growthType": "increase" },
    "completionRate": { "value": 23, "growth": 5, "growthType": "increase" }
  }
}
```

> **Uses `AggregationBuilder.calculateGrowth({ period: 'month' })`** — returns `IStatistic` format per metric
>
> - `value` — metric value (count or percentage)
> - `growth` — absolute percentage change vs last month (`IStatistic.growth`)
> - `growthType` — `increase` | `decrease` | `no_change` (`IStatistic.growthType`)
> - `comparisonPeriod` — growth comparison period (`"month"`) — frontend e "vs last **month**" dynamically dekhabe
>
> **Per-metric implementation:**
> | Metric | Model | Filter | Notes |
> |--------|-------|--------|-------|
> | `totalStudents` | `User` | `{ role: 'STUDENT', status: 'ACTIVE' }` | `calculateGrowth()` direct |
> | `activeStudents` | `Enrollment` | `{ status: 'ACTIVE' }` | `value`: `distinct('student')` (exact), `growth`: `calculateGrowth()` (enrollment count proxy — approximate) |
> | `totalCourses` | `Course` | `{ status: 'PUBLISHED' }` | `calculateGrowth()` direct |
> | `completionRate` | `Enrollment` | — | Calculated separately: `Math.round((completed / total) * 100)`, growth = rate diff vs last month |

---

### 2.2 Get Trends

```
GET /dashboard/trends
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `months` | number | 6 | Koto month er data chaay (rolling window) |

**Response:**
```json
{
  "success": true,
  "message": "Trends retrieved successfully",
  "data": {
    "enrollmentTrends": [
      { "period": "2025-10", "label": "Oct 2025", "count": 95 },
      { "period": "2025-11", "label": "Nov 2025", "count": 110 },
      { "period": "2025-12", "label": "Dec 2025", "count": 105 },
      { "period": "2026-01", "label": "Jan 2026", "count": 120 },
      { "period": "2026-02", "label": "Feb 2026", "count": 145 },
      { "period": "2026-03", "label": "Mar 2026", "count": 0 }
    ],
    "completionTrends": [
      { "period": "2025-10", "label": "Oct 2025", "count": 35 },
      { "period": "2025-11", "label": "Nov 2025", "count": 42 },
      { "period": "2025-12", "label": "Dec 2025", "count": 0 },
      { "period": "2026-01", "label": "Jan 2026", "count": 45 },
      { "period": "2026-02", "label": "Feb 2026", "count": 52 },
      { "period": "2026-03", "label": "Mar 2026", "count": 68 }
    ]
  }
}
```

> **Implementation:** `AggregationBuilder.getTimeTrends()` — frontend-ready output
>
> ```typescript
> new AggregationBuilder(Enrollment).getTimeTrends({ timeUnit: 'month', startDate });
> new AggregationBuilder(Enrollment).getTimeTrends({ timeUnit: 'month', dateField: 'completedAt', startDate, filter: { status: 'COMPLETED' } });
> ```
>
> - `period` — machine-readable, sortable (`"2026-01"`)
> - `label` — display-ready, directly chart x-axis (`"Jan 2026"`)
> - `count` — document count, directly chart y-axis
> - Gap-filled — missing months `count: 0` diye fill kora, chart e continuous line
> - `sumField` dile extra `total` field ashbe (e.g. revenue sum)

---

### 2.3 Get Recent Activity

```
GET /dashboard/recent-activity
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | — | Filter by type: `ENROLLMENT` \| `COMPLETION` \| `QUIZ_ATTEMPT` — empty hole shob type |
| `limit` | number | 20 | Koto item chaay |

**Response:**
```json
{
  "success": true,
  "message": "Recent activity retrieved successfully",
  "data": [
    {
      "_id": "664b1a2c...",
      "type": "ENROLLMENT",
      "title": "John Doe enrolled in Introduction to Web Development",
      "timestamp": "2026-03-18T10:00:00Z"
    },
    {
      "_id": "664e3f1a...",
      "type": "QUIZ_ATTEMPT",
      "title": "John Doe attempted Module 1 Quiz",
      "timestamp": "2026-03-18T09:20:00Z"
    },
    {
      "_id": "664b2d4e...",
      "type": "COMPLETION",
      "title": "Jane Smith completed JavaScript Basics",
      "timestamp": "2026-03-17T09:00:00Z"
    }
  ]
}
```

> **UI Tile Layout:**
> ```
> [🎓]  John Doe enrolled in Introduction to Web Dev          5 min ago
> [📝]  John Doe attempted Module 1 Quiz                      45 min ago
> [✅]  Jane Smith completed JavaScript Basics                 1 day ago
> ```
>
> - `_id` — source document er MongoDB ObjectId — React list key hisebe use koro
> - `type` — `ENROLLMENT` | `COMPLETION` | `QUIZ_ATTEMPT` — frontend e icon map korbe
> - `title` — backend e construct kora full sentence: `"{studentName} {action} {courseOrQuizTitle}"`
> - `timestamp` — sorted newest first — frontend e `date-fns formatDistanceToNow()` or `timeago.js` diye "X min ago" dekhabe
> - Tab filtering: `?type=ENROLLMENT` dile shudhu enrollments asbe
>
> **Backend title construction:**
> | type | template |
> |------|----------|
> | `ENROLLMENT` | `"{name} enrolled in {courseTitle}"` |
> | `COMPLETION` | `"{name} completed {courseTitle}"` |
> | `QUIZ_ATTEMPT` | `"{name} attempted {quizTitle}"` |
>
> **Backend implementation:** `Promise.all` diye 3 ta parallel query → populate student name + course/quiz title → construct `title` string → merge → sort by `timestamp` desc → slice to `limit`

---

### API Status

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 2.1 | `GET /dashboard/summary` | ✅ Done | Growth deltas — `calculateGrowth()` per metric, `{ value, growth, growthType }` |
| 2.2 | `GET /dashboard/trends` | ✅ Done | `enrollmentTrends` + `completionTrends`, cross-year rolling window |
| 2.3 | `GET /dashboard/recent-activity` | ✅ Done | Unified feed — `{ type, title, timestamp }`, `?type=` filter |

### All Enhancements Done

> Zero-month gap fill: `getTimeTrends({ gapFill: true })` — built-in, missing periods `count: 0` diye fill kore. Default enabled.

---

## Audit Log

**Date:** 2026-03-27

### Round 1 — Doc-Code Mismatch + Validation Audit

| # | Issue | Severity | Category | Fix | Status |
|---|-------|----------|----------|-----|--------|
| 1 | Doc e `activeStudents` note wrong — `groupBy: 'student'` likha but code e nei | Critical | Doc-Code Mismatch | Doc corrected — `value`: `distinct()` (exact), `growth`: enrollment count proxy (approximate) | ✅ Fixed |
| 2 | UX Flow "Recent Activity" e "avatar + navigate" likha — response e nei | Critical | Doc-Code Mismatch | UX section updated — "icon + title + relative timestamp" | ✅ Fixed |
| 3 | `months` query param NaN check nei — `?months=abc` → NaN pass hoy | Medium | Input Validation | `isNaN` + range guard (1-24), `ApiError` throw | ✅ Fixed |
| 4 | `type` query param validated na — `?type=INVALID` → silent empty array | Medium | Input Validation | `VALID_ACTIVITY_TYPES` check, invalid → `ApiError` | ✅ Fixed |
| 5 | `limit` query param NaN check nei — `?limit=abc` → NaN pass hoy | Medium | Input Validation | `isNaN` + range guard (1-100) | ✅ Fixed |
| 6 | `activeStudents.growth` approximate — enrollment count, distinct student na | Low | Data Accuracy | Doc e "approximate" note added | ✅ Fixed |

### Round 2 — API Design + Response Design Audit

| # | Issue | Severity | Category | Fix | Status |
|---|-------|----------|----------|-----|--------|
| 7 | Summary e `comparisonPeriod` missing — frontend "vs last month" hardcode | Low | Response Design | `comparisonPeriod: "month"` response e add kora | ✅ Fixed |
| 8 | Trends `label` English hardcoded — i18n nei | Low | Response Design | `period` field already ache — frontend locale-aware lib bypass korte pare | ⏭ Skipped |
| 9 | Recent Activity e `_id` nei — React list key issue | Medium | Response Design | Source document er `_id` each item e add kora | ✅ Fixed |
| 10 | ENROLLMENT query all statuses fetch kore — completed item duplicate | Low | Business Logic | Contextually correct (different events at different times) | ⏭ Skipped |

### Round 3 — Edge Case + Code Quality Audit

| # | Issue | Severity | Category | Fix | Status |
|---|-------|----------|----------|-----|--------|
| 11 | `setMonth` rollover bug — 31st tarikh e month subtraction wrong hoy (Mar 31 - 6mo = Oct 1 instead of Sep 30) | Medium | Edge Case | `startDate.setDate(1)` add kora month subtraction er age | ✅ Fixed |
| 12 | `completedAt` null → COMPLETION item e `timestamp: undefined` → sort e NaN → random order | Low | Edge Case | Rare case — enrollment COMPLETED hole `completedAt` normally set thake | ⏳ Open |
| 13 | Same enrollment `_id` ENROLLMENT + COMPLETION duita feed e ashe → React key collision, render glitch | High | Edge Case | Fix needed — `_id` composite banate hobe `${type}_${_id}` | ⏳ Open |

### Summary

```
Total Issues:  13
Fixed:          9  (✅)
Skipped:        2  (⏭ — not needed / frontend handles)
Open:           2  (⏳ — #12 low priority, #13 fix pending)
```

### Files Modified

| File | Changes |
|------|---------|
| `dashboard.service.ts` | Growth deltas, unified feed, `_id` add, `comparisonPeriod`, `setDate(1)` fix |
| `dashboard.controller.ts` | Input validation (NaN, range, type check) |
| `AggregationBuilder.ts` | `getTimeTrends()` rewrite — `dateField`, `startDate`, gap-fill, `{ period, label, count }` output |
| `02-overview.md` | Response format update, UX Flow fix, implementation notes, audit log |
| `postman-collection.json` | Query params + description update |

---