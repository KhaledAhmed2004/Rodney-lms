# UX Flow with API Responses

Screen-by-screen API flow for both the **Student App** and **Admin Dashboard**. Each screen lists the APIs called, their method/URL, auth requirement, and expected response shape.

> Base URL: `{{baseUrl}}` = `http://localhost:5000/api/v1`

---

## Standard Response Envelope

Every API follows this format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPage": 5 },
  "data": "..."
}
```

`pagination` only present on list endpoints. `data` shape varies per endpoint.

---

# Part 1: App APIs (Student-Facing)

---

## Screen 1: Auth Screen

### 1.1 Register

```
POST /users
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "gender": "male",
  "dateOfBirth": "1998-05-15"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Please check your email for verification code",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 1.2 Verify Email (OTP)

```
POST /auth/verify-email
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "oneTimeCode": 123456
}
```

**Response — New User (auto-login):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

**Response — Password Reset Flow:**
```json
{
  "success": true,
  "message": "Verification Successful: You can now reset your password",
  "data": "a3f8c2e1b4d7..."
}
```

---

### 1.3 Resend Verification Email

```
POST /auth/resend-verify-email
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

---

### 1.4 Login

```
POST /auth/login
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

> `refreshToken` also set as httpOnly cookie.

---

### 1.5 Logout

```
POST /auth/logout
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged out successfully."
}
```

---

### 1.6 Forget Password

```
POST /auth/forget-password
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response:**
```json
{
  "success": true,
  "message": "Please check your email for verification code"
}
```

---

### 1.7 Reset Password

```
POST /auth/reset-password
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "token": "reset-token-from-email-link",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your password has been successfully reset."
}
```

---

### 1.8 Change Password

```
POST /auth/change-password
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Your password has been successfully changed"
}
```

---

### 1.9 Refresh Token

```
POST /auth/refresh-token
Content-Type: application/json
Auth: None (token in body or cookie)
```

**Request Body:**
```json
{ "refreshToken": "{{refreshToken}}" }
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

## Screen 2: Welcome / Onboarding Screen

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

## Screen 3: Home Screen

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

## Screen 4: Browse Courses Screen

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

## Screen 5: Course Content Screen

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
      "enrollmentId": "665a...",
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

### 5.5 Enroll in Course

```
POST /enrollments
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

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

---

### 5.6 Mark Lesson Complete

```
POST /enrollments/:enrollmentId/lessons/:lessonId/complete
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

### 5.7 Get Quiz (Student View)

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

### 5.8 Start Quiz Attempt

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

### 5.9 Submit Quiz Answers

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

