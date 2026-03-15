# Screen 11: Feedback

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md)

---

### 11.1 Get All Feedback

```
GET /feedback/admin/all?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": [
    {
      "_id": "664o...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "course": { "title": "Introduction to Web Development", "slug": "intro-web-dev" },
      "rating": 5,
      "review": "Excellent course!",
      "isPublished": false,
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-14T14:00:00Z"
    }
  ]
}
```

---

### 11.2 Toggle Publish

```
PATCH /feedback/:id/publish
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664o...", "isPublished": true, "rating": 5, "review": "Excellent course!" }
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
{ "adminResponse": "Thank you for your feedback!" }
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664o...", "adminResponse": "Thank you for your feedback!", "respondedAt": "2026-03-15T09:00:00Z" }
}
```

---

### 11.4 Delete Feedback

```
DELETE /feedback/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Feedback deleted successfully" }
```

---
