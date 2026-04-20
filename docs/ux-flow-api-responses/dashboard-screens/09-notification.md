# Screen 9: Notification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [User Management](./03-user-management.md), [Send Notification](./15-send-notification.md)

---

## UX Flow

### Notification Bell (Header)
1. Dashboard header e bell icon thake — always visible
2. Page load e `GET /notifications` (→ 9.1) call hoy
3. Bell icon e `unreadCount` badge dekhay (e.g., `3`)
4. `unreadCount === 0` hole badge hide hoy

### Real-Time Updates (Socket.IO)
1. Admin login korle Socket.IO connect hoy (JWT authenticated)
2. Server-side event fire korle (new student register, course complete, etc.) → admin notification create hoy (`receiver: adminId`)
3. Client `NOTIFICATION_RECEIVED` event listen kore → instantly bell badge update + notification list e new item add
4. Page refresh chara real-time notification ashe

### Notification Panel
1. Admin bell icon click kore → dropdown/panel open hoy
2. Notification list dekhay — newest first
3. Each notification e:
   - Type icon/badge (enrollment, quiz, system, etc.)
   - Title (bold if unread)
   - Text (truncated, 1-2 lines)
   - Time ago ("2 min ago", "1 hour ago", "Yesterday")
   - Read/unread indicator (dot/bold)
4. **Search**: `?searchTerm=` diye title/text e search korte pare
5. **Pagination**: Scroll korle next page load hoy (`?page=2&limit=20`)

### Mark as Read
1. **Single**: Notification click kore → `PATCH /notifications/:id/read` (→ 9.3)
   - Dot/bold remove hoy, `unreadCount` update hoy
2. **All**: "Mark all as read" button click → `PATCH /notifications/read-all` (→ 9.2)
   - Shob notification read hoy, badge `0` hoy/hide hoy

### Notification Types (Admin)
| Type | Trigger | Example Title |
|------|---------|---------------|
| `ADMIN` | System-wide admin-facing notification | "New Student Registered" |
| `ENROLLMENT` | Student enrolls in course | "New Enrollment: Intro to Web Dev" |
| `COURSE_COMPLETED` | Student completes course | "Course Completed by Rahim Uddin" |
| `QUIZ_GRADED` | Quiz graded/submitted | "Quiz Submitted: Module 1 Quiz" |
| `BADGE_EARNED` | Student earns badge | "Badge Earned: Quiz Master" |
| `SYSTEM` | Platform updates, maintenance | "System Maintenance Scheduled" |

### Edge Cases
- **No notifications**: Empty state — "No notifications yet"
- **All read**: Badge hide, "Mark all as read" button disabled/hidden
- **Real-time + stale data**: Socket event ashe but panel closed — next open e fresh data fetch koro
- **Deleted user notification**: Notification theke jay, user reference orphan hoy — UI te "Unknown User" fallback

---

<!-- ═══════════ Unified Notification Endpoints ═══════════ -->

> **Design note (2026-04-21)**: Ei screen e `/notifications/admin` (alada admin endpoint) nai. Unified `/notifications` endpoint use kora hoy — `receiver: req.user.id` diye filter hoy, so role (STUDENT vs SUPER_ADMIN) doesn't matter for storage. Admin er notifications alada namespace e noy — admin er receiver-bound notifications ei endpoint diye ashe। Broadcast tools (`/admin/send`, `/admin/sent`) alada namespace e — shegulo admin action tool, not notification fetch.

### 9.1 Get My Notifications

```
GET /notifications?page=1&limit=20&searchTerm=registered&sort=-createdAt
Auth: Bearer {{accessToken}} (STUDENT or SUPER_ADMIN)
```

> Authenticated user er nijer notifications return kore (`receiver: req.user.id`). Admin hole admin-bound notifications ashe, student hole student-bound.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `sort` | string | `-createdAt` | Sort field |
| `searchTerm` | string | — | Search in `title` and `text` |
| `isRead` | boolean | — | Filter by read status (`true`/`false`) |
| `type` | string | — | Filter by type (e.g., `ADMIN`, `ENROLLMENT`) |

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "6650n1b2c3d4e5f6a7b8c001",
        "title": "New Student Registered",
        "text": "Rahim Uddin just registered on the platform",
        "receiver": "6640a1b2c3d4e5f6a7b8c001",
        "type": "ADMIN",
        "isRead": false,
        "createdAt": "2026-03-28T10:15:00Z"
      },
      {
        "_id": "6650n1b2c3d4e5f6a7b8c002",
        "title": "Course Completed",
        "text": "Fatima Akter completed Advanced JavaScript",
        "receiver": "6640a1b2c3d4e5f6a7b8c001",
        "type": "COURSE_COMPLETED",
        "isRead": false,
        "createdAt": "2026-03-28T09:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 10, "totalPage": 1 },
    "unreadCount": 2
  }
}
```

> `unreadCount` — separate `countDocuments({ receiver: user.id, isRead: false })` query. Bell badge ei value dekhay.

---

### 9.2 Mark All Notifications as Read

```
PATCH /notifications/read-all
Auth: Bearer {{accessToken}} (STUDENT or SUPER_ADMIN)
```

> No request body. Shob unread notifications (`receiver: user.id, isRead: false`) ekbare read mark kore.

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": { "updated": 2 }
}
```