### 5.10 View Quiz Result

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
      "title": "Module 1 Quiz",
      "totalMarks": 17,
      "settings": { "showResults": true, "passingScore": 70 }
    },
    "student": {
      "_id": "664a...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": "https://cdn.example.com/avatar.jpg"
    },
    "score": 7,
    "maxScore": 17,
    "percentage": 41.2,
    "passed": false,
    "timeSpent": 1200,
    "status": "COMPLETED",
    "answers": [
      {
        "questionId": "uuid-q1",
        "selectedOptionId": "A",
        "isCorrect": true,
        "marksAwarded": 5
      }
    ],
    "completedAt": "2026-03-14T11:20:00Z"
  }
}
```

---

### 5.11 Submit Assignment

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

## Screen 6: Progress Screen

### 6.1 Get Progress Overview

```
GET /student/progress
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress data retrieved successfully",
  "data": {
    "overallPercentage": 65,
    "points": 450,
    "streak": {
      "current": 7,
      "longest": 14
    },
    "progressByTopics": [
      {
        "courseId": "664a...",
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "completionPercentage": 45,
        "status": "ACTIVE",
        "completedLessons": 11
      }
    ],
    "quizResults": [
      {
        "quizId": "664d...",
        "quizTitle": "Module 1 Quiz",
        "score": 7,
        "maxScore": 17,
        "percentage": 41.2,
        "passed": false,
        "completedAt": "2026-03-14T11:20:00Z"
      }
    ]
  }
}
```

---

### 6.2 Get Activity Calendar

```
GET /activity/calendar
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664g...",
      "student": "664a...",
      "date": "2026-03-14",
      "lessonsCompleted": 3,
      "quizzesTaken": 1,
      "pointsEarned": 25,
      "isActive": true
    }
  ]
}
```

---

### 6.3 Get Streak

```
GET /activity/streak
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": 7,
    "longest": 14,
    "lastActiveDate": "2026-03-14T10:30:00Z"
  }
}
```

---

### 6.4 Get My Quiz Attempts

```
GET /quizzes/my-attempts?page=1&limit=10
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "664e...",
      "quiz": {
        "_id": "664d...",
        "title": "Module 1 Quiz",
        "totalMarks": 17
      },
      "student": "664a...",
      "score": 7,
      "percentage": 41.2,
      "passed": false,
      "status": "COMPLETED",
      "attemptNumber": 1,
      "completedAt": "2026-03-14T11:20:00Z"
    }
  ]
}
```

---

### 6.5 Get My Grades

```
GET /gradebook/my-grades?page=1&limit=10
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 8, "totalPage": 1 },
  "data": [
    {
      "_id": "664f...",
      "student": "664a...",
      "course": {
        "_id": "664a...",
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "thumbnail": "https://cdn.example.com/thumb.jpg"
      },
      "assessmentType": "QUIZ",
      "assessmentTitle": "Module 1 Quiz",
      "score": 7,
      "maxScore": 17,
      "percentage": 41.2,
      "status": "GRADED",
      "feedback": null,
      "gradedAt": "2026-03-14T11:20:00Z"
    }
  ]
}
```

---

## Screen 7: Achievements Screen

### 7.1 Get My Badges

```
GET /gamification/my-badges
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664h...",
      "student": "664a...",
      "badge": {
        "_id": "664i...",
        "name": "Quiz Master",
        "icon": "https://cdn.example.com/badge.png",
        "description": "Pass 10 quizzes"
      },
      "earnedAt": "2026-03-10T12:00:00Z"
    }
  ]
}
```

---

### 7.2 Get My Points

```
GET /gamification/my-points
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 450,
    "history": [
      {
        "_id": "664j...",
        "student": "664a...",
        "points": 25,
        "reason": "QUIZ_PASSED",
        "description": "Passed Module 1 Quiz",
        "createdAt": "2026-03-14T11:20:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 20, "totalPage": 2 }
  }
}
```

---

### 7.3 Get Gamification Summary

```
GET /gamification/my-summary
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 450,
    "totalBadges": 3,
    "topBadge": {
      "_id": "664i...",
      "name": "Quiz Master",
      "icon": "https://cdn.example.com/badge.png"
    }
  }
}
```

---

### 7.4 Get All Badges

```
GET /gamification/badges?page=1&limit=20
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPage": 1 },
  "data": [
    {
      "_id": "664i...",
      "name": "Quiz Master",
      "description": "Pass 10 quizzes",
      "icon": "https://cdn.example.com/badge.png"
    }
  ]
}
```

---

## Screen 8: Community Screen

### 8.1 Create Post

```
POST /community/posts
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `content`: "Just completed the JavaScript module!"
- `image`: (file, optional)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664k...",
    "author": "664a...",
    "content": "Just completed the JavaScript module!",
    "image": "https://cdn.example.com/post-image.jpg",
    "likesCount": 0,
    "repliesCount": 0,
    "status": "ACTIVE",
    "createdAt": "2026-03-14T13:00:00Z",
    "updatedAt": "2026-03-14T13:00:00Z"
  }
}
```

---

### 8.2 Get Feed

```
GET /community/posts?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": [
    {
      "_id": "664k...",
      "author": {
        "_id": "664a...",
        "name": "John Doe",
        "profilePicture": "https://cdn.example.com/avatar.jpg"
      },
      "content": "Just completed the JavaScript module!",
      "image": "https://cdn.example.com/post-image.jpg",
      "likesCount": 5,
      "repliesCount": 2,
      "status": "ACTIVE",
      "isLiked": false,
      "createdAt": "2026-03-14T13:00:00Z"
    }
  ]
}
```

---

### 8.3 Get Post by ID

```
GET /community/posts/:id
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664k...",
    "author": {
      "_id": "664a...",
      "name": "John Doe",
      "profilePicture": "https://cdn.example.com/avatar.jpg"
    },
    "content": "Just completed the JavaScript module!",
    "image": "https://cdn.example.com/post-image.jpg",
    "likesCount": 5,
    "repliesCount": 2,
    "status": "ACTIVE",
    "isLiked": true,
    "replies": [
      {
        "_id": "664l...",
        "author": {
          "_id": "664m...",
          "name": "Jane Smith",
          "profilePicture": "https://cdn.example.com/jane.jpg"
        },
        "content": "Great post! Thanks for sharing.",
        "status": "ACTIVE",
        "createdAt": "2026-03-14T13:30:00Z"
      }
    ],
    "createdAt": "2026-03-14T13:00:00Z"
  }
}
```

---

### 8.4 Toggle Like

```
POST /community/posts/:id/like
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": { "liked": true }
}
```

---

### 8.5 Reply to Post

```
POST /community/posts/:id/replies
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{ "content": "Great post! Thanks for sharing." }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664l...",
    "post": "664k...",
    "author": "664a...",
    "content": "Great post! Thanks for sharing.",
    "status": "ACTIVE",
    "createdAt": "2026-03-14T13:30:00Z"
  }
}
```

---

### 8.6 Delete Post / Delete Reply

```
DELETE /community/posts/:id
DELETE /community/replies/:id
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

