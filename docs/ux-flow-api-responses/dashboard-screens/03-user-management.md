# Screen 3: User Management

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Overview](./02-overview.md) (stat card click → here), [Course](./04-course.md), [Enrollment Management](./05-enrollment-management.md)

## UX Flow

### Screen Load
1. Admin sidebar theke "User Management" e click kore, ba [Overview](./02-overview.md) er "Total Students" stat card click kore
2. Page load e parallel API calls:
   - Stat cards → `GET /users/stats` (→ 3.1) — total students + active students with growth
   - User table → `GET /users?page=1&limit=10&sort=-createdAt` (→ 3.2) — paginated student list
3. Screen render hoy: stat cards → search bar + filters → user table

### Stat Cards
1. 2 ta stat card dekhay — Total Students + Active Students
2. Each card e: current count + previous count + growth% + trend (UP/DOWN)
3. Overview er stat cards er sathe aligned — same data, different detail level

### User Table
1. Paginated table — default 10 per page
2. Search bar: name/email diye search (`?searchTerm=john`)
3. Sort: column header click e sort toggle (`?sort=-createdAt`, `?sort=name`)
4. Each row e: avatar + name + email + status badge + role + verified + enrollment count + last active + join date
5. Row actions: View detail, Block/Unblock, Edit, Delete

### User Detail (Side Panel / Page)
1. Table row e click → `GET /users/:id` (→ 3.3) — full profile with course stats
2. Profile info: name, email, avatar, status, role, verified, total points, streak
3. Course stats section: total/active/completed courses + average completion
4. Enrolled courses list: each course e title, thumbnail, status, progress%, enrolled date, last access

### Actions
1. **Block**: Status ACTIVE → RESTRICTED — user login korte parbe na
2. **Unblock**: Status RESTRICTED → ACTIVE — access restore
3. **Edit**: Name, email, status, role, verified update korte pare
4. **Delete**: Soft delete — status DELETE e set hoy, data thake but user access blocked
5. **Export**: CSV/XLSX download — filtered user list download korte pare

---

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
    "comparisonPeriod": "month",
    "totalStudents": { "value": 500, "growth": 11.1, "growthType": "increase" },
    "activeStudents": { "value": 280, "growth": 20, "growthType": "increase" }
  }
}
```

> Same format as [Dashboard Summary](./02-overview.md#21-get-dashboard-summary) — `{ value, growth, growthType }` per metric
>
> - `comparisonPeriod` — growth comparison period (`"month"`)
> - `value` — all-time count
> - `growth` — absolute percentage change vs last month
> - `growthType` — `increase` | `decrease` | `no_change`
> - `totalStudents` filter: `{ role: 'STUDENT', status: { $ne: 'DELETE' } }`
> - `activeStudents` filter: `{ role: 'STUDENT', status: 'ACTIVE' }`

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
    "status": "ACTIVE",
    "verified": true,
    "totalPoints": 450,
    "streak": { "current": 7, "longest": 14, "lastActiveDate": "2026-03-14T10:30:00Z" },
    "lastActiveDate": "2026-03-14T10:30:00Z",
    "courseStats": {
      "total": 3,
      "active": 2,
      "completed": 1,
      "averageCompletion": 55
    },
    "enrolledCourses": [
      {
        "courseId": "664a...",
        "title": "Introduction to Web Development",
        "thumbnail": "https://cdn.example.com/thumb.jpg",
        "status": "ACTIVE",
        "completionPercentage": 45,
        "enrolledAt": "2026-01-20T10:00:00Z",
        "lastAccessedAt": "2026-03-14T10:30:00Z"
      },
      {
        "courseId": "665b...",
        "title": "JavaScript Fundamentals",
        "thumbnail": "https://cdn.example.com/js-thumb.jpg",
        "status": "COMPLETED",
        "completionPercentage": 100,
        "enrolledAt": "2025-11-10T08:00:00Z",
        "lastAccessedAt": "2026-02-28T15:45:00Z"
      },
      {
        "courseId": "666c...",
        "title": "React for Beginners",
        "thumbnail": "https://cdn.example.com/react-thumb.jpg",
        "status": "ACTIVE",
        "completionPercentage": 12,
        "enrolledAt": "2026-03-01T09:00:00Z",
        "lastAccessedAt": "2026-03-13T11:20:00Z"
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

**Columns:** Name, Email, Status, Enrollment Count, Last Active Date, Created At

---

### API Status

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 3.1 | `GET /users/stats` | ✅ Done | Total + active students with growth metrics |
| 3.2 | `GET /users` | ✅ Done | Paginated list with search, sort, enrollment count |
| 3.3 | `GET /users/:id` | ✅ Done | Full profile + course stats + enrolled courses |
| 3.4 | `PATCH /users/:id/block` | ✅ Done | Status → RESTRICTED |
| 3.5 | `PATCH /users/:id/unblock` | ✅ Done | Status → ACTIVE |
| 3.6 | `PATCH /users/:id` | ✅ Done | Admin update (name, email, status, role, verified) |
| 3.7 | `DELETE /users/:id` | ✅ Done | Soft delete — status → DELETE |
| 3.8 | `GET /users/export` | ✅ Done | CSV/XLSX download |

---

## Audit Log

**Date:** 2026-03-27

| # | Issue | Severity | Fix | Status |
|---|-------|----------|-----|--------|
| 1 | Sort field injection — `?sort=-password` diye any field sortable | Medium | `SORTABLE_FIELDS` whitelist added, invalid field e default `createdAt` | ✅ Fixed |
| 2 | `$lookup` full enrollments for `$size` | Low | Functional issue nei, optimize later | ⏭ Skipped |
| 3 | `getUserById` `...userObj` spreads all fields (streak, __v, etc.) | Medium | Explicit `.select('name email profilePicture status verified totalPoints streak')` | ✅ Fixed |
| 4 | `enrolledCourses` unsorted | Low | `.sort({ enrolledAt: -1 })` added — latest enrollment age | ✅ Fixed |
| 5 | Block/unblock returns full user, doc says `{ _id, name, status }` | Medium | `.select('_id name status')` added | ✅ Fixed |
| 6 | No self-block guard — admin nijeke block korte pare | Low | `requesterId` param added, self-action e `ApiError` throw | ✅ Fixed |
| 7 | `updateUserByAdmin` response extra fields | Low | `.select('_id name email status role verified')` — doc aligned | ✅ Fixed |
| 8 | Export columns `role`/`verified` but `$project` e nei — empty columns | Low | Columns removed from ExportBuilder | ✅ Fixed |
| 9 | `GET /:id/user` public endpoint (no auth, rate limited) | Medium | Intentional kina clarify needed | ⏳ Open |

---
