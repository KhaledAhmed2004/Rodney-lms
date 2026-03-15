# Screen 6: Gradebook

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [User Management](./03-user-management.md)

---

### 6.1 Get All Student Gradebook

```
GET /gradebook/students?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 200, "totalPage": 20 },
  "data": [
    {
      "_id": "664b...",
      "studentName": "John Doe",
      "studentEmail": "john@example.com",
      "studentAvatar": "https://cdn.example.com/avatar.jpg",
      "courseTitle": "Introduction to Web Development",
      "quizzes": [
        { "title": "Module 1 Quiz", "percentage": 41.2 }
      ],
      "overallQuizPercentage": 41.2,
      "completionPercentage": 45,
      "enrolledAt": "2026-01-20T10:00:00Z"
    }
  ]
}
```

---

### 6.2 Export Student Gradebook

```
GET /gradebook/students/export?format=csv
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:** CSV/XLSX file download

**Columns:** Student Name, Student Email, Course Title, Quiz Scores, Overall Quiz %, Completion %

---
