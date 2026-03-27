# Screen 15: Send Notification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Notification](./09-notification.md), [Course](./04-course.md)

---

## UX Flow

### Send Notification Form
1. Admin "Send Notification" page/modal e navigate kore
2. Form fields:
   - **Title**: text input (required, max 200 chars)
   - **Message**: textarea (required, max 5000 chars)
   - **Audience**: radio/select — `All Students` ba `Specific Course`
3. `Specific Course` select korle course dropdown appear hoy → `GET /courses/options` (→ [Course](./04-course.md)) diye populate
4. Admin "Send" button click → `POST /notifications/admin/send` (→ 15.1)
5. Success: toast "Notification sent to 28 students" + form reset
6. Recipients real-time e notification pabe (Socket.IO + Push + DB save)

### Sent History
1. Admin "Sent History" tab/section e navigate kore
2. Page load → `GET /notifications/admin/sent` (→ 15.2) — paginated list of previously sent notifications
3. Each item dekhay: title, audience (All / course title), recipient count, sent date
4. Admin dekhte pare ki pathiyeche — duplicate send avoid korte pare

### Confirmation Modal
1. Admin "Send" click korle confirmation modal dekhay: "Send to 28 students?"
2. Confirm korle send hoy, cancel korle form e fire ashe

### Edge Cases
- **Empty form**: Title ba message empty thakle validation error (Zod) — "Title is required", "Message is required"
- **Course not selected**: Audience "Specific Course" but dropdown e kono course select kora hoy nai → 400 "courseId is required when audience is course"
- **Course not found**: Valid ObjectId but course exist kore na → 404 "Course not found"
- **No enrolled students**: Course exist kore but kono student enrolled nai → 400 "No students enrolled in this course"
- **Invalid audience value**: `audience: "group"` → Zod validation error — only `"all"` ba `"course"` accepted
- **Large audience**: 500+ students e send → NotificationBuilder bulk handle kore, no timeout
- **No sent history**: Empty state — `{ data: [], pagination: { total: 0 } }`

---

<!-- ═══════════ Send Notification Endpoints ═══════════ -->

### 15.1 Send Notification

