# Screen 2: Welcome / Onboarding

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [Course Content](./05-course-content.md)

## UX Flow

### Onboarding Flow (First-time User — No Skip)
1. Registration + OTP verify er por auto-login hoy (→ [Auth 1.2](./01-auth.md))
2. User er `onboardingCompleted: false` thake — client check kore onboarding screen e navigate kore
3. Page load e course list fetch hoy → `GET /courses?page=1&limit=50` (→ 2.1)
4. Student course cards dekhte pay — thumbnail, title, description, enrollmentCount
5. Student **minimum 1 course** select kore (checkbox/tap) — "Get Started" button disabled until ≥1 selected
6. "Get Started" tap → **sequential 2 API call**:
   - `POST /enrollments/bulk` (→ 2.2) — selected courseIds pathay
   - Success hole `PATCH /users/onboarding/complete` (→ 2.3) — flag true set kore
7. Both success → Home screen e navigate
8. Client user state update: `onboardingCompleted = true`

### Returning User (Already Onboarded)
1. Login response e `onboardingCompleted: true` ashe
2. Client directly Home screen e navigate — onboarding screen skip
3. Device reinstall / different phone login koreleo same behavior (server source of truth)

### Edge Case: Mid-onboarding App Close
1. Course select korlo but "Get Started" tap korar age app close hoye gelo
2. Flag still `false` → next open e abar onboarding screen dekhabe
3. **Correct behavior** — intent incomplete, so re-show justified

> **Why sequential (not parallel)**: Enrollment fail kore but onboarding flag already set hole user stuck hobe — re-onboarding kore enroll korte parbe na. Sequential e enrollment fail hole flag false thake, retry possible.
>
> **Why no skip**: UI e skip option nai — onboarding = course enrollment. Minimum 1 course select mandatory.

---

<!-- ═══════════ Onboarding Endpoints ═══════════ -->

### 2.1 Get All Published Courses

```
GET /courses?page=1&limit=50
Auth: None
```

> Public endpoint. Onboarding e `limit=50` diye shob course ekbare load kora hoy.

**Response:**
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "pagination": { "page": 1, "limit": 50, "total": 12, "totalPage": 1 },
  "data": [
    {
      "_id": "664a...",
      "title": "Introduction to Web Development",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "description": "A comprehensive course...",
      "totalLessons": 24,
      "averageRating": 4.5,
      "enrollmentCount": 150
    }
  ]
}
```

---

### 2.2 Bulk Enroll in Courses

```
POST /enrollments/bulk
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{ "courseIds": ["COURSE_ID_1", "COURSE_ID_2"] }
```

> Minimum 1 course required. Already enrolled / unpublished / invalid courseIds silently skip hoy.

**Response (201):**
```json
{
  "success": true,
  "message": "Enrolled in 2 course(s) successfully",
  "data": {
    "enrolledCount": 2,
    "skippedCount": 0
  }
}
```

---

### 2.3 Complete Onboarding

```
PATCH /users/onboarding/complete
Auth: Bearer {{accessToken}}
```

> Call after successful `POST /enrollments/bulk`. Idempotent — already `true` thakle o 200 return korbe (no error). Double-tap ba retry safe.
>
> **Role**: STUDENT only. Non-student role call korle 403.

**Request Body:** `{}` (empty — explicit intent, no payload needed)

**Response (200):**
```json
{
  "success": true,
  "message": "Onboarding completed",
  "data": {
    "onboardingCompleted": true
  }
}
```

---

## Audit & Review Log

### Changes (2026-04-21)

| # | What | Before | After |
|---|------|--------|-------|
| 1 | UX Flow | Skip option documented + "client locally updates flag" | Skip removed (UI e skip nai), flag server-side set via new endpoint |
| 2 | Endpoint 2.3 | Missing — `onboardingCompleted` field had no setter | Added `PATCH /users/onboarding/complete` — STUDENT only, idempotent |
| 3 | Sequencing note | Not documented | Added: sequential call order (bulk enroll → complete onboarding) with rationale |
| 4 | Edge case | Not covered | Added mid-onboarding app close scenario |

> **Implementation pending**: Doc updated first (per user request). Code changes (`user.service.ts`, `user.controller.ts`, `user.route.ts`, `user.validation.ts`, postman) to follow.

### Changes (2026-03-16)

| # | What | Before | After |
|---|------|--------|-------|
| 1 | UX Flow section | Missing | Added Onboarding Flow + Skip Onboarding |
| 2 | Course response (2.1) | Had `slug` field | Removed — code `.select()` e `slug` nai |
| 3 | `onboardingCompleted` note | Not documented | Added note — field exists but no API sets it |

### Files Checked

| File | What Checked |
|------|-------------|
| `src/app/modules/course/course.service.ts:99-115` | `getAllCourses` `.select()` fields — no `slug` |
| `src/app/modules/course/course.controller.ts:38` | Message: "Courses retrieved successfully" |
| `src/app/modules/enrollment/enrollment.service.ts:42-74` | `bulkEnroll` logic — skip duplicates, return counts |
| `src/app/modules/enrollment/enrollment.controller.ts:30` | Message: dynamic "Enrolled in X course(s) successfully" |
| `src/app/modules/user/user.model.ts:85-88` | `onboardingCompleted` field — `default: false`, no setter endpoint |

---

### QA Security Audit (2026-03-16) — 10/11 Fixed

**CRITICAL — Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `enrollmentCount` never incremented on Course | `enrollment.service.ts` | Added `$inc: { enrollmentCount: 1 }` to both single + bulk enroll |

**HIGH — All Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 2 | N+1 queries in `bulkEnroll` — O(3N) sequential DB calls | `enrollment.service.ts` | Rewritten with batch queries — 4 DB calls total regardless of array size |
| 3 | No `.max()` on courseIds array — DoS vector | `enrollment.validation.ts` | Added `.max(20)` limit |
| 4 | Race condition — duplicate key 500 on double-click | `enrollment.service.ts` | Single: catch `11000` → 409 Conflict. Bulk: `insertMany({ ordered: false })` |

**MEDIUM — 4/5 Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | Duplicate courseIds in array not caught | `enrollment.validation.ts` | Added `.refine()` deduplicate check |
| 6 | 201 Created when `enrolledCount: 0` | `enrollment.controller.ts` | Returns 200 with "No new enrollments" when nothing enrolled |
| 7 | RESTRICTED users could enroll | `auth.ts` | Added `RESTRICTED` to blocked statuses in auth middleware |
| 8 | courseIds not validated as ObjectId format | `enrollment.validation.ts` | Added `.regex(/^[0-9a-fA-F]{24}$/)` on each courseId |
| 9 | Query param injection on `GET /courses` | — | Not fixed — PUBLISHED hardcode holds, `$and` semantics prevent bypass. Low real risk |

**LOW — 1/2 Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 10 | Raw `.create()` result returned in single enroll | — | Not fixed — no `select: false` fields on Enrollment model currently |
| 11 | `getCourseByIdentifier` exposed DRAFT/SCHEDULED courses | `course.service.ts` | Added `status: PUBLISHED` filter to both ObjectId and slug queries |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/modules/enrollment/enrollment.service.ts` | Batch bulkEnroll, enrollmentCount increment, race condition catch |
| `src/app/modules/enrollment/enrollment.validation.ts` | ObjectId regex, max(20), deduplicate refine |
| `src/app/modules/enrollment/enrollment.controller.ts` | 200 when enrolledCount=0 |
| `src/app/middlewares/auth.ts` | RESTRICTED added to blocked statuses |
| `src/app/modules/course/course.service.ts` | PUBLISHED filter on getCourseByIdentifier |
