# Screen 2: Welcome / Onboarding

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Browse Courses](./04-browse-courses.md), [Course Content](./05-course-content.md)

---

### 2.1 Get All Published Courses

```
GET /courses?page=1&limit=50
Auth: None
```

**Response:**
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "pagination": { "page": 1, "limit": 50, "total": 12, "totalPage": 1 },
  "data": [
    {
      "_id": "664a...",
      "title": "Introduction to Web Development",
      "slug": "introduction-to-web-development",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "description": "A comprehensive course...",
      "totalLessons": 24,
      "averageRating": 4.5,
      "enrollmentCount": 150
    }
  ]
}
```

---

### 2.2 Bulk Enroll in Courses

```
POST /enrollments/bulk
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{ "courseIds": ["COURSE_ID_1", "COURSE_ID_2"] }
```

**Response (201):**
```json
{
  "success": true,
  "message": "Enrolled in 2 course(s) successfully",
  "data": {
    "enrolledCount": 2,
    "skippedCount": 0
  }
}
```

---
