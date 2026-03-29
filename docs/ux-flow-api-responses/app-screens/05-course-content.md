# Screen 5: Course Content

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [Progress](./06-progress.md), [Community](./08-community.md)

## UX Flow

### Course Detail Load
1. Student course card e tap kore (Browse screen theke) ba deep link e ashe
2. Page load e call → `GET /courses/:slug/student-detail` (→ 5.2)
3. Screen render hoy: course header (thumbnail, title, rating, enrollment count) → enrollment status → curriculum (module list with lessons)

### Enroll (Not Enrolled)
1. `enrollment: null` hole "Enroll" / "Start Course" button dekhay
2. Student tap kore → `POST /enrollments` (→ [4.2](./04-course.md))
3. Success → page refresh hoy — enrollment data ashbe, curriculum unlock hoy

### Lesson Tap (Enrolled)
1. Student curriculum theke lesson e tap kore
2. Call → `GET /courses/:courseId/lessons/:lessonId` (→ 5.4)
3. Lesson type onujayi content render hoy:
   - **VIDEO**: Video player + attachments
   - **READING**: Reading content + attachments
   - **QUIZ**: Quiz attempt flow (→ Quiz Builder)

### Mark Lesson Complete
1. Student lesson content dekhse / video shesh koreche
2. "Mark Complete" button e tap kore → `POST /enrollments/:courseId/lessons/:lessonId/complete` (→ 5.5)
3. Progress update hoy — `completionPercentage` + `completedLessons` update

### Quiz Flow
1. Curriculum e quiz attached thakle quiz card dekhay
2. Student "Start Quiz" tap kore → `GET /quizzes/:id/student-view` (→ 5.6) — quiz info + questions load
3. Student "Begin" tap kore → `POST /quizzes/:id/attempts` (→ 5.7) — attempt start, timer begin
4. Student answers select kore → "Submit" tap kore → `PATCH /quizzes/attempts/:attemptId/submit` (→ 5.8)
5. Result screen dekhay — score, pass/fail, answer review
6. Porbe "View Result" e → `GET /quizzes/attempts/:attemptId` (→ 5.9)

### Assignment Submission
1. ASSIGNMENT type lesson e submission form dekhay
2. Student content likhe → "Submit" tap kore → `POST /gradebook/assignments/:lessonId/submit` (→ 5.10)
3. Success → status "SUBMITTED" dekhay — admin grading er jonno pending

### Back to Browse
1. Student back button e tap kore → Browse screen e fire jay (→ [Screen 4](./04-course.md))

---

<!-- ═══════════ Course Content Endpoints ═══════════ -->

### 5.1 Get Course by ID or Slug

```
GET /courses/:identifier
Auth: None
```

**Response:**
```json
{
  "success": true,
  "message": "Course retrieved successfully",
  "data": {
    "_id": "664a...",
    "title": "Introduction to Web Development",
    "slug": "introduction-to-web-development",
    "description": "A comprehensive course...",
    "thumbnail": "https://cdn.example.com/thumb.jpg",
    "totalLessons": 24,
    "averageRating": 4.5,
    "enrollmentCount": 150,
    "status": "PUBLISHED",
    "modules": [
      {
        "moduleId": "uuid-1",
        "title": "Module 1: Getting Started",
        "order": 0,
        "lessons": [
          {
            "_id": "664c...",
            "title": "Introduction to HTML",
            "type": "VIDEO",
            "description": "Learn the basics...",
            "order": 0,
            "isVisible": true,
            "learningObjectives": ["Understand HTML structure"],
            "video": {
              "url": "https://cdn.example.com/video.mp4",
              "processingStatus": "COMPLETED",
              "duration": 600
            },
            "contentFile": null,
            "readingContent": null,
            "assignmentInstructions": null,
            "attachments": [],
            "prerequisiteLesson": null
          }
        ]
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-03-01T14:30:00Z"
  }
}
```

---

### 5.2 Get Student Course Detail

```
GET /courses/:identifier/student-detail
Auth: Bearer {{accessToken}} (STUDENT)
```

