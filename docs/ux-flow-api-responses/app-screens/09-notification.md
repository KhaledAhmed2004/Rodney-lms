# Screen 9: Notification

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Home](./03-home.md)

---

### 9.1 Get Notifications

```
GET /notifications?page=1&limit=20
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPage": 1 },
  "unreadCount": 3,
  "data": [
    {
      "_id": "664n...",
      "receiver": "664a...",
      "title": "New Badge Earned!",
      "text": "You earned the Quiz Master badge",
      "type": "USER",
      "isRead": false,
      "createdAt": "2026-03-14T12:00:00Z"
    }
  ]
}
```

---

### 9.2 Mark All as Read

```
PATCH /notifications/read-all
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedCount": 3,
    "message": "All notifications marked as read"
  }
}
```

---

### 9.3 Mark One as Read

```
PATCH /notifications/:id/read
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664n...",
    "isRead": true
  }
}
```

---
