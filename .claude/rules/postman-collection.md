---
paths:
  - "public/postman-collection.json"
  - "src/**/*.route.ts"
---

# Postman Collection Rules

## File Location

`public/postman-collection.json` — the single source of truth for all API endpoints in Postman format.

## CRITICAL: Always Update Postman When Adding/Modifying/Removing API Endpoints

Whenever you:
- Add a new route in any `*.route.ts` file
- Remove or rename an existing route
- Change request body schema (validation changes)
- Change HTTP method or URL path
- Add/remove auth requirements
- Add/remove file upload fields

You MUST update `public/postman-collection.json` to reflect the change. Do NOT mark the task as complete until the Postman collection is updated.

## Structure: Screen-Based Organization

The collection is organized by frontend screens, NOT by backend modules. Two top-level folders:

```
Rodney API
├── App APIs (student-facing app screens)
│   ├── Auth Screen
│   ├── Home Screen
│   ├── Course Screen
│   ├── Notification Screen
│   ├── Progress Screen
│   ├── Community Screen (chat + messages)
│   └── Profile Screen
│
└── Dashboard APIs (admin panel screens)
    ├── Auth Screen
    ├── Overview Screen
    ├── User Management Screen
    ├── Course Screen
    │   ├── Courses
    │   ├── Modules
    │   └── Lessons
    ├── Gradebook Screen
    ├── Discussion Screen
    ├── Quiz Builder Screen
    ├── Notification Screen
    ├── Analytics Screen
    ├── Feedback Screen
    ├── Gamification Screen
    ├── Legal Screen
    └── Profile Screen
```

## Request Naming Convention

- Request name **verb diye shuru** hobe — action clearly bujha jabe
- **Title Case** use koro
- Examples:
  - `Create User` (POST)
  - `Get All Courses` (GET list)
  - `Get Course By ID` (GET single)
  - `Update Profile` (PATCH)
  - `Delete Notification` (DELETE)
  - `Upload Avatar` (POST with file)
  - `Login` (POST — auth special case)
  - `Refresh Token` (POST — auth special case)
- **DON'T**: "user", "course api", "post course", "GET /courses"

## Request Body Best Practices

### JSON body fields:
- **Realistic example values** use koro — generic "string", "test" AVOID koro:
  ```json
  // BAD
  { "name": "string", "email": "string", "password": "string" }

  // GOOD
  { "name": "John Doe", "email": "john@example.com", "password": "SecurePass123!" }
  ```
- Required vs optional fields clearly indicate koro — optional fields `"disabled": true` diye rakho
- Field er constraint comment e mention koro jodi complex hoy

### File upload fields:
- `"type": "file"` use koro formdata te
- File field er allowed types mention koro description e (e.g., "Accepts: jpg, png, webp. Max: 5MB")

## Description Best Practices

### Collection-level description (top-level):
```
API collection for Rodney LMS.
Auth: Bearer token via {{accessToken}} variable.
Base URL: {{baseUrl}}
```

### Folder-level description (each screen):
```
All endpoints for the Course Screen — CRUD operations for courses, modules, and lessons.
```

### Request-level description (each request):
- Kobe use hobe, expected behavior, special notes
- Example: "Creates a new course. Requires ADMIN role. Returns the created course object with ID."

## Example Responses

- Protita request e **example response save koro** (Postman "Save Response" feature):
  - ✅ Success response (200/201)
  - ❌ Error response (400 validation error, 401 unauthorized, 404 not found)
- Common response status codes:
  ```
  200 — Success (GET, PATCH, DELETE)
  201 — Created (POST)
  400 — Validation error / Bad request
  401 — Unauthorized (token missing/expired)
  403 — Forbidden (role not allowed)
  404 — Not found
  409 — Conflict (duplicate entry)
  ```

## Variables & Params

### Collection variables (already defined):
- `{{baseUrl}}`, `{{accessToken}}`, `{{refreshToken}}`, `{{adminEmail}}`, `{{adminPassword}}`
- **CRITICAL**: Dashboard Login MUST use `{{adminEmail}}` and `{{adminPassword}}` — NEVER hardcode admin credentials

### Path params:
- Proper description + example value dao:
  ```json
  { "key": "id", "value": "665a1b2c3d4e5f6789abcdef", "description": "Course ID (MongoDB ObjectId)" }
  ```

### Query params (GET list endpoints):
- Pagination: `page` (default: 1), `limit` (default: 10)
- Search: `searchTerm`
- Sort: `sort` (e.g., `-createdAt` for newest first)
- Filter: module-specific filters with default values documented
- Optional params `"disabled": true` diye rakho

## Rules When Adding a New Endpoint

1. **Determine which screen(s)** the endpoint belongs to (App, Dashboard, or both)
2. **Place it in the correct screen folder** — an endpoint can appear in multiple screens if used by both App and Dashboard
3. **Include correct request format**:
   - JSON body endpoints: `mode: "raw"` with `Content-Type: application/json` header
   - File upload endpoints: `mode: "formdata"` with file fields
   - Auth-required endpoints: include `Authorization: Bearer {{accessToken}}` header
4. **Use collection variables**: `{{baseUrl}}`, `{{accessToken}}`, etc.
5. **Include URL variables** for path params (`:id`, `:courseId`, etc.) with description
6. **Include query params** for GET endpoints with defaults documented
7. **Add description** — what the endpoint does, auth requirement, special notes
8. **Use realistic example values** in request body — NOT generic "string" or "test"
9. **Name with verb** — "Create Course", not "course" or "POST course"

## Rules When Adding a New Screen

1. Create an empty folder with the screen name under the correct parent (App APIs or Dashboard APIs)
2. Add `"description": "Screen purpose. (Endpoints coming soon)"` if no endpoints exist yet
3. Populate with relevant endpoints

## Don't Forget

- Same endpoint can exist in both App and Dashboard (e.g., Profile, Auth)
- File upload fields use `"type": "file"` in formdata
- Optional/disabled fields should have `"disabled": true`
- Keep the collection valid JSON at all times
- Request names should be unique within a folder