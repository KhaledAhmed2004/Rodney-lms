# Screen 4: Course

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Quiz Builder](./08-quiz-builder.md), [Enrollment Management](./05-enrollment-management.md)

---

### Courses

#### 4.1 Create Course

```
POST /courses
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Form Data:**
- `title`: "Introduction to Web Development"
- `description`: "A comprehensive course..."
- `status`: "DRAFT"
- `publishScheduledAt`: "2026-04-01T00:00:00Z" (optional)
- `thumbnail`: (file)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664a...",
    "title": "Introduction to Web Development",
    "slug": "introduction-to-web-development",
    "description": "A comprehensive course...",
    "thumbnail": "https://cdn.example.com/thumb.jpg",
    "status": "DRAFT",
    "publishScheduledAt": null,
    "modules": [],
    "totalLessons": 0,
    "totalDuration": 0,
    "averageRating": 0,
    "enrollmentCount": 0,
    "createdAt": "2026-03-14T10:00:00Z",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

---

#### 4.2 Get All Courses (Admin)

```
GET /courses/manage?page=1&limit=10&searchTerm=&sort=-createdAt&status=
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPage": 2 },
  "data": [
    {
      "_id": "664a...",
      "title": "Introduction to Web Development",
      "slug": "introduction-to-web-development",
      "description": "A comprehensive course...",
      "thumbnail": "https://cdn.example.com/thumb.jpg",
      "totalLessons": 24,
      "averageRating": 4.5,
      "enrollmentCount": 150,
      "status": "PUBLISHED",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

#### 4.3 Update Course

```
PATCH /courses/:courseId
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664a...",
    "title": "Updated Course Title",
    "slug": "updated-course-title",
    "description": "Updated course description.",
    "status": "PUBLISHED",
    "thumbnail": "https://cdn.example.com/new-thumb.jpg"
  }
}
```

---

#### 4.4 Delete Course

```
DELETE /courses/:courseId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Course deleted successfully" }
```

---

### Modules

#### 4.5 Add Module

```
POST /courses/:courseId/modules
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "title": "Module 1: Getting Started" }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "moduleId": "uuid-1",
    "title": "Module 1: Getting Started",
    "order": 0
  }
}
```

---

#### 4.6 Reorder Modules

```
PATCH /courses/:courseId/modules/reorder
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "moduleOrder": ["MODULE_ID_1", "MODULE_ID_2", "MODULE_ID_3"] }
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "moduleId": "MODULE_ID_1", "title": "Module 1", "order": 0 },
    { "moduleId": "MODULE_ID_2", "title": "Module 2", "order": 1 },
    { "moduleId": "MODULE_ID_3", "title": "Module 3", "order": 2 }
  ]
}
```

---

#### 4.7 Update Module

```
PATCH /courses/:courseId/modules/:moduleId
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "title": "Updated Module Title" }
```

**Response:**
```json
{
  "success": true,
  "data": { "moduleId": "uuid-1", "title": "Updated Module Title", "order": 0 }
}
```

---

#### 4.8 Delete Module

```
DELETE /courses/:courseId/modules/:moduleId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Module deleted successfully" }
```

---

### Lessons

#### 4.9 Create Lesson

```
POST /courses/:courseId/modules/:moduleId/lessons
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Form Data:**
- `title`: "Introduction to HTML"
- `type`: "VIDEO" | "READING" | "ASSIGNMENT"
- `description`: "Learn the basics..."
- `learningObjectives[]`: "Understand HTML structure"
- `isVisible`: "true" (optional)
- `prerequisiteLesson`: "LESSON_ID" (optional)
- `readingContent`: "<h1>...</h1>" (optional, for READING type)
- `assignmentInstructions`: "..." (optional, for ASSIGNMENT type)
- `contentFile`: (file, optional)
- `attachments`: (file, optional)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664c...",
    "courseId": "664a...",
    "moduleId": "uuid-1",
    "title": "Introduction to HTML",
    "type": "VIDEO",
    "description": "Learn the basics...",
    "learningObjectives": ["Understand HTML structure"],
    "order": 0,
    "isVisible": true,
    "prerequisiteLesson": null,
    "video": {
      "url": "https://cdn.example.com/video.mp4",
      "processingStatus": "COMPLETED",
      "duration": null
    },
    "contentFile": null,
    "readingContent": null,
    "assignmentInstructions": null,
    "attachments": [],
    "createdAt": "2026-03-14T10:00:00Z"
  }
}
```

---

#### 4.10 Reorder Lessons

```
PATCH /courses/:courseId/modules/:moduleId/lessons/reorder
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "lessonOrder": ["LESSON_ID_1", "LESSON_ID_2", "LESSON_ID_3"] }
```

**Response:** Array of lessons with updated `order` values.

---

#### 4.11 Update Lesson

```
PATCH /courses/:courseId/modules/:moduleId/lessons/:lessonId
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:** Updated lesson object.

---

#### 4.12 Delete Lesson

```
DELETE /courses/:courseId/modules/:moduleId/lessons/:lessonId
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Lesson deleted successfully" }
```

---

#### 4.13 Toggle Lesson Visibility

```
PATCH /courses/:courseId/lessons/:lessonId/visibility
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664c...", "title": "Introduction to HTML", "isVisible": false }
}
```

---
