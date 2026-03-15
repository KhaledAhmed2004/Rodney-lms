# Screen 3: Home

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Browse Courses](./04-browse-courses.md), [Course Content](./05-course-content.md), [Progress](./06-progress.md)

---

### 3.1 Get Home Data

```
GET /student/home
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Home data retrieved successfully",
  "data": {
    "name": "John Doe",
    "points": 450,
    "streak": {
      "current": 7,
      "longest": 14
    },
    "yourProgress": {
      "courseProgress": 65,
      "quizProgress": 80
    },
    "enrolledCourses": [
      {
        "enrollmentId": "664b...",
        "courseId": "664a...",
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "thumbnail": "https://cdn.example.com/thumb.jpg",
        "totalLessons": 24,
        "completionPercentage": 45,
        "status": "ACTIVE"
      }
    ],
    "recentBadges": [
      {
        "name": "Quiz Master",
        "icon": "https://cdn.example.com/badge.png",
        "earnedAt": "2026-03-10T12:00:00Z"
      }
    ]
  }
}
```

---

### 3.2 Get Leaderboard

```
GET /gamification/leaderboard?page=1&limit=10
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPage": 10 },
  "data": [
    {
      "studentId": "664a...",
      "name": "John Doe",
      "profilePicture": "https://cdn.example.com/avatar.jpg",
      "totalPoints": 1250
    }
  ]
}
```

---

### 3.3 Get All Published Courses

```
GET /courses?page=1&limit=10&sort=-createdAt
Auth: None
```

> Same response shape as [2.1](#21-get-all-published-courses)

---
