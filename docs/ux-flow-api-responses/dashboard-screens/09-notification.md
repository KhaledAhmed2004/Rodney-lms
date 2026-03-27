# Screen 9: Notification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [User Management](./03-user-management.md)

---

## UX Flow

### Notification Bell (Header)
1. Dashboard header e bell icon thake — always visible
2. Page load e `GET /notifications/admin` (→ 9.1) call hoy
3. Bell icon e `unreadCount` badge dekhay (e.g., `3`)
4. `unreadCount === 0` hole badge hide hoy

### Real-Time Updates (Socket.IO)
1. Admin login korle Socket.IO connect hoy (JWT authenticated)
2. Server-side event fire korle (new student register, course complete, etc.) → admin notification create hoy
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
1. **Single**: Notification click kore → `PATCH /notifications/admin/:id/read` (→ 9.3)
   - Dot/bold remove hoy, `unreadCount` update hoy
2. **All**: "Mark all as read" button click → `PATCH /notifications/admin/read-all` (→ 9.2)
   - Shob notification read hoy, badge `0` hoy/hide hoy

### Notification Types (Admin)
| Type | Trigger | Example Title |
|------|---------|---------------|
| `ADMIN` | System-wide admin notification | "New Student Registered" |
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

<!-- ═══════════ Admin Notification Endpoints ═══════════ -->

### 9.1 Get Admin Notifications

```
GET /notifications/admin?page=1&limit=20&searchTerm=registered&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `sort` | string | `-createdAt` | Sort field |
| `searchTerm` | string | — | Search in `title` and `text` |
| `isRead` | boolean | — | Filter by read status (`true`/`false`) |

**Response (200):**
```json
{
  "success": true,
  "message": "Admin notifications retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "6650n1b2c3d4e5f6a7b8c001",
        "title": "New Student Registered",
        "text": "Rahim Uddin just registered on the platform",
        "type": "ADMIN",
        "isRead": false,
        "createdAt": "2026-03-28T10:15:00Z"
      },
      {
        "_id": "6650n1b2c3d4e5f6a7b8c002",
        "title": "Course Completed",
        "text": "Fatima Akter completed Advanced JavaScript",
        "type": "ADMIN",
        "isRead": false,
        "createdAt": "2026-03-28T09:30:00Z"
      },
      {
        "_id": "6650n1b2c3d4e5f6a7b8c003",
        "title": "New Enrollment",
        "text": "Kamal Hossain enrolled in UI/UX Design Fundamentals",
        "type": "ADMIN",
        "isRead": true,
        "createdAt": "2026-03-27T16:45:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 10, "totalPage": 1 },
    "unreadCount": 2
  }
}
```

> `unreadCount` — separate `countDocuments({ type: 'ADMIN', isRead: false })` query. Bell badge ei value dekhay. Admin notifications `type: 'ADMIN'` diye filter hoy — student notifications separate (`receiver: userId`).

---

### 9.2 Mark All Admin Notifications as Read

```
PATCH /notifications/admin/read-all
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> No request body. Shob unread admin notifications (`type: 'ADMIN', isRead: false`) ekbare read mark kore.

**Response (200):**
```json
{
  "success": true,
  "message": "All admin notifications marked as read",
  "data": { "updated": 2 }
}
```

> `updated` — koto ta notification read mark hoyeche. `0` hole kono unread chilo na.

---

### 9.3 Mark Single Admin Notification as Read

```
PATCH /notifications/admin/:id/read
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> No request body. Single notification read mark kore. `type: 'ADMIN'` check ensure kore admin notification-i update hocche.

**Response (200):**
```json
{
  "success": true,
  "message": "Admin notification marked as read successfully",
  "data": {
    "_id": "6650n1b2c3d4e5f6a7b8c001",
    "title": "New Student Registered",
    "text": "Rahim Uddin just registered on the platform",
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
  "message": "Admin notification not found"
}
```

---

> **Send Notification** feature er detailed doc → [Send Notification](./15-send-notification.md) screen e ache. Endpoint: `POST /notifications/admin/send`.

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

### Initial Creation (2026-03-28)

- UX flow added — bell icon, real-time Socket.IO, notification panel, mark as read, notification types
- 3 admin endpoints documented with query params, realistic responses
- Socket.IO `NOTIFICATION_RECEIVED` event documented with frontend handling guide
- Edge cases documented
