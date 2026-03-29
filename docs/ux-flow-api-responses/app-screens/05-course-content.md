# Screen 5: Course Content

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md), [Progress](./06-progress.md), [Community](./08-community.md)

## UX Flow

### Course Detail Load
1. Student course card e tap kore (Browse screen theke) ba deep link e ashe
2. Page load e call → `GET /courses/:slug/student-detail` (→ 5.1)
3. Screen render hoy:
   - Course header: thumbnail, title, rating, enrollment count
   - Enrollment status (enrolled / not enrolled)
   - Curriculum: module list (accordion — collapsed by default)

### Curriculum (Accordion)
1. Module list dekhay — each module er title + lesson count
2. Module tap korle **expand** hoy — oi module er shob lessons dekhay
3. Again tap korle **collapse** hoy
4. Enrolled student er jonno completed lessons e ✅ checkmark dekhay
```
▶ Module 1: Getting Started              (3 lessons)
▼ Module 2: JS Fundamentals              (2 lessons)
   ├── Variables & Types (VIDEO)    ✅
   └── Functions (VIDEO)
▶ Module 3: Advanced Topics              (4 lessons)
```
> Data ekta API call e ashe (5.1) — accordion frontend e toggle kore, extra API call nai.

### Lesson Tap (Enrolled)
1. Student expanded module theke lesson e tap kore
2. Call → `GET /courses/:courseId/lessons/:lessonId` (→ 5.2)
3. Lesson type onujayi content render hoy:
   - **VIDEO**: Video player + attachments
   - **READING**: Reading content + attachments
   - **QUIZ**: Quiz info dekhay → Start Quiz flow e jay

### Mark Lesson Complete
1. Student lesson content dekhse / video shesh koreche
2. "Mark Complete" button e tap kore → `POST /enrollments/:courseId/lessons/:lessonId/complete` (→ 5.3)
3. Response e `completionPercentage` ashe — frontend progress bar update kore + locally lesson e ✅ add kore

### Quiz Flow
1. QUIZ type lesson e tap korle quiz info dekhay
2. Student "Start Quiz" tap kore → `GET /quizzes/:id/student-view` (→ 5.4) — quiz info + questions load (shuffled if enabled)
3. Student "Begin" tap kore → `POST /quizzes/:id/attempts` (→ 5.5) — attempt start, timer begin
4. Student answers select kore → "Submit" tap kore → `PATCH /quizzes/attempts/:attemptId/submit` (→ 5.6)
5. Result screen dekhay — score, pass/fail, answer review (if `showResults: true`)
6. Porbe "View Result" e → `GET /quizzes/attempts/:attemptId` (→ 5.7)

### Back to Browse
1. Student back button e tap kore → Browse screen e fire jay (→ [Screen 4](./04-course.md))

---

<!-- ═══════════ Course Content Endpoints ═══════════ -->

### 5.1 Get Student Course Detail

```
GET /courses/:identifier/student-detail
Auth: Bearer {{accessToken}} (STUDENT)
```

> `:identifier` — course `slug` ba `_id` duitai accept kore.

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
    "description": "A comprehensive course covering HTML, CSS, and JavaScript fundamentals.",
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
          { "_id": "664d...", "title": "Key Concepts", "type": "READING", "order": 1, "duration": null },
          { "_id": "664e...", "title": "Module 1 Quiz", "type": "QUIZ", "order": 2, "duration": null }
        ]
      },
      {
        "moduleId": "uuid-2",
        "title": "Module 2: JavaScript Fundamentals",
        "order": 1,
        "lessons": [
          { "_id": "664f...", "title": "Variables & Types", "type": "VIDEO", "order": 0, "duration": 480 },
          { "_id": "664g...", "title": "Functions", "type": "VIDEO", "order": 1, "duration": 720 }
        ]
      }
    ],
    "enrollment": {
      "status": "ACTIVE",
      "completionPercentage": 45,
      "completedLessons": ["664c...", "664d..."],
      "lastAccessedLesson": "664d...",
      "enrolledAt": "2026-03-10T10:00:00Z"
    }
  }
}
```

**Response (not enrolled):** Same shape but `"enrollment": null`.

> **Notes:**
> - Only PUBLISHED courses returned, 404 for DRAFT/SCHEDULED
> - Only `isVisible: true` lessons in curriculum
> - No video URLs, content, or attachments — shudhu title, type, duration (accordion er jonno enough)
> - `duration` flattened from `video.duration`, `null` for non-video lessons
> - `completedLessons` as string[] for easy `includes()` check — frontend ✅ dekhay
> - QUIZ type lesson e `duration: null` — quiz er time limit settings e ache, lesson duration e na

---

### 5.2 Get Lesson by ID

```
GET /courses/:courseId/lessons/:lessonId
Auth: Bearer {{accessToken}}
```

> Student lesson tap korle ei endpoint call hoy — full lesson content load kore.

**Response (VIDEO type):**
```json
{
  "success": true,
  "message": "Lesson retrieved successfully",
  "data": {
    "_id": "664c...",
    "title": "Introduction to HTML",
    "type": "VIDEO",
    "description": "Learn the basics of HTML...",
    "learningObjectives": ["Understand HTML structure", "Use common HTML tags"],
    "video": {
      "url": "https://cdn.example.com/video.mp4",
      "duration": 600
    },
    "contentFile": null,
    "readingContent": null,
    "quiz": null,
    "attachments": [
      { "url": "https://cdn.example.com/notes.pdf", "name": "notes.pdf" }
    ],
    "prerequisiteLesson": null
  }
}
```

**Response (READING type):**
```json
{
  "success": true,
  "message": "Lesson retrieved successfully",
  "data": {
    "_id": "664d...",
    "title": "Key Concepts",
    "type": "READING",
    "description": "Important concepts to understand...",
    "learningObjectives": ["Understand CSS box model"],
    "video": null,
    "contentFile": null,
    "readingContent": "<h1>Key Concepts</h1><p>The CSS box model...</p>",
    "quiz": null,
    "attachments": []
  }
}
```

**Response (QUIZ type):**
```json
{
  "success": true,
  "message": "Lesson retrieved successfully",
  "data": {
    "_id": "664e...",
    "title": "Module 1 Quiz",
    "type": "QUIZ",
    "description": "Test your knowledge",
    "learningObjectives": [],
    "video": null,
    "contentFile": null,
    "readingContent": null,
    "quiz": "664q...",
    "attachments": []
  }
}
```

> `order`, `isVisible`, `processingStatus` excluded — student er dorkar nai. Hidden lesson 404 return kore.
> QUIZ type e `quiz` field e Quiz er ObjectId thake — frontend eita diye `GET /quizzes/:id/student-view` (→ 5.4) call kore.

---

### 5.3 Mark Lesson Complete

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
    "completionPercentage": 20
  }
}
```