## Screen 9: Notification Screen

### 9.1 Get Notifications

```
GET /notifications?page=1&limit=20
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPage": 1 },
  "unreadCount": 3,
  "data": [
    {
      "_id": "664n...",
      "receiver": "664a...",
      "title": "New Badge Earned!",
      "text": "You earned the Quiz Master badge",
      "type": "USER",
      "isRead": false,
      "createdAt": "2026-03-14T12:00:00Z"
    }
  ]
}
```

---

### 9.2 Mark All as Read

```
PATCH /notifications/read-all
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedCount": 3,
    "message": "All notifications marked as read"
  }
}
```

---

### 9.3 Mark One as Read

```
PATCH /notifications/:id/read
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664n...",
    "isRead": true
  }
}
```

---

## Screen 10: Profile Screen

### 10.1 Get Own Profile

```
GET /users/profile
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile data retrieved successfully",
  "data": {
    "_id": "664a...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/avatar.jpg",
    "phone": "+8801798765432",
    "gender": "male",
    "dateOfBirth": "1998-05-15",
    "location": "Chittagong, Bangladesh",
    "role": "STUDENT",
    "status": "ACTIVE",
    "verified": true,
    "averageRating": 4.5,
    "ratingsCount": 2,
    "totalPoints": 450,
    "streak": {
      "current": 7,
      "longest": 14,
      "lastActiveDate": "2026-03-14T10:30:00Z"
    },
    "onboardingCompleted": true
  }
}
```

---

### 10.2 Update Profile

```
PATCH /users/profile
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `name`: "John Updated"
- `gender`: "male"
- `dateOfBirth`: "1998-05-15"
- `location`: "Chittagong, Bangladesh"
- `phone`: "+8801798765432"
- `profilePicture`: (file, optional)

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "664a...",
    "name": "John Updated",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/new-avatar.jpg",
    "phone": "+8801798765432",
    "gender": "male",
    "dateOfBirth": "1998-05-15",
    "location": "Chittagong, Bangladesh"
  }
}
```

---

### 10.3 Get Legal Pages

