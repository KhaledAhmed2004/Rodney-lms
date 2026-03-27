# Screen 1: Auth

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Profile](./14-profile.md) (change password, logout)

## UX Flow

### Login Flow
1. Admin email + password input kore
2. Submit → `POST /auth/login` (→ 1.1)
3. Success → tokens save + `refreshToken` httpOnly cookie auto-set → Overview dashboard e navigate
4. "Forgot Password?" link e click korle → forgot password flow

### Forgot Password Flow
1. Admin "Forgot Password?" e click kore
2. Email input → `POST /auth/forget-password` (→ 1.2)
3. Success → OTP verify screen e navigate (always success — even if email doesn't exist, prevents enumeration)
4. OTP input → `POST /auth/verify-email` (→ 1.3)
5. New password + confirm → `POST /auth/reset-password` (→ 1.4) — token pathay
6. Success → Login screen e navigate

### Token Refresh (Background)
1. API call 401 return kore (access token expired)
2. Client auto-retry → `POST /auth/refresh-token` (→ 1.5) — cookie theke token niye
3. New token pair paye → original request retry
4. Refresh token o expire hole → login screen e redirect

---

<!-- ═══════════ Login Flow ═══════════ -->

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

> Dashboard login e `deviceToken` lagbe na — push notifications shudhu mobile app er jonno.

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

<!-- ═══════════ Forgot Password Flow ═══════════ -->

### 1.2 Forget Password

```
POST /auth/forget-password
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{ "email": "admin@example.com" }
```

**Response:**
```json
{
  "success": true,
  "message": "Please check your email. We have sent you a one-time passcode (OTP)."
}
```

---

### 1.3 Verify OTP — Reset Password

```
POST /auth/verify-email
Content-Type: application/json
Auth: None
```

> Admin already verified — OTP verify korle reset token return kore (auto-login hoy na).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "oneTimeCode": 123456
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification Successful: Please securely store and utilize this code for reset password",
  "data": "a3f8c2e1b4d7..."
}
```

> `data` te reset token ashe — 1.4 Reset Password e ei token pathate hobe.

---

### 1.4 Reset Password

```
POST /auth/reset-password
Content-Type: application/json
Auth: None
```

**Request Body:**
```json
{
  "token": "a3f8c2e1b4d7...",
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

<!-- ═══════════ Background ═══════════ -->

### 1.5 Refresh Token

```
POST /auth/refresh-token
Content-Type: application/json
Auth: None (token in body or cookie)
```

**Request Body:**
```json
{ "refreshToken": "{{refreshToken}}" }
```

> Body optional jodi `refreshToken` cookie te already ache (login theke auto-set hoy).

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

> `refreshToken` cookie o rotate hoy — new token set kore.

---

> **Logout + Change Password** → [Profile Screen](./14-profile.md) e documented — auth screen er part na, profile/settings theke accessible.
