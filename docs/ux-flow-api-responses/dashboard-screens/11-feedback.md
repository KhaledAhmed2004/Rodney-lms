# Screen 11: Feedback

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md)

---

## UX Flow

### Feedback Management
1. Admin "Feedback" e navigate kore (sidebar)
2. Page load e parallel API calls:
   - Summary stats → `GET /feedback/admin/summary` (→ 11.1) — stat cards + rating distribution
   - Feedback list → `GET /feedback/admin/all` (→ 11.2) — paginated list with search/filter/sort
3. Screen render hoy: stat cards (total reviews, avg rating, pending responses) → rating distribution bar → feedback list
4. Each feedback card e dekhay: student info (name, email, avatar), course title, star rating, review text, admin response status
5. **Course filter dropdown**: `GET /courses/options` (→ [Course](./04-course.md)) diye populate — `_id` + `title` only. Select korle `?course=COURSE_ID` diye feedback list filter hoy
6. **Search**: Review text diye search korte pare (`searchTerm` query param)
7. **Sort**: Date ba rating diye sort (default: newest first, `-createdAt`)

### Stat Cards
1. 3 ta stat card dekhay:
   - Total Reviews: `25 ↑ 32% vs last month`
   - Average Rating: `4.2 / 5.0 ↑ 0.3 vs last month`
   - Pending Responses: `5` (action needed badge)
2. Growth delta positive hole green arrow (↑), negative hole red arrow (↓), zero hole gray dash (—)
3. "Pending Responses" card click korle feedback list e filter hoy `adminResponse: null`

### Rating Distribution
1. Bar chart dekhay — ★5 theke ★1 porjonto each rating er count + percentage
2. Admin ekbar dekhe bujhe jay overall sentiment (healthy vs polarized)

### Course Filter
1. Feedback list er upore "Course" filter dropdown thake — default: `All Courses`
2. Page load e dropdown populate hoy → `GET /courses/options` (→ [Course](./04-course.md))
   - Lightweight endpoint — shudhu `{ _id, title }` return kore, alphabetical sorted
   - Response: `[{ "_id": "664b...", "title": "Advanced JavaScript" }, { "_id": "664c...", "title": "Intro to Web Dev" }]`
3. Admin dropdown theke specific course select kore
4. Select korle feedback list re-fetch hoy → `GET /feedback/admin/all?course=664b...`
5. "All Courses" select korle → `?course` param remove hoy, shob feedback dekhay
6. Course filter + search + sort eksathe combine kora jay:
   ```
   GET /feedback/admin/all?course=664b...&searchTerm=great&sort=-rating
   ```

### Feedback Detail
1. Admin list e ekta feedback card click kore
2. Detail view open hoy → `GET /feedback/admin/:id` (→ 11.3)
3. Dekhay: student info (name, email, avatar), course info, star rating, full review text, submission date, admin response (jodi thake)
4. Detail view theke admin respond + delete korte pare

### Admin Response
1. Detail view e "Respond" button click → response modal open
2. Admin response type kore submit → `PATCH /feedback/:id/respond` (→ 11.4)
3. Response added hole `respondedAt` timestamp auto-set hoy
4. Existing response update kora jay (same endpoint call → overwrite)

### Delete Feedback
1. Feedback card e "Delete" button → confirmation modal
2. Confirm korle → `DELETE /feedback/:id` (→ 11.5)
3. Hard delete — permanent removal, no soft delete
4. Delete automatically course rating recalculate kore

### Edge Cases
- **No feedback yet**: Empty state — "No feedback received yet"
- **Delete feedback**: Permanent removal, recalculates course rating
- **Duplicate review**: Unique index `{ student, course }` — one review per student per course
- **Admin response update**: Same endpoint e abar call korle previous response overwrite hoy — no versioning
- **Course deleted/archived**: Feedback still exists in DB — orphan data (no cascade delete)

---

<!-- ═══════════ Admin Feedback Management ═══════════ -->

### 11.1 Get Feedback Summary

```
GET /feedback/admin/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback summary retrieved successfully",
  "data": {
    "comparisonPeriod": "month",
    "totalReviews": { "value": 25, "growth": 32, "growthType": "increase" },
    "averageRating": { "value": 4.2, "growth": 0.3, "growthType": "increase" },
    "pendingResponses": 5,
    "ratingDistribution": [
      { "rating": 5, "count": 12 },
      { "rating": 4, "count": 6 },
      { "rating": 3, "count": 4 },
      { "rating": 2, "count": 2 },
      { "rating": 1, "count": 1 }
    ]
  }
}
```

