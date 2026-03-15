# Screen 3: User Management

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [Enrollment Management](./05-enrollment-management.md)

---

### 3.1 Get User Stats

```
GET /users/stats
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": {
      "current": 500,
      "previous": 450,
      "growth": 11.1,
      "trend": "UP"
    },
    "activeStudents": {
      "current": 280,
      "previous": 250,
      "growth": 12,
      "trend": "UP"
    }
  }
}
```

---

### 3.2 Get All Users

```
GET /users?page=1&limit=10&searchTerm=&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 500, "totalPage": 50 },
  "data": [
    {
      "_id": "664a...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": "https://cdn.example.com/avatar.jpg",
      "status": "ACTIVE",
      "role": "STUDENT",
      "verified": true,
      "enrollmentCount": 3,
      "lastActiveDate": "2026-03-14T10:30:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### 3.3 Get User by ID

```
GET /users/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664a...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/avatar.jpg",
    "role": "STUDENT",
    "status": "ACTIVE",
    "verified": true,
    "totalPoints": 450,
    "streak": { "current": 7, "longest": 14, "lastActiveDate": "2026-03-14T10:30:00Z" },
    "lastActiveDate": "2026-03-14T10:30:00Z",
    "courseStats": {
      "total": 3,
      "active": 2,
      "completed": 1,
      "dropped": 0,
      "averageCompletion": 55
    },
    "enrolledCourses": [
      {
        "enrollmentId": "664b...",
        "course": {
          "_id": "664a...",
          "title": "Introduction to Web Development",
          "thumbnail": "https://cdn.example.com/thumb.jpg"
        },
        "enrollmentStatus": "ACTIVE",
        "completionPercentage": 45,
        "enrolledAt": "2026-01-20T10:00:00Z",
        "lastAccessedAt": "2026-03-14T10:30:00Z"
      }
    ]
  }
}
```

---

### 3.4 Block User

```
PATCH /users/:id/block
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": { "_id": "664a...", "name": "John Doe", "status": "RESTRICTED" }
}
```

---

### 3.5 Unblock User

```
PATCH /users/:id/unblock
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "data": { "_id": "664a...", "name": "John Doe", "status": "ACTIVE" }
}
```

---

### 3.6 Update User (Admin)

```
PATCH /users/:id
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "status": "ACTIVE",
  "role": "STUDENT",
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "664a...",
    "name": "Updated Name",
    "email": "newemail@example.com",
    "status": "ACTIVE",
    "role": "STUDENT",
    "verified": true
  }
}
```

---

### 3.7 Delete User (Soft)

```
DELETE /users/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 3.8 Export Users (CSV/XLSX)

```
GET /users/export?format=csv
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:** CSV/XLSX file download (Content-Disposition header)

**Columns:** Name, Email, Status, Role, Verified, Enrollment Count, Last Active Date, Created At

---
