# Screen 12: Gamification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Analytics](./10-analytics.md)

---

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