> `totalReviews.growth` — `calculateGrowthDynamic` use kore (same pattern as dashboard summary). `averageRating.growth` — absolute delta (0.3), percentage na. `pendingResponses` — `adminResponse: null` count. `ratingDistribution` — always 5 buckets (1-5), missing = 0.

---

### 11.2 Get All Feedback

```
GET /feedback/admin/all?page=1&limit=10&sort=-createdAt&searchTerm=excellent&course=664b...&rating=5
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `sort` | string | `-createdAt` | Sort field (prefix `-` for descending) |
| `searchTerm` | string | — | Search in review text |
| `course` | ObjectId | — | Filter by course ID |
| `rating` | number | — | Filter by star rating (1-5) |

**Response (200):**
```json
{
  "success": true,
  "message": "All feedback retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": [
    {
      "_id": "664o1b2c3d4e5f6a7b8c9d0e",
      "student": {
        "_id": "664a1b2c3d4e5f6a7b8c9d0e",
        "name": "John Doe",
        "email": "john@example.com",
        "profilePicture": "https://cdn.example.com/avatars/john.jpg"
      },
      "course": {
        "_id": "664b1b2c3d4e5f6a7b8c9d0e",
        "title": "Introduction to Web Development",
        "slug": "intro-web-dev"
      },
      "rating": 5,
      "review": "Excellent course! The content was well-structured and easy to follow.",
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-14T14:00:00Z"
    },
    {
      "_id": "664o2c3d4e5f6a7b8c9d0f1",
      "student": {
        "_id": "664a2c3d4e5f6a7b8c9d0f1",
        "name": "Sarah Ahmed",
        "email": "sarah@example.com",
        "profilePicture": "https://cdn.example.com/avatars/sarah.jpg"
      },
      "course": {
        "_id": "664b2c3d4e5f6a7b8c9d0f1",
        "title": "Advanced JavaScript",
        "slug": "advanced-javascript"
      },
      "rating": 3,
      "review": "Good content but needs more practical examples.",
      "adminResponse": "Thank you for the suggestion! We'll add more examples.",
      "respondedAt": "2026-03-15T09:00:00Z",
      "createdAt": "2026-03-13T10:30:00Z"
    }
  ]
}
```

> Student populate: `name email profilePicture`. Course populate: `title slug`. Search: review text e `$regex` match (`QueryBuilder.search(['review'])`). Filter: `?course=ID` ba `?rating=5` — `QueryBuilder.filter()` automatically handle kore, extra code lagbe na.

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
    { "_id": "664b1b2c3d4e5f6a7b8c9d0e", "title": "Advanced JavaScript" },
    { "_id": "664b2c3d4e5f6a7b8c9d0f1", "title": "Introduction to Web Development" }
  ]
}
```

> **Keno separate endpoint?** Dropdown er jonno full course object (modules, lessons, description) fetch kora waste — shudhu `_id` + `title` lagbe. Ei endpoint lightweight (`.select('_id title')`, `.lean()`), alphabetical sorted, shudhu published courses return kore. Feedback chara arekta jaygay-o reuse hoy (enrollment filter, gradebook filter).
>
> **Frontend flow:** Page load → `GET /courses/options` → dropdown populate → user select → `GET /feedback/admin/all?course=664b...` → filtered feedback list

---

### 11.3 Get Feedback by ID

```
GET /feedback/admin/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback retrieved successfully",
  "data": {
    "_id": "664o1b2c3d4e5f6a7b8c9d0e",
    "student": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": "https://cdn.example.com/avatars/john.jpg"
    },
    "course": {
      "_id": "664b1b2c3d4e5f6a7b8c9d0e",
      "title": "Introduction to Web Development",
      "slug": "intro-web-dev"
    },
    "rating": 5,
    "review": "Excellent course! The content was well-structured and easy to follow.",
    "adminResponse": null,
    "respondedAt": null,
    "createdAt": "2026-03-14T14:00:00Z"
  }
}
```

**Error — Not Found (404):**
```json
{
  "success": false,
  "message": "Feedback not found"
}
```

---

### 11.4 Respond to Feedback

