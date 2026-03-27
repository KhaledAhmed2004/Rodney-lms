# Screen 11: Feedback

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md)

---

## UX Flow

### Feedback Management
1. Admin "Feedback" e navigate kore (sidebar)
2. Page load → `GET /feedback/admin/all` (→ 11.1) — paginated feedback list with search/filter/sort
3. Each feedback card e dekhay: student info (name, email, avatar), course title, star rating, review text, publish badge, admin response status
4. **Search**: Review text diye search korte pare (`searchTerm` query param)
5. **Sort**: Date ba rating diye sort (default: newest first, `-createdAt`)

### Publish Control
1. Each feedback e publish/unpublish toggle — `PATCH /feedback/:id/publish` (→ 11.2)
2. Unpublish korle public course page theke hide hoy
3. Publish/unpublish automatically course er `averageRating` + `ratingsCount` recalculate kore

### Admin Response
1. Feedback card e "Respond" button click → response modal open
2. Admin response type kore submit → `PATCH /feedback/:id/respond` (→ 11.3)
3. Response added hole `respondedAt` timestamp auto-set hoy
4. Existing response update kora jay (same endpoint call → overwrite)

### Delete Feedback
1. Feedback card e "Delete" button → confirmation modal
2. Confirm korle → `DELETE /feedback/:id` (→ 11.4)
3. Hard delete — permanent removal, no soft delete
4. Delete automatically course rating recalculate kore

### Edge Cases
- **No feedback yet**: Empty state — "No feedback received yet"
- **Unpublish feedback**: Hides from public course reviews, recalculates course average rating (only published count)
- **Delete feedback**: Permanent removal, recalculates course rating
- **Duplicate review**: Unique index `{ student, course }` — one review per student per course
- **Admin response update**: Same endpoint e abar call korle previous response overwrite hoy — no versioning
- **Rating recalculation**: Only `isPublished: true` reviews count in course average
- **Course deleted/archived**: Feedback still exists in DB — orphan data (no cascade delete)

---

<!-- ═══════════ Admin Feedback Management ═══════════ -->

### 11.1 Get All Feedback

```
GET /feedback/admin/all?page=1&limit=10&sort=-createdAt&searchTerm=excellent
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `sort` | string | `-createdAt` | Sort field (prefix `-` for descending) |
| `searchTerm` | string | — | Search in review text |

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
      "isPublished": true,
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
      "isPublished": false,
      "adminResponse": "Thank you for the suggestion! We'll add more examples.",
      "respondedAt": "2026-03-15T09:00:00Z",
      "createdAt": "2026-03-13T10:30:00Z"
    }
  ]
}
```

> Student populate: `name email profilePicture`. Course populate: `title slug`. Search: review text e `$regex` match (`QueryBuilder.search(['review'])`).

---

### 11.2 Toggle Publish

```
PATCH /feedback/:id/publish
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> No request body — automatically toggles `isPublished` between `true` ↔ `false`. Triggers course `averageRating` + `ratingsCount` recalculation.

**Response (200):**
```json
{
  "success": true,
  "message": "Feedback publish status toggled",
  "data": {
    "_id": "664o1b2c3d4e5f6a7b8c9d0e",
    "isPublished": true,
    "rating": 5,
    "review": "Excellent course!"
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

### 11.3 Respond to Feedback

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

### 11.4 Delete Feedback

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

## API Response Design — Field Exposure (Admin)

| Field | Get All | Toggle Publish | Respond | Reason |
|-------|:-:|:-:|:-:|--------|
| `_id` | Yes | Yes | Yes | Identifier for all operations |
| `student` | Yes (populated) | No | No | Admin needs student info in list only |
| `course` | Yes (populated) | No | No | Admin needs course context in list only |
| `enrollment` | No | No | No | Internal reference — admin doesn't need |
| `rating` | Yes | Yes | No | List display + toggle context |
| `review` | Yes | Yes | No | List display + toggle context |
| `isPublished` | Yes | Yes | No | Status display + toggle confirmation |
| `adminResponse` | Yes | No | Yes | Existing response in list + updated value |
| `respondedAt` | Yes | No | Yes | Response timestamp |
| `createdAt` | Yes | No | No | Submission date — list only |
| `updatedAt` | No | No | No | Internal tracking — not useful for admin |
| `__v` | No | No | No | Mongoose internal — never expose |

---

## Integration Points

### Course Rating Recalculation

Publish toggle, unpublish, ba delete — protita action e course rating auto-update hoy:

```
Action (publish / unpublish / delete)
    ↓
recalculateCourseRating(courseId)
    ↓
Feedback.aggregate([
  { $match: { course: courseId, isPublished: true } },
  { $group: { averageRating: { $avg: '$rating' }, ratingsCount: { $sum: 1 } } }
])
    ↓
Course.findByIdAndUpdate({ averageRating, ratingsCount })
```

> **Important**: Shudhu `isPublished: true` reviews count kore. Unpublished reviews course average e reflect hoy na.

### Related Student/Public Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/feedback` | POST | STUDENT | Submit review (one per course, requires enrollment) |
| `/feedback/my-reviews` | GET | STUDENT | Student er nijer shob reviews |
| `/feedback/course/:courseId` | GET | PUBLIC | Course er published reviews |

---

## Current Code Issues

### Response Shaping Missing

Code e `.select()` apply kora hoy nai — response e unnecessary fields leak hocche:

| # | Endpoint | Issue |
|---|----------|-------|
| 1 | `GET /admin/all` | `enrollment` (raw ObjectId), `updatedAt`, `__v` leak |
| 2 | `PATCH /:id/publish` | Full document return — no populate, no select. Raw ObjectIds (student, course, enrollment) + `updatedAt`, `__v` shob ashche |
| 3 | `PATCH /:id/respond` | Same as #2 — full document, no select |
| 4 | `GET /course/:courseId` (public) | `enrollment`, `isPublished` (always true — redundant), `updatedAt`, `__v` leak |
| 5 | `GET /my-reviews` (student) | `student` (own ID — redundant), `enrollment`, `updatedAt`, `__v` leak |
| 6 | `POST /` (student create) | Raw `Feedback.create()` result — `updatedAt`, `__v` leak (`.create()` bypasses `select: false`) |

### Missing Features

| Gap | Impact | Priority |
|-----|--------|----------|
| **No filter by rating/course/publish status** | Admin shudhu `searchTerm` diye search korte pare, structured filter nai | P2 |
| **No cascade on course delete** | Course delete korle orphan feedback theke jay | P2 |
| **No admin response clear/delete** | Ekbar response dile remove kora jay na | P3 |
| **No bulk publish/unpublish** | Admin ke ekta ekta korte hoy — large dataset e slow | P3 |

---

## Audit & Review Log

### Initial Creation (2026-03-27)

- Dashboard-focused feedback management documentation
- Covers: Admin UX flow, 4 admin endpoints, field exposure table, integration points, code issues
- Format follows gamification.md comprehensive structure

### Files Analyzed

| File | What Checked |
|------|-------------|
| `src/app/modules/feedback/feedback.service.ts` | Business logic, populate, select, rating recalculation |
| `src/app/modules/feedback/feedback.controller.ts` | Response messages, sendResponse usage |
| `src/app/modules/feedback/feedback.route.ts` | Auth roles, middleware chain, validation |
| `src/app/modules/feedback/feedback.validation.ts` | Zod schemas, field constraints |
| `src/app/modules/feedback/feedback.model.ts` | Schema, indexes, field definitions |
| `src/app/modules/feedback/feedback.interface.ts` | TypeScript types |
