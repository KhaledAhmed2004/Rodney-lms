# Screen 6: Gradebook

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md), [Feedback](./11-feedback.md)

---

## UX Flow

### Gradebook Management
1. Admin "Gradebook" e navigate kore (sidebar)
2. Page load e parallel API calls:
   - Summary stats → `GET /gradebook/students/summary` (→ 6.1) — stat cards
   - Course options → `GET /courses/options` (→ [Course](./04-course.md)) — dropdown populate
   - Student gradebook → `GET /gradebook/students` (→ 6.2) — paginated list
3. Screen render hoy: stat cards → course filter dropdown → search bar → gradebook table
4. Table e dekhay: student info (name, email, avatar), course title, quiz summary (attempted/total + avg %), assignment summary (submitted/total), completion %, last activity, enrolled date

### Stat Cards
1. 4 ta stat card dekhay:
   - Avg Quiz Score: `72.5% ↑ 3.2 vs last month`
   - Avg Completion: `45% ↑ 5.0 vs last month`
   - Pending Assignments: `15` (action needed badge)
   - At-Risk Students: `8` (low completion + inactive warning)
2. Growth delta positive hole green arrow (↑), negative hole red arrow (↓), zero hole gray dash (—)
3. "Pending Assignments" click korle assignment grading queue e navigate kore
4. "At-Risk Students" click korle gradebook list filter hoy — low completion + inactive students dekhay

### Course Filter
1. Gradebook table er upore "Course" filter dropdown thake — default: `All Courses`
2. Page load e dropdown populate hoy → `GET /courses/options` (→ [Course](./04-course.md))
   - Lightweight endpoint — shudhu `{ _id, title }` return kore, alphabetical sorted
   - Response: `[{ "_id": "664b...", "title": "Advanced JavaScript" }, { "_id": "664c...", "title": "Intro to Web Dev" }]`
3. Admin dropdown theke specific course select kore
4. Select korle gradebook table re-fetch hoy → `GET /gradebook/students?courseId=664b...`
5. "All Courses" select korle → `?courseId` param remove hoy, shob student dekhay
6. Course filter + search + sort + pagination eksathe combine kora jay:
   ```
   GET /gradebook/students?courseId=664b...&searchTerm=john&page=1&limit=10
   ```

### Search
1. Search bar e student name ba email diye search korte pare (`searchTerm` query param)
2. Search + course filter eksathe kaj kore — specific course er specific student khunje ber korte pare

### Export
1. "Export" button click → current filter preserved state e export hoy
2. `GET /gradebook/students/export?format=csv&courseId=664b...&searchTerm=john`
3. Same filters gradebook list e jeta active, export eO apply hoy
4. Format: CSV (default) ba XLSX (`?format=xlsx`)

### Edge Cases
- **No enrollments**: Empty state — "No student gradebook data found"
- **No quizzes attempted**: `quizzesAttempted: 0`, `overallQuizPercentage: 0` — frontend "0/5 quizzes" dekhabe
- **No assignments in course**: `totalAssignments: 0`, `assignmentsSubmitted: 0` — frontend assignment column hide korte pare
- **No recent activity**: `lastActivityDate: null` — frontend "Never" ba "No activity" dekhabe
- **Deleted student**: `$unwind` + `$match` silently excludes — correct behavior
- **Course filter + no results**: Empty table with message — "No students found for this course"
- **Export with filters**: Same `buildGradebookPipeline` reuse — filter consistency guaranteed
- **Negative/huge pagination**: Server guards — `page` min 1, `limit` clamped 1-100. Invalid values silently corrected
- **Summary first month**: No previous month data hole `growth: 0, growthType: "no_change"` — misleading spike prevent
- **At-risk thresholds**: `AT_RISK_COMPLETION_THRESHOLD = 20%`, `AT_RISK_INACTIVE_DAYS = 14` — named constants in service, tunable
- **Assignment resubmission**: Status `RETURNED` allows resubmission (new record). `SUBMITTED` and `GRADED` block new submission
- **Concurrent duplicate submissions**: Unique compound index `{ student, lesson, status }` prevents race condition — MongoDB rejects duplicate at DB level
- **searchTerm cap**: Max 200 chars — prevents expensive `$regex` on very long strings