```
PATCH /feedback/:id/respond
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "adminResponse": "Thank you for your feedback! We appreciate your kind words."
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `adminResponse` | string | Yes | 1–5000 chars |

> Calling again overwrites previous response. `respondedAt` auto-set to current timestamp on each call.

**Response (200):**
```json
{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "_id": "664o1b2c3d4e5f6a7b8c9d0e",
    "adminResponse": "Thank you for your feedback! We appreciate your kind words.",
    "respondedAt": "2026-03-15T09:00:00Z"
  }
}
```

**Error — Not Found (404):**
```json
{
  "success": false,
  "message": "Feedback not found"
}
```

---

### 11.5 Delete Feedback

```
DELETE /feedback/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Hard delete — permanent. Automatically recalculates course `averageRating` and `ratingsCount`.

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback deleted successfully"
}
```

**Error — Not Found (404):**
```json
{
  "success": false,
  "message": "Feedback not found"
}
```

---

## Frontend Demo Data

> Realistic test data — shob state cover kore. Frontend ei data diye mock/test korte parbe.

### Demo: Summary (11.1)

```json
{
  "success": true,
  "message": "Feedback summary retrieved successfully",
  "data": {
    "comparisonPeriod": "month",
    "totalReviews": { "value": 47, "growth": 23.68, "growthType": "increase" },
    "averageRating": { "value": 3.8, "growth": 0.2, "growthType": "increase" },
    "pendingResponses": 12,
    "ratingDistribution": [
      { "rating": 5, "count": 15 },
      { "rating": 4, "count": 12 },
      { "rating": 3, "count": 9 },
      { "rating": 2, "count": 7 },
      { "rating": 1, "count": 4 }
    ]
  }
}
```

### Demo: Feedback List (11.2) — All States

```json
{
  "success": true,
  "message": "All feedback retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 47, "totalPage": 5 },
  "data": [
    {
      "_id": "6650a1b2c3d4e5f6a7b8c001",
      "student": {
        "_id": "6640a1b2c3d4e5f6a7b8c001",
        "name": "Rahim Uddin",
        "email": "rahim@example.com",
        "profilePicture": "https://cdn.example.com/avatars/rahim.jpg"
      },
      "course": {
        "_id": "6630a1b2c3d4e5f6a7b8c001",
        "title": "Introduction to Web Development",
        "slug": "intro-web-dev"
      },
      "rating": 5,
      "review": "Excellent course! The projects were very practical and the instructor explained complex concepts simply. Highly recommend for beginners.",
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-25T09:15:00Z"
    },
    {
      "_id": "6650a1b2c3d4e5f6a7b8c002",
      "student": {
        "_id": "6640a1b2c3d4e5f6a7b8c002",
        "name": "Fatima Akter",
        "email": "fatima@example.com",
        "profilePicture": "https://cdn.example.com/avatars/fatima.jpg"
      },
      "course": {
        "_id": "6630a1b2c3d4e5f6a7b8c002",
        "title": "Advanced JavaScript",
        "slug": "advanced-javascript"
      },
      "rating": 4,
      "review": "Great course overall. Loved the async/await section. Would appreciate more real-world project examples.",
      "adminResponse": "Thank you Fatima! We're adding 3 new project modules next month. Stay tuned!",
      "respondedAt": "2026-03-24T14:30:00Z",
      "createdAt": "2026-03-22T11:45:00Z"
    },
    {
      "_id": "6650a1b2c3d4e5f6a7b8c003",
      "student": {
        "_id": "6640a1b2c3d4e5f6a7b8c003",
        "name": "Kamal Hossain",
        "email": "kamal@example.com",
        "profilePicture": null
      },
      "course": {
        "_id": "6630a1b2c3d4e5f6a7b8c001",
        "title": "Introduction to Web Development",
        "slug": "intro-web-dev"
      },
      "rating": 2,
      "review": "Course content is outdated. Some videos are from 2023 and use deprecated methods. Needs a major update.",
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-20T16:20:00Z"
    },
    {
      "_id": "6650a1b2c3d4e5f6a7b8c004",
      "student": {
        "_id": "6640a1b2c3d4e5f6a7b8c004",
        "name": "Nusrat Jahan",
        "email": "nusrat@example.com",
        "profilePicture": "https://cdn.example.com/avatars/nusrat.jpg"
      },
      "course": {
        "_id": "6630a1b2c3d4e5f6a7b8c003",
        "title": "UI/UX Design Fundamentals",
        "slug": "uiux-design-fundamentals"
      },
      "rating": 1,
      "review": "Very disappointed. The quizzes don't match the lesson content at all. Felt like I wasted my time.",
      "adminResponse": "We're sorry to hear that, Nusrat. We've flagged this with the content team and will review all quizzes. Thank you for the feedback.",
      "respondedAt": "2026-03-19T10:00:00Z",
      "createdAt": "2026-03-18T08:30:00Z"
    },
    {
      "_id": "6650a1b2c3d4e5f6a7b8c005",
      "student": {
        "_id": "6640a1b2c3d4e5f6a7b8c005",
        "name": "Arif Rahman",
        "email": "arif@example.com",
        "profilePicture": "https://cdn.example.com/avatars/arif.jpg"
      },
      "course": {
        "_id": "6630a1b2c3d4e5f6a7b8c002",
        "title": "Advanced JavaScript",
        "slug": "advanced-javascript"
      },
      "rating": 3,
      "review": "Decent course. Good for intermediate learners but the pace is too fast for some sections. Closures chapter needs better examples.",
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-15T13:00:00Z"
    }
  ]
}
```

> **States covered:**
> - ★5 — positive, no admin response (pending) — `Rahim`
> - ★4 — positive, admin responded — `Fatima`
> - ★2 — negative, no response (urgent!) — `Kamal`
> - ★1 — negative, admin responded (damage control) — `Nusrat`
> - ★3 — neutral, no response — `Arif`
> - `profilePicture: null` — no avatar case — `Kamal`
> - Multiple courses — same course e multiple reviews (Intro Web Dev: Rahim + Kamal)

### Demo: Respond (11.4)

**Request:**
```json
{
  "adminResponse": "Thank you for your honest feedback, Kamal. We've scheduled a content update for next month — all deprecated methods will be replaced with modern alternatives."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "_id": "6650a1b2c3d4e5f6a7b8c003",
    "adminResponse": "Thank you for your honest feedback, Kamal. We've scheduled a content update for next month — all deprecated methods will be replaced with modern alternatives.",
    "respondedAt": "2026-03-28T11:30:00Z"
  }
}
```

### Demo: Course Options (Dropdown)

```json
{
  "success": true,
  "message": "Course options retrieved successfully",
  "data": [
    { "_id": "6630a1b2c3d4e5f6a7b8c002", "title": "Advanced JavaScript" },
    { "_id": "6630a1b2c3d4e5f6a7b8c001", "title": "Introduction to Web Development" },
    { "_id": "6630a1b2c3d4e5f6a7b8c004", "title": "Python for Data Science" },
    { "_id": "6630a1b2c3d4e5f6a7b8c003", "title": "UI/UX Design Fundamentals" }
  ]
}
```

### Demo: Empty State (No Feedback Yet)

```json
{
  "success": true,
  "message": "Feedback summary retrieved successfully",
  "data": {
    "comparisonPeriod": "month",
    "totalReviews": { "value": 0, "growth": 0, "growthType": "no_change" },
    "averageRating": { "value": 0, "growth": 0, "growthType": "no_change" },
    "pendingResponses": 0,
    "ratingDistribution": [
      { "rating": 5, "count": 0 },
      { "rating": 4, "count": 0 },
      { "rating": 3, "count": 0 },
      { "rating": 2, "count": 0 },
      { "rating": 1, "count": 0 }
    ]
  }
}
```

```json
{
  "success": true,
  "message": "All feedback retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPage": 0 },
  "data": []
}
```

### Demo: Student Create Feedback (App-Side)

**Request:**
```
POST /feedback
Auth: Bearer {{studentAccessToken}}
Content-Type: application/json
```

```json
{
  "courseId": "6630a1b2c3d4e5f6a7b8c001",
  "rating": 5,
  "review": "Best course I've taken so far! The hands-on projects really helped me understand the concepts."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "_id": "6650a1b2c3d4e5f6a7b8c006",
    "rating": 5,
    "review": "Best course I've taken so far! The hands-on projects really helped me understand the concepts.",
    "createdAt": "2026-03-28T14:00:00Z"
  }
}
```

**Error — Already Reviewed (409):**
```json
{
  "success": false,
  "message": "You have already reviewed this course"
}
```

**Error — Not Enrolled (403):**
```json
{
  "success": false,
  "message": "You are not enrolled in this course"
}
```

---

## API Response Design — Field Exposure (Admin)

| Field | Get All | Get by ID | Respond | Reason |
|-------|:-:|:-:|:-:|--------|
| `_id` | Yes | Yes | Yes | Identifier for all operations |
| `student` | Yes (populated) | Yes (populated) | No | List + detail e student info dorkar |
| `course` | Yes (populated) | Yes (populated) | No | List + detail e course context dorkar |
| `enrollment` | No | No | No | Internal reference — admin doesn't need |
| `rating` | Yes | Yes | No | List + detail display |
| `review` | Yes | Yes | No | List + detail display |
| `adminResponse` | Yes | Yes | Yes | Existing response + updated value |
| `respondedAt` | Yes | Yes | Yes | Response timestamp |
| `createdAt` | Yes | Yes | No | Submission date |
| `updatedAt` | No | No | No | Internal tracking |
| `__v` | No | No | No | Mongoose internal — never expose |

---

## Integration Points

### Course Rating Recalculation

Create ba delete — ei action gula te course rating auto-update hoy:

```
Action (create / delete)
    ↓
