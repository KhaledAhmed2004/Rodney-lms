# Screen 4: Course

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Quiz Builder](./08-quiz-builder.md), [Enrollment Management](./05-enrollment-management.md)

## UX Flow

### Course List Page Load
1. Admin sidebar e "Courses" e click kore
2. Course list load hoy → `GET /courses/manage?page=1&limit=10` (→ 4.2)
3. Table dekhay: thumbnail, title, total lessons, avg rating, enrollment count, status (DRAFT/PUBLISHED), created date
4. Search bar e `searchTerm` diye course title search kora jay
5. Status filter diye DRAFT / PUBLISHED / ARCHIVED filter kora jay

### Create Course
1. Admin "Create Course" button e click kore
2. Form e fill kore:
   - Title (mandatory)
   - Description (optional)
   - Thumbnail upload (file — image)
   - Status select: DRAFT (default) / PUBLISHED
   - Publish schedule date (optional — future date e auto-publish)
3. Submit → `POST /courses` (→ 4.1)
4. Success → course detail page e redirect — empty course (no modules/lessons yet)

> Course create korle initially `modules: []`, `totalLessons: 0`. Module + lesson por e add kore.

### View Course Detail (Module + Lesson Management)
1. Admin course list theke kono course e click kore
2. Course detail page load hoy — course info + module list + each module er lessons
3. **3-level hierarchy dekhay:**
   ```
   Course: "Introduction to Web Development"
   ├── Module 1: Getting Started
   │   ├── Lesson 1: Introduction to HTML (VIDEO)
   │   ├── Lesson 2: CSS Basics (READING)
   │   └── Lesson 3: Module 1 Quiz (QUIZ)
   ├── Module 2: JavaScript Fundamentals
   │   ├── Lesson 1: Variables & Types (VIDEO)
   │   └── Lesson 2: Functions (VIDEO)
   └── Module 3: Advanced Topics
       └── (empty — no lessons yet)
   ```

### Edit Course
1. Course detail page e "Edit" button e click kore
2. Title, description, status, thumbnail edit kore
3. Submit → `PATCH /courses/:courseId` (→ 4.3)
4. Success → updated course detail dekhay

### Manage Modules
Course detail page theke module add/edit/delete/reorder:

**Add Module:**
1. "Add Module" button e click kore
2. Module title input kore
3. Submit → `POST /courses/:courseId/modules` (→ 4.5)
4. New module course er sheshe add hoy (auto order)

**Edit Module:**
1. Module card e edit icon → title edit kore
2. Submit → `PATCH /courses/:courseId/modules/:moduleId` (→ 4.7)

**Reorder Modules:**
1. Drag-and-drop diye module order change kore
2. Drop → `PATCH /courses/:courseId/modules/reorder` (→ 4.6) — ordered moduleId array pathay

**Delete Module:**
1. Module card e delete icon → confirm dialog (module er shob lesson-o delete hobe warning)
2. Confirm → `DELETE /courses/:courseId/modules/:moduleId` (→ 4.8)

### Manage Lessons
Module expand korle lesson list dekhay — lesson add/edit/delete/reorder/visibility:

**Add Lesson:**
1. Module er moddhe "Add Lesson" button e click kore
2. Form e fill kore:
   - Title (mandatory)
   - Type select: VIDEO / READING / QUIZ
   - Description, learning objectives
   - **VIDEO**: video file upload
   - **READING**: rich text content
   - **QUIZ**: existing quiz select kore dropdown theke (Quiz Builder e create kora quiz list dekhabe)
   - Attachments (optional files)
   - Prerequisite lesson (optional — dropdown theke select)
   - Visibility toggle (default: visible)
3. Submit → `POST /courses/:courseId/modules/:moduleId/lessons` (→ 4.9)

**Edit Lesson:**
1. Lesson card e edit icon → form pre-filled thake
2. Change korte chay je fields shegula edit kore
3. Submit → `PATCH /courses/:courseId/modules/:moduleId/lessons/:lessonId` (→ 4.11)

**Reorder Lessons:**
1. Module er moddhe drag-and-drop diye lesson order change kore
2. Drop → `PATCH /courses/:courseId/modules/:moduleId/lessons/reorder` (→ 4.10)

**Toggle Visibility:**
1. Lesson card e visibility toggle (eye icon) e click kore
2. Instant → `PATCH /courses/:courseId/lessons/:lessonId/visibility` (→ 4.13)
3. Response dekhay: visible / hidden state

**Delete Lesson:**
1. Lesson card e delete icon → confirm dialog
2. Confirm → `DELETE /courses/:courseId/modules/:moduleId/lessons/:lessonId` (→ 4.12)

### Delete Course
1. Admin course list / detail page theke delete icon e click kore
2. Confirm dialog dekhay — warning: course er shob modules, lessons, enrollments affected hobe
3. Confirm → `DELETE /courses/:courseId` (→ 4.4)
4. Success → course list e redirect

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
- `type`: "VIDEO" | "READING" | "QUIZ"
- `description`: "Learn the basics..."
- `learningObjectives[]`: "Understand HTML structure"
- `isVisible`: "true" (optional)
- `prerequisiteLesson`: "LESSON_ID" (optional)
- `readingContent`: "<h1>...</h1>" (optional, for READING type)
- `quiz`: "QUIZ_ID" (optional, for QUIZ type — existing quiz er ObjectId)
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
    "quiz": null,
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
