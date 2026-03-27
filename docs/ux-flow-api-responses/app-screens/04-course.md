# Screen 4: Course

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course Content](./05-course-content.md), [Home](./03-home.md), [Welcome / Onboarding](./02-welcome-onboarding.md)

## UX Flow

### Page Load (Browse Tab)
1. Student bottom nav e "Courses" tab e tap kore
2. Page load e default call → `GET /courses/browse?page=1&limit=10&sort=-createdAt` (→ 4.1)
3. Screen render hoy: search bar (top) → course card grid

### Search
1. Student search bar e type kore (debounce 300ms)
2. `searchTerm` query param e pass hoy → `GET /courses/browse?searchTerm=javascript&page=1` (→ 4.1)
3. Results update hoy — search `title` + `description` er upor kaje kore
4. Search clear korle default list e fire ashe

### Course Card Tap
1. Student course card e tap kore
2. Navigate to Course Content screen → `GET /courses/:slug/student-detail` (→ [5.2](./05-course-content.md))

### Enroll from Card
1. Non-enrolled card e "Start Course" button dekhay (`enrollment: null`)
2. Student tap kore → `POST /enrollments` (→ 4.2)
3. Success → navigate to Course Content screen (→ [5.2](./05-course-content.md))
4. Already enrolled card e "Continue" button dekhay — tap e directly course content e navigate

### Filter
1. Student filter icon e tap kore — bottom sheet open hoy
2. Filter options dekhay (enrollment status, rating etc.)
3. Filter apply korle page 1 e reset hoy → `GET /courses/browse?enrollmentStatus=NOT_ENROLLED&page=1` (→ 4.1)
4. Active filter count badge dekhay filter icon e
5. "Clear All" e shob filter reset hoy

### Pagination (Infinite Scroll)
1. Student scroll kore list er niche
2. `page` increment hoy → `GET /courses/browse?page=2&limit=10&...` (→ 4.1)
3. New results append hoy existing list e
4. `page >= totalPage` hole loading indicator hide hoy

---

<!-- ═══════════ Browse Endpoints ═══════════ -->

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
      "slug": "javascript-basics",
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
      "slug": "python-for-beginners",
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

> **Notes:**
> - `enrollment` is `null` for non-enrolled courses. Enrolled courses include `enrollmentId`, `status`, and `completionPercentage`
> - `slug` included for client-side navigation to course detail screen (→ [5.2](./05-course-content.md))

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