recalculateCourseRating(courseId)
    ↓
Feedback.aggregate([
  { $match: { course: new Types.ObjectId(courseId) } },
  { $group: { averageRating: { $avg: '$rating' }, ratingsCount: { $sum: 1 } } }
])
    ↓
Course.findByIdAndUpdate({ averageRating, ratingsCount })
```

> All feedback counts towards course rating. No publish/unpublish concept.

### Related Student/Public Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/feedback` | POST | STUDENT | Submit review (one per course, requires enrollment) |
| `/feedback/my-reviews` | GET | STUDENT | Student er nijer shob reviews |
| `/feedback/course/:courseId` | GET | PUBLIC | Course er shob reviews |

---

## Full Code Audit (2026-03-28)

### Passed — No Fix Needed ✅

| Area | What Checked | Verdict |
|------|-------------|---------|
| **Auth/Roles** | Student routes `auth(STUDENT)`, admin `auth(SUPER_ADMIN)`, public `GET /course/:courseId` | Correct role separation |
| **Route order** | Fixed paths (`/admin/all`, `/admin/summary`) before param paths (`/admin/:id`) | Correct — no route shadowing |
| **HTTP methods** | POST create, GET read, PATCH update, DELETE remove | RESTful ✅ |
| **Middleware chain** | `auth → validateRequest → controller` order | Correct ✅ |
| **Validation coverage** | `POST /` + `PATCH /:id/respond` — both have `validateRequest()` | Correct ✅ |
| **Response shaping** | All endpoints have proper `.select()` — no `enrollment`, `updatedAt`, `__v` leak | Clean ✅ |
| **PATCH responses** | `respondToFeedback` returns `{ _id, adminResponse, respondedAt }` only — no full doc | Lean ✅ |
| **Create response** | Re-fetch after `.create()` — returns `{ _id, rating, review, createdAt }` | Correct — `.create()` bypass handled |
| **Summary endpoint** | Doc vs code response shape match, empty state clean, first-month edge case handled, `AggregationBuilder` reuse | Production-ready ✅ |
| **Unique index** | `{ student: 1, course: 1 }` unique — prevents duplicate reviews | Correct ✅ |
| **Index coverage** | `{ course: 1 }` for `getByCourse` + rating recalc, compound covers `student` queries | Efficient ✅ |
| **Public endpoint data** | `GET /course/:courseId` — student name + avatar + `adminResponse` exposed | Standard pattern (Amazon/Google reviews) |
| **My reviews** | `getMyReviews` — excludes `student` field (own ID, redundant) | Clean ✅ |
| **Empty states** | All list endpoints — return `{ data: [], pagination }` when empty | Correct ✅ |
| **Invalid ObjectId** | `params.id` invalid → Mongoose CastError → `globalErrorHandler` catches | Acceptable ✅ |