**Response (enrolled):**
```json
{
  "success": true,
  "message": "Course detail retrieved successfully",
  "data": {
    "_id": "664a...",
    "title": "Introduction to Web Development",
    "slug": "introduction-to-web-development",
    "thumbnail": "https://cdn.example.com/thumb.jpg",
    "description": "A comprehensive course...",
    "totalLessons": 24,
    "totalDuration": 3600,
    "averageRating": 4.5,
    "ratingsCount": 42,
    "enrollmentCount": 150,
    "curriculum": [
      {
        "moduleId": "uuid-1",
        "title": "Module 1: Getting Started",
        "order": 0,
        "lessons": [
          { "_id": "664c...", "title": "Introduction to HTML", "type": "VIDEO", "order": 0, "duration": 600 },
          { "_id": "664d...", "title": "Key Concepts", "type": "READING", "order": 1, "duration": null }
        ]
      }
    ],
    "enrollment": {
      "status": "ACTIVE",
      "completionPercentage": 45,
      "completedLessons": ["664c..."],
      "lastAccessedLesson": "664c...",
      "enrolledAt": "2026-03-10T10:00:00Z"
    }
  }
}
```

**Response (not enrolled):** Same shape but `"enrollment": null`.

> **Notes:**
> - Only PUBLISHED courses returned, 404 for DRAFT/SCHEDULED
> - Only `isVisible: true` lessons in curriculum
> - No video URLs, content, or attachments — use `GET /courses/:courseId/lessons/:lessonId` for full lesson
> - `duration` flattened from `video.duration`, `null` for non-video lessons
> - `completedLessons` as string[] for easy `includes()` check

---

### 5.3 Get Lessons by Module

```
GET /courses/:courseId/modules/:moduleId/lessons
Auth: None
```

**Response:**
```json
{
  "success": true,
  "message": "Lessons retrieved successfully",
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "664c...",
      "title": "Introduction to HTML",
      "type": "VIDEO",
      "description": "Learn the basics...",
      "order": 0,
      "isVisible": true,
      "learningObjectives": ["Understand HTML structure"],
      "video": { "url": "...", "processingStatus": "COMPLETED", "duration": 600 },
      "contentFile": null,
      "readingContent": null,
      "assignmentInstructions": null,
      "attachments": [],
      "prerequisiteLesson": null
    }
  ]
}
```

---

### 5.4 Get Lesson by ID

```
GET /courses/:courseId/lessons/:lessonId
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Lesson retrieved successfully",
  "data": {
    "_id": "664c...",
    "title": "Introduction to HTML",
    "type": "VIDEO",
    "description": "Learn the basics of HTML...",
    "order": 0,
    "isVisible": true,
    "learningObjectives": ["Understand HTML structure", "Use common HTML tags"],
    "video": {
      "url": "https://cdn.example.com/video.mp4",
      "processingStatus": "COMPLETED",
      "duration": 600
    },
    "contentFile": null,
    "readingContent": null,
    "assignmentInstructions": null,
    "attachments": [
      { "url": "https://cdn.example.com/notes.pdf", "name": "notes.pdf" }
    ],
    "prerequisiteLesson": { "_id": "664c...", "title": "Prerequisite Lesson" }
  }
}
```

---

### 5.5 Mark Lesson Complete

```
POST /enrollments/:courseId/lessons/:lessonId/complete
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": {
    "_id": "664b...",
    "progress": {
      "completedLessons": ["664c..."],
      "completionPercentage": 20,
      "lastAccessedLesson": "664c...",
      "lastAccessedAt": "2026-03-14T10:30:00Z"
    },
    "status": "ACTIVE"
  }
}
```

---

### 5.6 Get Quiz (Student View)

