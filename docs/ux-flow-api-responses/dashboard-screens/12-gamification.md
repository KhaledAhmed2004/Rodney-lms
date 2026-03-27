# Screen 12: Gamification

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Analytics](./10-analytics.md)

---

### 12.1 Get All Badges / Update Badge

```
GET    /gamification/badges?page=1&limit=20  — Paginated badge list (excludes description, timestamps, __v)
PATCH  /gamification/badges/:id              — Update badge (description, criteria.threshold, isActive only)
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> **Note**: Badges are pre-defined (seeded). No create or delete endpoints — use `isActive` toggle to disable.

---

### 12.2 Get Leaderboard

```
GET /gamification/leaderboard?page=1&limit=20
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "pagination": { "page": 1, "limit": 20, "total": 156, "totalPage": 8 },
  "data": [
    {
      "studentId": "664a1b2c3d4e5f6a7b8c9d0e",
      "name": "Sarah Ahmed",
      "profilePicture": "https://cdn.example.com/avatars/sarah.jpg",
      "totalPoints": 2450,
      "badgeCount": 5
    }
  ]
}
```

> `badgeCount` — `studentbadges` collection theke `$lookup` + `$size` diye calculate hoy. `$facet` diye single DB round trip e data + total count.

---