---

### Issues Found & Fixed ✅

| # | Issue | Severity | Fix Applied |
|---|-------|:--------:|-------------|
| 1 | **`rating` allows decimals** — Zod `z.number().min(1).max(5)` accepts `3.7`. Star rating should be integer-only | P1 | Added `.int()` to Zod validation |
| 2 | **`verifyEnrollment` only checks `ACTIVE`** — COMPLETED course er student feedback dite parbe na | P1 | `verifyEnrollment` e optional `allowedStatuses` param add — feedback e `['ACTIVE', 'COMPLETED']` pass |
| 3 | **`recalculateCourseRating` — string vs ObjectId** — aggregation `$match` e string `courseId` pass hocchilo, Mongoose 7+ auto-casts but fragile | P2 | Explicit `new Types.ObjectId(courseId)` cast add |
| 4 | **`(enrollment as any)._id` unsafe cast** — `any` type diye `_id` access kora type-unsafe | P2 | `(enrollment as unknown as { _id: Types.ObjectId })._id` — proper cast |
| 5 | **Stale comment** — "recalculate course rating from published feedback" — published concept removed | P3 | Comment updated |

---

### Remaining Issues — Not Fixed

| # | Issue | Impact | Priority | Note |
|---|-------|--------|:--------:|------|
| 1 | **`{ rating: 1 }` standalone index** — low-cardinality field (5 values). Sorting diye use hoy but compound `{ course: 1, rating: -1 }` better hoto | Marginal perf impact | P3 | Current volume te issue na — scale korle optimize |
| 2 | **`enrollment` field YAGNI** — schema te stored but no endpoint exposes it, no query uses it. Unique index `{ student, course }` already duplicate prevent kore | Dead data | P3 | Analytics er jonno future e dorkar hote pare — keep for now |
| 3 | **Race condition (TOCTOU)** — `createFeedback` e `findOne` check + `create` er moddhe gap. 2 concurrent request e both pass kore create korte parbe. Unique index second ta catch korbe but error message generic (E11000 → globalErrorHandler) | Clean error message missing for rare case | P3 | Unique index is the real guard — `findOne` is UX only |
| 4 | **No student edit/delete own review** | Feature gap — most platforms allow | P2 | Business decision — needs confirmation |
| 5 | **No admin response clear/delete** | Ekbar response dile remove kora jay na | P3 | Low priority |
| 6 | **No course/rating filter in admin list** | Admin shudhu `searchTerm` diye search korte pare | P2 | QueryBuilder `.filter()` ache — frontend e query param pass korle automatically kaj korbe |
| 7 | **No cascade on course delete** | Course delete korle orphan feedback theke jay | P2 | Course module e pre-delete hook add korte hobe |