---

<!-- ═══════════ Admin Gradebook APIs ═══════════ -->

### 6.1 Get Gradebook Summary

```
GET /gradebook/students/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Gradebook summary retrieved successfully",
  "data": {
    "avgQuizScore": { "value": 72.5, "growth": 3.2, "growthType": "increase" },
    "avgCompletion": { "value": 45, "growth": 5.0, "growthType": "increase" },
    "pendingAssignments": 15,
    "atRiskStudents": 8
  }
}
```

> **Stat card fields:**
> - `avgQuizScore.value` — all-time avg of graded quiz grades. `growth` — absolute delta (this month avg - last month avg). Frontend: `72.5% ↑ 3.2`
> - `avgCompletion.value` — all active enrollments avg completion %. `growth` — absolute delta vs enrollments created before this month. Frontend: `45% ↑ 5.0`
> - `pendingAssignments` — `AssignmentSubmission` with status `SUBMITTED` (waiting for grading). No growth delta — actionable count
> - `atRiskStudents` — active enrollments with completion < 20% AND inactive > 14 days (or never accessed). No growth delta — warning count
> - `growthType`: `"increase"` = ↑ green, `"decrease"` = ↓ red, `"no_change"` = — gray
> - First month (no previous data): `growth: 0, growthType: "no_change"` — misleading spike prevent

---

### 6.2 Get All Student Gradebook

```
GET /gradebook/students?page=1&limit=10&courseId=664b...&searchTerm=john&status=ACTIVE
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (min: 1) |
| `limit` | number | 10 | Items per page (min: 1, max: 100) |
| `courseId` | ObjectId | — | Filter by course ID (from `/courses/options` dropdown) |
| `searchTerm` | string | — | Search in student name / email |
| `status` | string | `ACTIVE` | Enrollment status filter (`ACTIVE`, `COMPLETED`) |

**Response (200):**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 200, "totalPage": 20 },
  "data": [
    {
      "_id": "664b...",
      "studentName": "John Doe",
      "studentEmail": "john@example.com",
      "studentAvatar": "https://cdn.example.com/avatar.jpg",
      "courseTitle": "Introduction to Web Development",
      "quizzesAttempted": 3,
      "totalQuizzes": 5,
      "overallQuizPercentage": 83.33,
      "assignmentsSubmitted": 2,
      "totalAssignments": 4,
      "completionPercentage": 45,
      "lastActivityDate": "2026-03-26T14:30:00Z",
      "enrolledAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

> **Response fields:**
> - `quizzesAttempted / totalQuizzes` — frontend e "3/5 quizzes" format e render koro
> - `overallQuizPercentage` — attempted quizzes er avg score (graded quiz grades theke calculate)
> - `assignmentsSubmitted / totalAssignments` — frontend e "2/4 assignments" format
> - `lastActivityDate` — `enrollment.progress.lastAccessedAt` theke ashe, null hole "No activity"
> - Default sort: `completionPercentage` descending. `searchTerm` — student name + email e `$regex` match. `courseId` — `$match` e add hoy. `status` default `ACTIVE`.

#### Course Filter Dropdown (Dependency)

```
GET /courses/options
Auth: Bearer {{accessToken}} (STUDENT, SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Course options retrieved successfully",
  "data": [
    { "_id": "6630a1b2c3d4e5f6a7b8c002", "title": "Advanced JavaScript" },
    { "_id": "6630a1b2c3d4e5f6a7b8c001", "title": "Introduction to Web Development" }
  ]
}
```

> **Keno separate endpoint?** Dropdown er jonno full course object (modules, lessons, description) fetch kora waste — shudhu `_id` + `title` lagbe. Ei endpoint lightweight (`.select('_id title')`, `.lean()`), alphabetical sorted, shudhu published courses return kore. Feedback, gradebook, analytics — shob screen e reuse hoy.
>
> **Frontend flow:** Page load → `GET /courses/options` → dropdown populate → user select → `GET /gradebook/students?courseId=664b...` → filtered gradebook

---

### 6.3 Export Student Gradebook

```
GET /gradebook/students/export?format=csv&courseId=664b...&searchTerm=john
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `csv` | Export format: `csv` or `xlsx` |
| `courseId` | ObjectId | — | Filter by course ID (same as list) |
| `searchTerm` | string | — | Search filter (same as list) |
| `status` | string | `ACTIVE` | Enrollment status filter (same as list) |

