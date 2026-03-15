# Screen 8: Quiz Builder

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md)

---

### 8.1 Create Quiz

```
POST /quizzes
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "title": "Module 1 Quiz",
  "description": "Test your knowledge...",
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
      "type": "MCQ",
      "text": "What is Node.js?",
      "options": [
        { "optionId": "A", "text": "A runtime environment", "isCorrect": true },
        { "optionId": "B", "text": "A database", "isCorrect": false },
        { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
        { "optionId": "D", "text": "A text editor", "isCorrect": false }
      ],
      "marks": 5,
      "explanation": "Node.js is a JavaScript runtime...",
      "order": 0
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664d...",
    "title": "Module 1 Quiz",
    "description": "Test your knowledge...",
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
        "text": "What is Node.js?",
        "type": "MCQ",
        "marks": 5,
        "order": 0,
        "explanation": "Node.js is a JavaScript runtime...",
        "options": [
          { "optionId": "A", "text": "A runtime environment", "isCorrect": true },
          { "optionId": "B", "text": "A database", "isCorrect": false },
          { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
          { "optionId": "D", "text": "A text editor", "isCorrect": false }
        ]
      }
    ],
    "createdAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 8.2 Get All Quizzes

```
GET /quizzes?page=1&limit=10&searchTerm=
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "664d...",
      "title": "Module 1 Quiz",
      "description": "Test your knowledge...",
      "totalMarks": 17,
      "settings": { "timeLimit": 30, "maxAttempts": 3, "passingScore": 70 },
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ]
}
```

---

### 8.3 Get Quiz by ID (Admin — includes correct answers)

```
GET /quizzes/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same as [8.1 Create Quiz response](#81-create-quiz), includes `isCorrect` on options.

---

### 8.4 Update Quiz / Delete Quiz

```
PATCH /quizzes/:id  — Returns updated quiz object
DELETE /quizzes/:id  — Returns { success: true, message: "Quiz deleted successfully" }
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

---

### 8.5 Add / Update / Delete / Reorder Questions

```
POST   /quizzes/:id/questions              — Returns full quiz with new question
PATCH  /quizzes/:id/questions/:questionId  — Returns full quiz with updated question
DELETE /quizzes/:id/questions/:questionId  — Returns full quiz without deleted question
PATCH  /quizzes/:id/questions/reorder      — Returns full quiz with reordered questions
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

---

### 8.6 Get All Attempts (for a quiz)

```
GET /quizzes/:id/attempts?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPage": 5 },
  "data": [
    {
      "_id": "664e...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "quiz": "664d...",
      "attemptNumber": 1,
      "status": "COMPLETED",
      "score": 7,
      "percentage": 41.2,
      "passed": false,
      "startedAt": "2026-03-14T11:00:00Z",
      "completedAt": "2026-03-14T11:20:00Z"
    }
  ]
}
```

---
