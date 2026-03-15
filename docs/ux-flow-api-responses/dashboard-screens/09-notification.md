# Screen 9: Notification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [User Management](./03-user-management.md)

---

### 9.1 Get Admin Notifications

```
GET /notifications/admin?page=1&limit=20
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 10, "totalPage": 1 },
  "unreadCount": 2,
  "data": [
    {
      "_id": "664n...",
      "title": "New Student Registered",
      "text": "John Doe just registered on the platform",
      "type": "ADMIN",
      "isRead": false,
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ]
}
```

---

### 9.2 Mark All Admin Notifications as Read

```
PATCH /notifications/admin/read-all
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "data": { "updated": 2 } }
```

---

### 9.3 Mark Admin Notification as Read

```
PATCH /notifications/admin/:id/read
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664n...", "title": "New Student Registered", "isRead": true, "type": "ADMIN" }
}
```

---