**Response:** CSV/XLSX file download (streams directly to browser)

**Columns:** Student Name, Email, Course, Quizzes Attempted, Total Quizzes, Quiz Avg %, Assignments Submitted, Total Assignments, Completion %, Last Activity

> Same `buildGradebookPipeline` reuse kore — list e jei filter active, export eO same filter apply hoy. No `$facet` pagination — full result set export hoy.

---

## API Response Design — Field Exposure

### Gradebook List (6.2) + Export (6.3)

| Field | Included | Source | Reason |
|-------|:-:|--------|--------|
| `_id` | Yes | Enrollment `_id` | Row identifier |
| `studentName` | Yes | `users.name` | Admin needs student identity |
| `studentEmail` | Yes | `users.email` | Admin contact/search |
| `studentAvatar` | Yes | `users.profilePicture` | Visual identity in table |
| `courseTitle` | Yes | `courses.title` | Course context |
| `quizzesAttempted` | Yes | `grades` count (QUIZ + GRADED) | "3/5 quizzes" format |
| `totalQuizzes` | Yes | `quizzes` count per course | Total available quizzes |
| `overallQuizPercentage` | Yes | `grades` avg percentage | Quiz performance metric |
| `assignmentsSubmitted` | Yes | `assignmentsubmissions` count | "2/4 assignments" format |
| `totalAssignments` | Yes | `lessons` count (type=ASSIGNMENT) | Total available assignments |
| `completionPercentage` | Yes | `enrollment.progress` | Course progress |
| `lastActivityDate` | Yes | `enrollment.progress.lastAccessedAt` | Engagement tracking |
| `enrolledAt` | Yes | Enrollment `enrolledAt` | Timeline |
| `student` (ObjectId) | No | — | Internal reference — admin doesn't need raw ID |
| `course` (ObjectId) | No | — | Internal reference |
| `enrollment` (ObjectId) | No | — | Internal reference |
| `progress` (full object) | No | — | Internal — only `completionPercentage` + `lastAccessedAt` extracted |
| `__v` | No | — | Mongoose internal |

### Submit Assignment (Student)

| Field | Included | Reason |
|-------|:-:|--------|
| `_id` | Yes | Submission identifier |
| `content` | Yes | User-submitted content |
| `attachments` | Yes | User-submitted files |
| `status` | Yes | Current submission status |
| `submittedAt` | Yes | Submission timestamp |
| `createdAt` | Yes | Record creation |
| `student` | No | Student knows their own ID |
| `course` | No | Context already known |
| `lesson` | No | Context already known |
| `enrollment` | No | Internal reference |
| `updatedAt` | No | Internal tracking |
| `__v` | No | Mongoose internal |

---

## Full Code Audit (2026-03-28)

### Passed — No Fix Needed

| Area | What Checked | Verdict |
|------|-------------|---------|
| **Auth/Roles** | Student routes `auth(STUDENT)`, admin `auth(SUPER_ADMIN)` | Correct role separation ✅ |
| **Middleware chain** | `auth → validateRequest → controller` order | Correct ✅ |
| **catchAsync + sendResponse** | All 5 controllers use both | Correct ✅ |
| **ExportBuilder** | Used in controller (not service), streams to `res` | Correct ✅ |
| **Resubmission logic** | `findOne` filters `{ $in: ['SUBMITTED', 'GRADED'] }` — RETURNED falls through | Correct ✅ |
| **EnrollmentHelper** | `verifyEnrollment` called in `submitAssignment` | Correct ✅ |
| **Growth delta** | `Math.abs()` + `growthType` — same pattern as feedback summary | Correct ✅ |
| **Search filter** | `escapeRegex` applied, case-insensitive `$regex` | Secure ✅ |
| **`$facet` pagination** | Single DB round trip for data + total | Efficient ✅ |
| **All imports used** | No dead imports or unused code | Clean ✅ |
| **Empty states** | Gradebook list, summary — return clean empty responses | Correct ✅ |
| **Deleted user** | `$unwind` + `$match` silently excludes | Correct behavior ✅ |