> `updated` — koto ta notification read mark hoyeche. `0` hole kono unread chilo na.

---

### 9.3 Mark Single Notification as Read

```
PATCH /notifications/:id/read
Auth: Bearer {{accessToken}} (STUDENT or SUPER_ADMIN)
```

> No request body. Single notification read mark kore. `receiver: user.id` check ensure kore nijer notification-i update hocche — onno user er notification manipulate kora possible na।

**Response (200):**
```json
{
  "success": true,
  "message": "Notification Read Successfully",
  "data": {
    "_id": "6650n1b2c3d4e5f6a7b8c001",
    "title": "New Student Registered",
    "text": "Rahim Uddin just registered on the platform",
    "receiver": "6640a1b2c3d4e5f6a7b8c001",
    "type": "ADMIN",
    "isRead": true,
    "createdAt": "2026-03-28T10:15:00Z"
  }
}
```

**Error — Not Found:**
```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

> **Send Notification** (admin broadcast tool) er detailed doc → [Send Notification](./15-send-notification.md). Endpoints: `POST /notifications/admin/send`, `GET /notifications/admin/sent`.

---

## Socket.IO Integration

### Event: `NOTIFICATION_RECEIVED`

Real-time notification — server theke client e push hoy jokhon new notification create hoy:

```json
{
  "notification": {
    "_id": "6650n1b2c3d4e5f6a7b8c004",
    "receiver": "6640a1b2c3d4e5f6a7b8c001",
    "title": "New Student Registered",
    "text": "Arif Rahman just registered on the platform",
    "type": "ADMIN",
    "isRead": false
  },
  "timestamp": "2026-03-28T11:00:00Z"
}
```

> **Frontend handling:**
> 1. `socket.on('NOTIFICATION_RECEIVED', data => ...)` listen koro
> 2. `unreadCount` increment koro (local state)
> 3. Notification list er top e new item add koro (optimistic)
> 4. Bell badge update koro
> 5. Optional: toast/snackbar dekhao briefly

---

## Audit & Review Log

### Refactor (2026-04-21) — Admin Namespace Removed

| # | What | Before | After |
|---|------|--------|-------|
| 1 | `GET /notifications/admin` | Admin-only endpoint, filtered by `type: 'ADMIN'` globally | Removed — use unified `GET /notifications` (filtered by `receiver: user.id`) |
| 2 | `PATCH /notifications/admin/:id/read` | Admin-only, `type: 'ADMIN'` check | Removed — use `PATCH /notifications/:id/read` (receiver check) |
| 3 | `PATCH /notifications/admin/read-all` | Admin-only, global `type: 'ADMIN'` updateMany | Removed — use `PATCH /notifications/read-all` (receiver-scoped) |
| 4 | Filter semantic | `type: 'ADMIN'` (broken — shared across all admins) | `receiver: user.id` (per-user, industry standard) |

**Why refactored**:
- Old `/admin` endpoints er `type: 'ADMIN'` filter **cross-admin data leak** korto — 1 admin read mark korle shob admin er jonno read hoye jeto
- Admin notifications er jonno `receiver` field e actual admin user ID store kora uchit — role-agnostic storage, industry pattern (Slack, Discord, Linear)
- Code duplication remove — 3 admin service methods + 3 controller handlers + 3 routes removed
- `POST /admin/send` + `GET /admin/sent` retained — eta admin **broadcast tools**, not notification fetch (different concern)

**Breaking change**: Frontend dashboard notification screen URLs update lagbe:
- `/notifications/admin` → `/notifications`
- `/notifications/admin/:id/read` → `/notifications/:id/read`
- `/notifications/admin/read-all` → `/notifications/read-all`

**Phase 3 pending**: Admin-bound events (new user register, payment success, enrollment) theke notification create korar shomoy `receiver: adminId` set kora — separate task. Currently admin receiver-bound notification nai, so admin ei endpoint hit korle empty list pabe untill Phase 3 complete hoy.

### Initial Creation (2026-03-28)

- UX flow added — bell icon, real-time Socket.IO, notification panel, mark as read, notification types
- 3 admin endpoints documented with query params, realistic responses
- Socket.IO `NOTIFICATION_RECEIVED` event documented with frontend handling guide
- Edge cases documented
