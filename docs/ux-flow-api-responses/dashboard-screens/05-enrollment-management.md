# Screen 5: Enrollment Management

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md)

---

### 5.1 Get All Enrollments

```
GET /enrollments?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 1500, "totalPage": 150 },
  "data": [
    {
      "_id": "664b...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "course": { "title": "Introduction to Web Development", "slug": "intro-web-dev", "thumbnail": "https://..." },
      "status": "ACTIVE",
      "enrolledAt": "2026-01-20T10:00:00Z",
      "completedAt": null,
      "progress": {
        "completedLessons": ["664c..."],
        "lastAccessedLesson": "664c...",
        "lastAccessedAt": "2026-03-14T10:30:00Z",
        "completionPercentage": 45
      }
    }
  ]
}
```

---

### 5.2 Update Enrollment Status

```
PATCH /enrollments/:id/status
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "status": "SUSPENDED" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664b...",
    "student": "664a...",
    "course": "664a...",
    "status": "SUSPENDED",
    "completedAt": null
  }
}
```

---

### 5.3 Get Enrolled Students for Course

```
GET /enrollments/course/:courseId/students?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 150, "totalPage": 15 },
  "data": [
    {
      "_id": "664b...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "status": "ACTIVE",
      "progress": { "completionPercentage": 45 }
    }
  ]
}
```

---
