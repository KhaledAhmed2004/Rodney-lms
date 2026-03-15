# Screen 2: Overview

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Analytics](./10-analytics.md), [User Management](./03-user-management.md)

---

### 2.1 Get Dashboard Summary

```
GET /dashboard/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 500,
    "totalCourses": 12,
    "totalEnrollments": 1500,
    "completedEnrollments": 350,
    "completionRate": 23.3,
    "activeStudents": 280
  }
}
```

---

### 2.2 Get Trends

```
GET /dashboard/trends
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentTrends": [
      { "_id": { "year": 2026, "month": 1 }, "count": 120 },
      { "_id": { "year": 2026, "month": 2 }, "count": 145 },
      { "_id": { "year": 2026, "month": 3 }, "count": 160 }
    ],
    "userTrends": [
      { "_id": { "year": 2026, "month": 1 }, "count": 50 },
      { "_id": { "year": 2026, "month": 2 }, "count": 65 },
      { "_id": { "year": 2026, "month": 3 }, "count": 80 }
    ]
  }
}
```

---

### 2.3 Get Recent Activity

```
GET /dashboard/recent-activity
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recentEnrollments": [
      {
        "_id": "664b...",
        "student": { "name": "John Doe", "profilePicture": "https://..." },
        "course": { "title": "Introduction to Web Development" },
        "createdAt": "2026-03-14T10:00:00Z"
      }
    ],
    "recentCompletions": [
      {
        "_id": "664b...",
        "student": { "name": "Jane Smith", "profilePicture": "https://..." },
        "course": { "title": "JavaScript Basics" },
        "completedAt": "2026-03-14T09:00:00Z"
      }
    ],
    "recentQuizAttempts": [
      {
        "_id": "664e...",
        "student": { "name": "John Doe", "profilePicture": "https://..." },
        "quiz": { "title": "Module 1 Quiz" },
        "completedAt": "2026-03-14T11:20:00Z"
      }
    ]
  }
}
```

---
