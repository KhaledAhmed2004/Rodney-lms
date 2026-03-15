# Screen 1: Auth

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Profile](./14-profile.md)

---

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
