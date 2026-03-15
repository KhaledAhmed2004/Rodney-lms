# Screen 10: Analytics

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Overview](./02-overview.md)

---

### 10.1 User Engagement

```
GET /analytics/user-engagement
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "date": "2026-03-01", "activeUsers": 45 },
    { "date": "2026-03-02", "activeUsers": 52 },
    { "date": "2026-03-03", "activeUsers": 38 }
  ]
}
```

---

### 10.2 Course Completion

```
GET /analytics/course-completion
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "courseId": "664a...",
      "title": "Introduction to Web Development",
      "totalEnrollments": 150,
      "completedEnrollments": 35,
      "completionRate": 23.3
    }
  ]
}
```

---

### 10.3 Quiz Performance

```
GET /analytics/quiz-performance
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "quizId": "664d...",
      "title": "Module 1 Quiz",
      "avgScore": 65.5,
      "totalAttempts": 120,
      "passRate": 72.5,
      "avgTimeSpent": 1500
    }
  ]
}
```

---

### 10.4 Course Analytics

```
GET /analytics/courses/:courseId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentStats": [
      { "_id": "ACTIVE", "count": 100 },
      { "_id": "COMPLETED", "count": 35 },
      { "_id": "DROPPED", "count": 15 }
    ],
    "progressDistribution": [
      { "_id": 0, "count": 20 },
      { "_id": 25, "count": 30 },
      { "_id": 50, "count": 25 },
      { "_id": 75, "count": 15 },
      { "_id": 100, "count": 35 }
    ]
  }
}
```

---

### 10.5 Student Analytics

```
GET /analytics/students/:studentId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "_id": "664b...",
        "course": { "title": "Introduction to Web Development", "slug": "intro-web-dev" },
        "status": "ACTIVE",
        "progress": { "completionPercentage": 45 },
        "completedAt": null
      }
    ],
    "quizPerformance": {
      "avgScore": 65.5,
      "totalQuizzes": 3,
      "passCount": 2
    },
    "activitySummary": {
      "totalDaysActive": 30,
      "totalLessons": 15,
      "totalQuizzes": 3,
      "totalTimeSpent": 45000
    }
  }
}
```

---