```
GET /legal
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slug": "terms-of-service",
      "title": "Terms of Service",
      "updatedAt": "2026-02-01T10:00:00Z"
    },
    {
      "slug": "privacy-policy",
      "title": "Privacy Policy",
      "updatedAt": "2026-02-01T10:00:00Z"
    }
  ]
}
```

---

### 10.4 Get Legal Page by Slug

```
GET /legal/:slug
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms of Service</h1><p>Welcome to our platform...</p>",
    "createdAt": "2026-01-01T10:00:00Z",
    "updatedAt": "2026-02-01T10:00:00Z"
  }
}
```

---

### 10.5 Get My Reviews

```
GET /feedback/my-reviews?page=1&limit=10
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
  "data": [
    {
      "_id": "664o...",
      "course": {
        "_id": "664a...",
        "title": "Introduction to Web Development",
        "slug": "introduction-to-web-development",
        "thumbnail": "https://cdn.example.com/thumb.jpg"
      },
      "rating": 5,
      "review": "Excellent course! Very well structured.",
      "isPublished": true,
      "adminResponse": "Thank you for your feedback!",
      "respondedAt": "2026-03-15T09:00:00Z",
      "createdAt": "2026-03-14T14:00:00Z"
    }
  ]
}
```

---

### 10.6 Submit Course Review

```
POST /feedback
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{
  "courseId": "COURSE_ID",
  "rating": 5,
  "review": "Excellent course! Very well structured."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664o...",
    "student": "664a...",
    "course": "664a...",
    "enrollment": "664b...",
    "rating": 5,
    "review": "Excellent course! Very well structured.",
    "isPublished": false,
    "adminResponse": null,
    "respondedAt": null,
    "createdAt": "2026-03-14T14:00:00Z"
  }
}
```

---

## Screen 11: Chat Screen

### 11.1 Create Chat

```
POST /chats/:otherUserId
Auth: Bearer {{accessToken}}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664p...",
    "participants": ["664a...", "664m..."],
    "lastMessage": null,
    "createdAt": "2026-03-14T15:00:00Z"
  }
}
```

---

### 11.2 Get My Chats

```
GET /chats
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664p...",
      "participants": [
        {
          "_id": "664m...",
          "name": "Jane Smith",
          "profilePicture": "https://cdn.example.com/jane.jpg"
        }
      ],
      "lastMessage": {
        "text": "Hello! How are you?",
        "sender": "664a...",
        "createdAt": "2026-03-14T15:10:00Z"
      },
      "unreadCount": 2,
      "createdAt": "2026-03-14T15:00:00Z"
    }
  ]
}
```

---

### 11.3 Send Message

```
POST /messages
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `chatId`: "CHAT_ID"
- `text`: "Hello! How are you?"
- `image`: (file, optional, up to 5)
- `media`: (file, optional, up to 3)
- `doc`: (file, optional, up to 5)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664q...",
    "chatId": "664p...",
    "sender": "664a...",
    "text": "Hello! How are you?",
    "image": [],
    "media": [],
    "doc": [],
    "createdAt": "2026-03-14T15:10:00Z"
  }
}
```

---

### 11.4 Get Messages

```
GET /messages/:chatId?page=1&limit=50
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 50, "total": 25, "totalPage": 1 },
  "data": [
    {
      "_id": "664q...",
      "chatId": "664p...",
      "sender": {
        "_id": "664a...",
        "name": "John Doe",
        "profilePicture": "https://cdn.example.com/avatar.jpg"
      },
      "text": "Hello! How are you?",
      "image": [],
      "media": [],
      "doc": [],
      "createdAt": "2026-03-14T15:10:00Z"
    }
  ]
}
```

---

### 11.5 Mark Chat as Read

```
POST /messages/chat/:chatId/read
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat marked as read"
}
```

---

### 11.6 Get Public User Details

```
GET /users/:id/user
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664m...",
    "name": "Jane Smith",
    "profilePicture": "https://cdn.example.com/jane.jpg",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

---

---

# Part 2: Dashboard APIs (Admin-Facing)

---

## Screen 1: Auth Screen (Admin)

### 1.1 Login

```
POST /auth/login
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "strong_password_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### 1.2 Logout / Change Password / Refresh Token