```
POST /notifications/admin/send
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body — All Students:**
```json
{
  "title": "Platform Maintenance Scheduled",
  "text": "The platform will be under maintenance on March 30th from 2 AM to 4 AM. Please save your work before then.",
  "audience": "all"
}
```

**Request Body — Specific Course:**
```json
{
  "title": "New Lesson Available",
  "text": "Check out the new lesson on React Hooks in Advanced JavaScript!",
  "audience": "course",
  "courseId": "6630a1b2c3d4e5f6a7b8c001"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 1–200 chars |
| `text` | string | Yes | 1–5000 chars |
| `audience` | string | Yes | `"all"` or `"course"` |
| `courseId` | string | If audience=course | Valid ObjectId |

> Uses `NotificationBuilder` — `.viaDatabase()` + `.viaSocket()` + `.viaPush()`. `audience=all` → `.toRole('STUDENT')`. `audience=course` → enrolled student IDs diye `.toMany(ids)`.

**Response (200):**
```json
{
  "success": true,
  "message": "Notification sent to 28 students",
  "data": { "recipientCount": 28 }
}
```

**Error — No Students (400):**
```json
{
  "success": false,
  "message": "No students enrolled in this course"
}
```

**Error — Course Not Found (404):**
```json
{
  "success": false,
  "message": "Course not found"
}
```

**Error — Missing courseId (400):**
```json
{
  "success": false,
  "message": "courseId is required when audience is course"
}
```

#### Course Filter Dropdown (Dependency)

```
GET /courses/options
Auth: Bearer {{accessToken}} (STUDENT, SUPER_ADMIN)
```

```json
{
  "success": true,
  "message": "Course options retrieved successfully",
  "data": [
    { "_id": "6630a1b2c3d4e5f6a7b8c001", "title": "Advanced JavaScript" },
    { "_id": "6630a1b2c3d4e5f6a7b8c002", "title": "Introduction to Web Development" },
    { "_id": "6630a1b2c3d4e5f6a7b8c003", "title": "Python for Data Science" },
    { "_id": "6630a1b2c3d4e5f6a7b8c004", "title": "UI/UX Design Fundamentals" }
  ]
}
```

---

### 15.2 Get Sent History

```
GET /notifications/admin/sent?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `sort` | string | `-createdAt` | Sort field |
| `searchTerm` | string | — | Search in title and text |
| `audience` | string | — | Filter by audience (`all` or `course`) |

**Response (200):**
```json
{
  "success": true,
  "message": "Sent notification history retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "6650s1b2c3d4e5f6a7b8c001",
      "title": "New Lesson Available",
      "text": "Check out the new lesson on React Hooks in Advanced JavaScript!",
      "audience": "course",
      "courseTitle": "Advanced JavaScript",
      "recipientCount": 28,
      "createdAt": "2026-03-28T14:30:00Z"
    },
    {
      "_id": "6650s1b2c3d4e5f6a7b8c002",
      "title": "Platform Maintenance Scheduled",
      "text": "The platform will be under maintenance on March 30th from 2 AM to 4 AM.",
      "audience": "all",
      "recipientCount": 156,
      "createdAt": "2026-03-27T10:00:00Z"
    }
  ]
}
```

> `courseTitle` — flat string, no ObjectId ref. `audience: "all"` hole field absent. No populate needed — course delete/rename holeo history intact thake.

---

## Audit & Review Log

### Initial Creation (2026-03-28)

- Send notification — `POST /notifications/admin/send` with `NotificationBuilder`
- Sent history — `GET /notifications/admin/sent` with `QueryBuilder`
- `SentNotification` model — flat schema (no ObjectId refs, orphan-proof)
- Validation: Zod `superRefine` for conditional `courseId` requirement

### Code Audit (2026-03-28)

**Doc vs Code match verified ✅:**

| Check | 15.1 Send | 15.2 History |
|-------|:-:|:-:|
| Response fields match | ✅ | ✅ |
| Message strings match | ✅ | ✅ |
| Error responses match | ✅ | N/A |
| Pagination placement | N/A | ✅ top-level |
| Validation constraints match | ✅ | N/A |

**Issues found & fixed:**

| # | Issue | Fix |
|---|-------|-----|
| 1 | Doc section references swapped — UX flow pointed Send → 15.1 but 15.1 was History | Sections reordered: 15.1 = Send (primary), 15.2 = History |
| 2 | Non-existent `courseId` → "No students enrolled" instead of "Course not found" | `Course.findById()` check added — proper error |

**Issues found & fixed (final audit):**

| # | Issue | Fix |
|---|-------|-----|
| 3 | Service fallback `"courseId is required"` — Zod message er sathe mismatch | Changed to `"courseId is required when audience is course"` — exact match |
| 4 | `getSentHistory` e `.filter()` missing — `?audience=course` filter kaj korto na | `.filter()` add + doc e `audience` query param add |

**Passed:**
- Doc vs code: every field, message, status code, constraint — exact match ✅
- API design: industry standard action endpoints (200 for send, pagination for list) ✅
- Response design: flat, clean, no nested objects, no unnecessary data ✅
- Route order: `/admin/sent`, `/admin/send` before `/admin/:id/read` ✅
- Auth: all SUPER_ADMIN ✅
- Validation: Zod `superRefine` conditional + service defense-in-depth ✅
- Parallel queries: `Promise.all([Enrollment.find(), Course.findById()])` ✅
- Schema: flat (no ObjectId refs), `{ createdAt: -1 }` index ✅
- Error handling: `ApiError` everywhere, proper status codes (400/404) ✅
- `NotificationBuilder` reuse: `.toRole()`, `.toMany()`, `.viaDatabase()`, `.viaSocket()`, `.viaPush()` ✅
