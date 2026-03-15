# Screen 1: Auth

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Profile](./10-profile.md) (change password)

## UX Flow

### Registration Flow
1. Student "Create Account" e tap kore
2. Name, email, password, gender, dateOfBirth input kore
3. Submit → `POST /users` (→ 1.1)
4. Success → OTP verify screen e navigate + email check korte bole
5. Email na pele → "Resend" button → `POST /auth/resend-verify-email` (→ 1.3)
6. OTP input kore submit → `POST /auth/verify-email` (→ 1.2, new user mode)
7. Auto-login hoy → tokens paye → Home screen e navigate

### Login Flow
1. Student email + password input kore
2. Submit → `POST /auth/login` (→ 1.4) — optionally `deviceToken` for push notifications
3. Success → tokens save + `refreshToken` httpOnly cookie auto-set → Home screen e navigate
4. "Forgot Password?" link e tap korle → forgot password flow

### Forgot Password Flow
1. Student "Forgot Password?" e tap kore
2. Email input → `POST /auth/forget-password` (→ 1.6)
3. Success → OTP verify screen e navigate (always success — even if email doesn't exist, prevents enumeration)
4. OTP input → `POST /auth/verify-email` (→ 1.2, reset mode — returns reset token)
5. New password + confirm → `POST /auth/reset-password` (→ 1.7) — token pathay
6. Success → Login screen e navigate

### Token Refresh (Background)
1. API call 401 return kore (access token expired)
2. Client auto-retry → `POST /auth/refresh-token` (→ 1.9) — cookie theke token niye
3. New token pair paye → original request retry
4. Refresh token o expire hole → login screen e redirect

---

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
  "message": "User created successfully",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT",
    "verified": false,
    "profilePicture": "https://i.ibb.co/z5YHLV9/profile.png",
    "onboardingCompleted": false,
    "createdAt": "2026-03-15T10:30:00.000Z"
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
  "message": "Verification Successful: Please securely store and utilize this code for reset password",
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
  "message": "Verification code has been resent to your email."
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
  "password": "Password123!",
  "deviceToken": "fcm-device-token-here"
}
```

> `deviceToken` is optional — used for push notifications. Omit if not needed.

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully.",
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
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{
  "deviceToken": "fcm-device-token-here"
}
```

> `deviceToken` is required — server removes it from user's device list.

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
  "message": "Please check your email. We have sent you a one-time passcode (OTP)."
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

## Audit & Review Log

### Changes from Original (2026-03-15)

| # | What | Before | After |
|---|------|--------|-------|
| 1 | Register message (1.1) | `"Please check your email for verification code"` | `"User created successfully"` |
| 2 | Register response (1.1) | Only `_id, name, email` | `_id, name, email, role, verified, profilePicture, onboardingCompleted, createdAt` |
| 3 | Verify reset message (1.2) | `"Verification Successful: You can now reset your password"` | `"Verification Successful: Please securely store and utilize this code for reset password"` |
| 4 | Resend message (1.3) | `"Verification email sent successfully"` | `"Verification code has been resent to your email."` |
| 5 | Login message (1.4) | `"User logged in successfully"` (no period) | `"User logged in successfully."` (trailing period) |
| 6 | Login request (1.4) | No `deviceToken` field | Added optional `deviceToken` for push notifications |
| 7 | Logout request (1.5) | No request body | Added required `deviceToken` in request body |
| 8 | Forget password message (1.6) | `"Please check your email for verification code"` | `"Please check your email. We have sent you a one-time passcode (OTP)."` |
| 9 | UX Flow section | Missing | Added 4 user journeys (Registration, Login, Forgot Password, Token Refresh) |
| 10 | Change Password flow | Was in auth UX Flow | Moved to [10-profile.md](./10-profile.md) (→ 10.7) — belongs to profile screen |
| 11 | Logout flow | Was in auth UX Flow | Already in [10-profile.md](./10-profile.md) UX Flow + 10.6 — removed duplicate from auth |

### Files Checked

| File | What Checked |
|------|-------------|
| `src/app/modules/user/user.controller.ts` | Register message |
| `src/app/modules/user/user.service.ts` | Register response `.select()` fields |
| `src/app/modules/auth/auth.controller.ts` | All auth endpoint messages + cookie handling |
| `src/app/modules/auth/auth.service.ts` | Verify email logic (new user vs reset), login deviceToken, logout deviceToken, refresh token |
| `src/helpers/authHelpers.ts` | Resend OTP logic |

> No code changes — doc-only update.