> Same response shapes as App Auth Screen ([1.5](#15-logout), [1.8](#18-change-password), [1.9](#19-refresh-token))

---

## Screen 2: Overview Screen

### 2.1 Get Dashboard Summary

```
GET /dashboard/summary
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 500,
    "totalCourses": 12,
    "totalEnrollments": 1500,
    "completedEnrollments": 350,
    "completionRate": 23.3,
    "activeStudents": 280
  }
}
```

---

### 2.2 Get Trends

```
GET /dashboard/trends
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentTrends": [
      { "_id": { "year": 2026, "month": 1 }, "count": 120 },
      { "_id": { "year": 2026, "month": 2 }, "count": 145 },
      { "_id": { "year": 2026, "month": 3 }, "count": 160 }
    ],
    "userTrends": [
      { "_id": { "year": 2026, "month": 1 }, "count": 50 },
      { "_id": { "year": 2026, "month": 2 }, "count": 65 },
      { "_id": { "year": 2026, "month": 3 }, "count": 80 }
    ]
  }
}
```

---

### 2.3 Get Recent Activity

```
GET /dashboard/recent-activity
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recentEnrollments": [
      {
        "_id": "664b...",
        "student": { "name": "John Doe", "profilePicture": "https://..." },
        "course": { "title": "Introduction to Web Development" },
        "createdAt": "2026-03-14T10:00:00Z"
      }
    ],
    "recentCompletions": [
      {
        "_id": "664b...",
        "student": { "name": "Jane Smith", "profilePicture": "https://..." },
        "course": { "title": "JavaScript Basics" },
        "completedAt": "2026-03-14T09:00:00Z"
      }
    ],
    "recentQuizAttempts": [
      {
        "_id": "664e...",
        "student": { "name": "John Doe", "profilePicture": "https://..." },
        "quiz": { "title": "Module 1 Quiz" },
        "completedAt": "2026-03-14T11:20:00Z"
      }
    ]
  }
}
```

---

## Screen 3: User Management Screen

### 3.1 Get User Stats

```
GET /users/stats
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": {
      "current": 500,
      "previous": 450,
      "growth": 11.1,
      "trend": "UP"
    },
    "activeStudents": {
      "current": 280,
      "previous": 250,
      "growth": 12,
      "trend": "UP"
    }
  }
}
```

---

### 3.2 Get All Users

```
GET /users?page=1&limit=10&searchTerm=&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 500, "totalPage": 50 },
  "data": [
    {
      "_id": "664a...",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicture": "https://cdn.example.com/avatar.jpg",
      "status": "ACTIVE",
      "role": "STUDENT",
      "verified": true,
      "enrollmentCount": 3,
      "lastActiveDate": "2026-03-14T10:30:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### 3.3 Get User by ID

```
GET /users/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664a...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/avatar.jpg",
    "role": "STUDENT",
    "status": "ACTIVE",
    "verified": true,
    "totalPoints": 450,
    "streak": { "current": 7, "longest": 14, "lastActiveDate": "2026-03-14T10:30:00Z" },
    "lastActiveDate": "2026-03-14T10:30:00Z",
    "courseStats": {
      "total": 3,
      "active": 2,
      "completed": 1,
      "dropped": 0,
      "averageCompletion": 55
    },
    "enrolledCourses": [
      {
        "enrollmentId": "664b...",
        "course": {
          "_id": "664a...",
          "title": "Introduction to Web Development",
          "thumbnail": "https://cdn.example.com/thumb.jpg"
        },
        "enrollmentStatus": "ACTIVE",
        "completionPercentage": 45,
        "enrolledAt": "2026-01-20T10:00:00Z",
        "lastAccessedAt": "2026-03-14T10:30:00Z"
      }
    ]
  }
}
```

---

### 3.4 Block User

```
PATCH /users/:id/block
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": { "_id": "664a...", "name": "John Doe", "status": "RESTRICTED" }
}
```

---

### 3.5 Unblock User

```
PATCH /users/:id/unblock
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User unblocked successfully",
  "data": { "_id": "664a...", "name": "John Doe", "status": "ACTIVE" }
}
```

---

### 3.6 Update User (Admin)

```
PATCH /users/:id
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "status": "ACTIVE",
  "role": "STUDENT",
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "664a...",
    "name": "Updated Name",
    "email": "newemail@example.com",
    "status": "ACTIVE",
    "role": "STUDENT",
    "verified": true
  }
}
```

---

### 3.7 Delete User (Soft)

```
DELETE /users/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 3.8 Export Users (CSV/XLSX)