```
GET /quizzes/:id/student-view
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664d...",
    "title": "Module 1 Quiz",
    "description": "Test your knowledge of JavaScript fundamentals",
    "totalMarks": 17,
    "settings": {
      "timeLimit": 30,
      "maxAttempts": 3,
      "passingScore": 70,
      "shuffleQuestions": true,
      "shuffleOptions": true,
      "showResults": true
    },
    "questions": [
      {
        "questionId": "uuid-q1",
        "type": "MCQ",
        "text": "What is Node.js?",
        "marks": 5,
        "order": 0,
        "options": [
          { "optionId": "A", "text": "A runtime environment" },
          { "optionId": "B", "text": "A database" },
          { "optionId": "C", "text": "A CSS framework" },
          { "optionId": "D", "text": "A text editor" }
        ]
      },
      {
        "questionId": "uuid-q2",
        "type": "TRUE_FALSE",
        "text": "JavaScript is a statically typed language.",
        "marks": 2,
        "order": 1,
        "options": [
          { "optionId": "TRUE", "text": "True" },
          { "optionId": "FALSE", "text": "False" }
        ]
      },
      {
        "questionId": "uuid-q3",
        "type": "SHORT_ANSWER",
        "text": "Explain the difference between let, const, and var.",
        "marks": 10,
        "order": 2,
        "options": []
      }
    ]
  }
}
```

> `isCorrect` is NOT included in student view.

---

### 5.7 Start Quiz Attempt

```
POST /quizzes/:id/attempts
Auth: Bearer {{accessToken}}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Quiz attempt started",
  "data": {
    "_id": "664e...",
    "quiz": "664d...",
    "student": "664a...",
    "status": "IN_PROGRESS",
    "attemptNumber": 1,
    "startedAt": "2026-03-14T11:00:00Z",
    "maxScore": 17,
    "answers": []
  }
}
```

---

### 5.8 Submit Quiz Answers

```
PATCH /quizzes/attempts/:attemptId/submit
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{
  "answers": [
    { "questionId": "uuid-q1", "selectedOptionId": "A" },
    { "questionId": "uuid-q2", "selectedOptionId": "FALSE" },
    { "questionId": "uuid-q3", "textAnswer": "Node.js is a runtime environment" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "_id": "664e...",
    "quiz": "664d...",
    "student": "664a...",
    "status": "COMPLETED",
    "attemptNumber": 1,
    "score": 7,
    "maxScore": 17,
    "percentage": 41.2,
    "passed": false,
    "timeSpent": 1200,
    "startedAt": "2026-03-14T11:00:00Z",
    "completedAt": "2026-03-14T11:20:00Z",
    "answers": [
      {
        "questionId": "uuid-q1",
        "selectedOptionId": "A",
        "textAnswer": null,
        "isCorrect": true,
        "marksAwarded": 5
      },
      {
        "questionId": "uuid-q2",
        "selectedOptionId": "FALSE",
        "textAnswer": null,
        "isCorrect": true,
        "marksAwarded": 2
      },
      {
        "questionId": "uuid-q3",
        "selectedOptionId": null,
        "textAnswer": "Node.js is a runtime environment",
        "isCorrect": false,
        "marksAwarded": 0
      }
    ]
  }
}
```

> SHORT_ANSWER requires manual grading — `marksAwarded: 0` until admin grades.

---

### 5.9 View Quiz Result

```
GET /quizzes/attempts/:attemptId
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664e...",
    "quiz": {
      "_id": "664d...",
      "title": "Module 1 Quiz"
    },
    "score": 7,
    "maxScore": 17,
    "percentage": 41.2,
    "passed": false,
    "timeSpent": 1200,
    "attemptNumber": 1,
    "completedAt": "2026-03-14T11:20:00Z"
  }
}
```

---

### 5.10 Submit Assignment

```
POST /gradebook/assignments/:lessonId/submit
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{
  "courseId": "COURSE_ID",
  "content": "My assignment submission content here."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664f...",
    "student": "664a...",
    "course": "664a...",
    "lesson": "664c...",
    "enrollment": "664b...",
    "content": "My assignment submission content here.",
    "attachments": [],
    "status": "SUBMITTED",
    "submittedAt": "2026-03-14T12:00:00Z",
    "grade": null,
    "feedback": null
  }
}
```

---