---

### Audit History

**Initial Creation (2026-03-27)**
- Dashboard-focused feedback documentation created
- Format follows gamification.md comprehensive structure

**Response Shaping + Feature Cleanup (2026-03-28)**
- `togglePublish` endpoint + `isPublished` field completely removed (not needed)
- Response shaping fixed: all 7 endpoints e `.select()` / lean response applied
- `GET /admin/:id` detail endpoint added

**Full Code Audit (2026-03-28)**
- 5 issues found and fixed (rating validation, enrollment status, ObjectId cast, type safety, stale comment)
- 7 remaining issues documented with priority
- `enrollmentHelper.ts` e backward-compatible `allowedStatuses` param added

**Summary Endpoint Added + Audit (2026-03-28)**
- `GET /feedback/admin/summary` added — stat cards + rating distribution
- Uses `calculateGrowthDynamic` (AggregationBuilder reuse) + 3x `AggregationBuilder` chain + `countDocuments`
- Edge case fixed: first month e previous rating data na thakle `averageRating.growth: 0, growthType: "no_change"` return kore — misleading "↑ 4.2" prevent
- Doc vs code response shape verified ✅ — exact match
- Empty state verified ✅ — all zeros, 5 distribution buckets with `count: 0`
- Route order verified ✅ — `/admin/summary` before `/admin/:id`

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/feedback/feedback.service.ts` | Business logic, queries, response shaping, aggregation, type safety |
| `src/app/modules/feedback/feedback.controller.ts` | Handler pattern, sendResponse, status codes |
| `src/app/modules/feedback/feedback.route.ts` | Auth roles, middleware chain, route order, validation coverage |
| `src/app/modules/feedback/feedback.validation.ts` | Zod schemas, field constraints, data types |
| `src/app/modules/feedback/feedback.model.ts` | Schema fields, indexes, defaults |
| `src/app/modules/feedback/feedback.interface.ts` | TypeScript types |
| `src/app/helpers/enrollmentHelper.ts` | Enrollment verification, status check |
| `src/app/modules/course/course.model.ts` | `averageRating` + `ratingsCount` fields confirmed |
| `src/app/modules/enrollment/enrollment.interface.ts` | Enrollment statuses (ACTIVE, COMPLETED, SUSPENDED) |