> Frontend locally `completedLessons` e lessonId add kore + progress bar update kore. `completionPercentage === 100` hole course complete — celebration dekhay.

---

### 5.4 Get Quiz (Student View)

```
GET /quizzes/:id/student-view
Auth: Bearer {{accessToken}}
```

> `isCorrect` stripped — student correct answer dekhte pare na. `shuffleQuestions` / `shuffleOptions` on thakle server-side shuffle kore pathay.

**Response:**
```json
{
  "success": true,
  "message": "Quiz retrieved successfully",
  "data": {
    "_id": "664q...",
    "title": "Module 1 Quiz",
    "description": "Test your knowledge of web development basics",
    "totalMarks": 7,
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
          { "optionId": "T", "text": "True" },
          { "optionId": "F", "text": "False" }
        ]
      }
    ]
  }
}
```

---

### 5.5 Start Quiz Attempt

```
POST /quizzes/:id/attempts
Auth: Bearer {{accessToken}}
```

> In-progress attempt thakle notun create hoy na — existing ta return kore. `maxAttempts` exceed korle 400 error.

**Response (201):**
```json
{
  "success": true,
  "message": "Quiz attempt started",
  "data": {
    "_id": "664e...",
    "quiz": "664q...",
    "attemptNumber": 1,
    "startedAt": "2026-03-14T11:00:00Z",
    "maxScore": 7,
    "status": "IN_PROGRESS"
  }
}
```

---

### 5.6 Submit Quiz Answers

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
    { "questionId": "uuid-q2", "selectedOptionId": "F" }
  ]
}
```

> Student protita question er jonno `questionId` + `selectedOptionId` pathay. Unanswered question omit korle 0 marks.

**Response (passed — all correct):**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "_id": "664e...",
    "score": 7,
    "maxScore": 7,
    "percentage": 100,
    "passed": true,
    "timeSpent": 1200,
    "attemptNumber": 1,
    "completedAt": "2026-03-14T11:20:00Z",
    "answers": [
      {
        "questionId": "uuid-q1",
        "selectedOptionId": "A",
        "isCorrect": true,
        "marksAwarded": 5
      },
      {
        "questionId": "uuid-q2",
        "selectedOptionId": "F",
        "isCorrect": true,
        "marksAwarded": 2
      }
    ]
  }
}
```

**Response (failed — 1 wrong):**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "_id": "664e...",
    "score": 5,
    "maxScore": 7,
    "percentage": 71,
    "passed": true,
    "timeSpent": 900,
    "attemptNumber": 1,
    "completedAt": "2026-03-14T11:15:00Z",
    "answers": [
      {
        "questionId": "uuid-q1",
        "selectedOptionId": "A",
        "isCorrect": true,
        "marksAwarded": 5
      },
      {
        "questionId": "uuid-q2",
        "selectedOptionId": "T",
        "isCorrect": false,
        "marksAwarded": 0
      }
    ]
  }
}
```

> **Result screen**: `passed` diye pass/fail badge dekhay, `answers[]` diye per-question breakdown dekhay (✅/❌ + marks).
> **`showResults: false`** hole frontend answers section hide kore — shudhu score + pass/fail dekhay.
> **Time limit**: Server-side enforce — `timeLimit` er beshi somoy lagale 400 error: "Time limit exceeded".

---

### 5.7 View Quiz Result

```
GET /quizzes/attempts/:attemptId
Auth: Bearer {{accessToken}}
```

> Past attempt review — Progress screen er quiz history theke-o ei endpoint call hoy. Student shudhu nijer attempt dekhte pare (ownership check).

**Response:**
```json
{
  "success": true,
  "message": "Attempt retrieved successfully",
  "data": {
    "_id": "664e...",
    "quiz": {
      "_id": "664q...",
      "title": "Module 1 Quiz"
    },
    "score": 7,
    "maxScore": 7,
    "percentage": 100,
    "passed": true,
    "timeSpent": 1200,
    "attemptNumber": 1,
    "completedAt": "2026-03-14T11:20:00Z"
  }
}
```

---