---

### Issues Found & Fixed

| # | Issue | Severity | Fix Applied |
|---|-------|:--------:|-------------|
| 1 | **`attachments` field missing from Zod validation** — controller passes it but schema didn't define | P0 | Added `attachments: z.array(z.string().min(1)).optional()` to validation |
| 2 | **No pagination guards** — negative limit → `$skip` error, huge limit → OOM | P0 | Added `Math.max(1, page)` + `Math.min(100, Math.max(1, limit))` |
| 3 | **Grade schema no bounds** — negative `score`, `percentage > 100` possible | P1 | Added `min: 0` to score/maxScore, `min: 0, max: 100` to percentage |
| 4 | **Missing index for summary aggregation** — `{ assessmentType, status, createdAt }` | P1 | Added compound index on Grade schema |
| 5 | **`(enrollment as any)._id` unsafe cast** — type safety lost | P1 | Changed to `(enrollment as unknown as { _id: Types.ObjectId })._id` |
| 6 | **Route order** — `/students/export` after `/students` | P1 | Reordered: `/students/summary` → `/students/export` → `/students` |
| 7 | **`content` field no max length** — allows massive payload | P1 | Added `.max(5000)` to Zod validation |
| 8 | **At-risk thresholds hardcoded** — `20%` and `14 days` magic numbers | P2 | Extracted to `AT_RISK_COMPLETION_THRESHOLD` and `AT_RISK_INACTIVE_DAYS` constants |
| 9 | **`submitAssignment` leaks raw `.create()` result** — `__v`, `updatedAt`, internal fields | P2 | Re-fetch with `.select('content attachments status submittedAt createdAt')` |
| 10 | **Race condition — no unique index on AssignmentSubmission** — concurrent requests → duplicates | P1 | Added unique compound index `{ student: 1, lesson: 1, status: 1 }` |
| 11 | **searchTerm no max length** — very long strings could slow `$regex` | P2 | Added `.slice(0, 200)` cap before regex |

---

### Edge Case Audit (2026-03-28)

Full edge case audit — 47 cases examined. False positives filtered out (globalErrorHandler catches invalid ObjectId, $unwind drop is intentional, GET query params don't need validateRequest per project rules).

**Passed (no fix needed):**
- Invalid ObjectId → Mongoose CastError → `globalErrorHandler` catches → proper 400 error ✅
- Deleted course/student → `$unwind` silently excludes orphan data → intentional ✅
- Invalid status enum → empty results, no crash → acceptable ✅
- GET query params without `validateRequest` → standard project pattern, POST/PATCH only ✅
- `content` null/undefined/empty → `content || ''` handles ✅
- `attachments` undefined → `(attachments || [])` handles ✅
- Empty collections (no grades, enrollments) → aggregation returns `[]`, defaults to 0 ✅
- January edge case (month=0) → `new Date(year, -1, 1)` wraps to Dec correctly ✅

---

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/gradebook/gradebook.service.ts` | Business logic, aggregation pipeline, growth delta, at-risk query, pagination, type safety |
| `src/app/modules/gradebook/gradebook.controller.ts` | Response patterns, ExportBuilder, status codes |
| `src/app/modules/gradebook/gradebook.route.ts` | Route order, auth roles, middleware chain |
| `src/app/modules/gradebook/gradebook.validation.ts` | Zod schemas, field constraints |
| `src/app/modules/gradebook/gradebook.model.ts` | Schema bounds, indexes, enum enforcement |
| `src/app/modules/gradebook/gradebook.interface.ts` | Types, enums |
| `src/app/helpers/enrollmentHelper.ts` | Enrollment verification, status check |

---