```
GET /users/export?format=csv
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:** CSV/XLSX file download (Content-Disposition header)

**Columns:** Name, Email, Status, Role, Verified, Enrollment Count, Last Active Date, Created At

---

## Screen 4: Course Screen

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

## Screen 5: Enrollment Management Screen

### 5.1 Get All Enrollments

```
GET /enrollments?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 1500, "totalPage": 150 },
  "data": [
    {
      "_id": "664b...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "course": { "title": "Introduction to Web Development", "slug": "intro-web-dev", "thumbnail": "https://..." },
      "status": "ACTIVE",
      "enrolledAt": "2026-01-20T10:00:00Z",
      "completedAt": null,
      "progress": {
        "completedLessons": ["664c..."],
        "lastAccessedLesson": "664c...",
        "lastAccessedAt": "2026-03-14T10:30:00Z",
        "completionPercentage": 45
      }
    }
  ]
}
```

---

### 5.2 Update Enrollment Status

```
PATCH /enrollments/:id/status
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "status": "SUSPENDED" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664b...",
    "student": "664a...",
    "course": "664a...",
    "status": "SUSPENDED",
    "completedAt": null
  }
}
```

---

### 5.3 Get Enrolled Students for Course

```
GET /enrollments/course/:courseId/students?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 150, "totalPage": 15 },
  "data": [
    {
      "_id": "664b...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "status": "ACTIVE",
      "progress": { "completionPercentage": 45 }
    }
  ]
}
```

---

## Screen 6: Gradebook Screen

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

## Screen 7: Discussion Screen

### 7.1 Get All Posts

```
GET /community/posts?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same response shape as [App Community Feed](#82-get-feed)

---

### 7.2 Delete Post / Delete Reply

```
DELETE /community/posts/:id
DELETE /community/replies/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Post/Reply deleted successfully" }
```

---

### 7.3 Get Flagged Posts

```
GET /community/admin/flagged?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
  "data": [
    {
      "_id": "664k...",
      "author": { "name": "User X", "email": "userx@example.com", "profilePicture": "https://..." },
      "content": "Inappropriate content...",
      "image": null,
      "likesCount": 0,
      "repliesCount": 1,
      "status": "HIDDEN",
      "createdAt": "2026-03-13T08:00:00Z"
    }
  ]
}
```

---

## Screen 8: Quiz Builder Screen

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

## Screen 9: Notification Screen (Admin)

### 9.1 Get Admin Notifications

```
GET /notifications/admin?page=1&limit=20
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 20, "total": 10, "totalPage": 1 },
  "unreadCount": 2,
  "data": [
    {
      "_id": "664n...",
      "title": "New Student Registered",
      "text": "John Doe just registered on the platform",
      "type": "ADMIN",
      "isRead": false,
      "createdAt": "2026-03-14T10:00:00Z"
    }
  ]
}
```

---

### 9.2 Mark All Admin Notifications as Read

```
PATCH /notifications/admin/read-all
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "data": { "updated": 2 } }
```

---

### 9.3 Mark Admin Notification as Read

```
PATCH /notifications/admin/:id/read
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664n...", "title": "New Student Registered", "isRead": true, "type": "ADMIN" }
}
```

---

## Screen 10: Analytics Screen

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

## Screen 11: Feedback Screen

### 11.1 Get All Feedback

```
GET /feedback/admin/all?page=1&limit=10&sort=-createdAt
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": [
    {
      "_id": "664o...",
      "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." },
      "course": { "title": "Introduction to Web Development", "slug": "intro-web-dev" },
      "rating": 5,
      "review": "Excellent course!",
      "isPublished": false,
      "adminResponse": null,
      "respondedAt": null,
      "createdAt": "2026-03-14T14:00:00Z"
    }
  ]
}
```

---

### 11.2 Toggle Publish

```
PATCH /feedback/:id/publish
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664o...", "isPublished": true, "rating": 5, "review": "Excellent course!" }
}
```

---

### 11.3 Respond to Feedback

```
PATCH /feedback/:id/respond
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{ "adminResponse": "Thank you for your feedback!" }
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "664o...", "adminResponse": "Thank you for your feedback!", "respondedAt": "2026-03-15T09:00:00Z" }
}
```

---

### 11.4 Delete Feedback

```
DELETE /feedback/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Feedback deleted successfully" }
```

---

## Screen 12: Gamification Screen

### 12.1 Create Badge

```
POST /gamification/badges
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Form Data:**
- `name`: "Quiz Master"
- `slug`: "quiz-master"
- `description`: "Pass 10 quizzes"
- `criteria.type`: "QUIZZES_PASSED"
- `criteria.threshold`: "10"
- `isActive`: "true"
- `icon`: (file)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664i...",
    "name": "Quiz Master",
    "slug": "quiz-master",
    "icon": "https://cdn.example.com/badge.png",
    "description": "Pass 10 quizzes",
    "criteria": { "type": "QUIZZES_PASSED", "threshold": 10 },
    "isActive": true,
    "createdAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 12.2 Get All Badges / Update Badge / Delete Badge

```
GET    /gamification/badges?page=1&limit=20  — Paginated badge list
PATCH  /gamification/badges/:id              — Updated badge object
DELETE /gamification/badges/:id              — { success: true, message: "Badge deleted" }
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

---

### 12.3 Adjust Student Points

```
POST /gamification/points/adjust
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "studentId": "STUDENT_ID",
  "points": 50,
  "description": "Bonus for excellent performance"
}
```

**Response:**
```json
{ "success": true, "message": "Points adjusted successfully" }
```

---

### 12.4 Get Gamification Stats

```
GET /gamification/admin/stats
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPointsDistributed": 25000,
    "topEarners": [
      {
        "_id": "664a...",
        "total": 1250,
        "student": { "name": "John Doe", "email": "john@example.com", "profilePicture": "https://..." }
      }
    ],
    "mostEarnedBadges": [
      {
        "_id": "664i...",
        "count": 45,
        "badge": { "name": "Quiz Master", "icon": "https://cdn.example.com/badge.png" }
      }
    ]
  }
}
```

---

### 12.5 Get Leaderboard

```
GET /gamification/leaderboard?page=1&limit=10
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same response shape as [App Leaderboard](#32-get-leaderboard)

---

## Screen 13: Legal Screen

### 13.1 Create Legal Page

```
POST /legal
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "title": "Terms of Service",
  "content": "<h1>Terms of Service</h1><p>Welcome...</p>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms of Service</h1><p>Welcome...</p>",
    "createdAt": "2026-03-14T10:00:00Z",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 13.2 Get All / Get by Slug / Update / Delete

```
GET    /legal            — Same as App [10.3](#103-get-legal-pages)
GET    /legal/:slug      — Same as App [10.4](#104-get-legal-page-by-slug)
PATCH  /legal/:slug      — Updated legal page object
DELETE /legal/:slug      — { success: true, message: "Legal page deleted" }
```

---

## Screen 14: Profile Screen (Admin)

### 14.1 Get Own Profile / Update Profile

> Same response shapes as App Profile Screen ([10.1](#101-get-own-profile), [10.2](#102-update-profile)), but role will be `SUPER_ADMIN` and student-specific fields will be excluded.
