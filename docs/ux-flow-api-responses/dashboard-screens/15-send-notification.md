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
- **Empty form**: Title ba message empty thakle validation error (Zod)
- **Course not selected**: Audience "Specific Course" but dropdown e kono course select kora hoy nai → "courseId is required" error
- **No enrolled students**: Selected course e kono student nai → "No students enrolled in this course" error
- **Large audience**: 500+ students e send → NotificationBuilder bulk handle kore
- **No sent history**: Empty state — "No notifications sent yet"

---

<!-- ═══════════ Send Notification Endpoint ═══════════ -->

### 15.1 Get Sent History

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
      "course": { "_id": "6630a1b2c3d4e5f6a7b8c001", "title": "Advanced JavaScript" },
      "recipientCount": 28,
      "createdAt": "2026-03-28T14:30:00Z"
    },
    {
      "_id": "6650s1b2c3d4e5f6a7b8c002",
      "title": "Platform Maintenance Scheduled",
      "text": "The platform will be under maintenance on March 30th from 2 AM to 4 AM.",
      "audience": "all",
      "course": null,
      "recipientCount": 156,
      "createdAt": "2026-03-27T10:00:00Z"
    }
  ]
}
```

> `course` populate: shudhu `title` — `audience: "all"` hole `course: null`. `sentBy` response e nai — shudhu admin-i send korte pare, redundant info.

---

### 15.2 Send Notification

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

## Audit & Review Log

### Initial Creation (2026-03-28)

- Send notification feature — 1 endpoint (`POST /notifications/admin/send`)
- UX flow: simple form (title, message, audience), course dropdown for specific course
- Uses `NotificationBuilder` for multi-channel delivery (DB + Socket.IO + Push)
- Validation: Zod `superRefine` for conditional `courseId` requirement
