# Screen 4: Browse Courses

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course Content](./05-course-content.md), [Home](./03-home.md)

---

### 4.1 Browse Courses with Enrollment Status

```
GET /courses/browse?page=1&limit=10&searchTerm=javascript&sort=-createdAt
Auth: Bearer {{accessToken}} (STUDENT)
```

**Response:**
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPage": 2 },
  "data": [
    {
      "_id": "664a...",
      "title": "JavaScript Basics",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "description": "Learn the fundamentals of JavaScript...",
      "totalLessons": 24,
      "averageRating": 4.5,
      "enrollmentCount": 150,
      "enrollment": {
        "enrollmentId": "664b...",
        "status": "ACTIVE",
        "completionPercentage": 45
      }
    },
    {
      "_id": "664c...",
      "title": "Python for Beginners",
      "thumbnail": "https://cdn.example.com/python.jpg",
      "description": "Start your Python journey...",
      "totalLessons": 18,
      "averageRating": 4.2,
      "enrollmentCount": 89,
      "enrollment": null
    }
  ]
}
```

> `enrollment` is `null` for non-enrolled courses. Enrolled courses include `enrollmentId`, `status`, and `completionPercentage`.

---

### 4.2 Enroll in Course

```
POST /enrollments
Content-Type: application/json
Auth: Bearer {{accessToken}} (STUDENT)
```

**Trigger**: Student clicks "Start Course" on a non-enrolled course card. On success, navigate to `GET /courses/:slug/student-detail`.

**Request Body:**
```json
{ "courseId": "COURSE_ID" }
```

**Response (201):**
```json
{
  "success": true,
  "message": "Enrolled successfully",
  "data": {
    "_id": "664b...",
    "student": "664a...",
    "course": "664a...",
    "status": "ACTIVE",
    "enrolledAt": "2026-03-14T10:00:00Z",
    "completedAt": null,
    "progress": {
      "completedLessons": [],
      "lastAccessedLesson": null,
      "lastAccessedAt": null,
      "completionPercentage": 0
    }
  }
}
```

> **UX Note**: Primary enroll action is here (Browse screen). Detail screen (5.2) also shows "Enroll" button as fallback if `enrollment: null` (for direct URL visitors).

---
