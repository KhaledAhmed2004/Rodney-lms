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

---

## Edge Cases
- **Non-existent email** (forget-password): Silent success — same response as valid email (enumeration prevention)
- **Deleted/Inactive account**: OTP sent hoy na, but same success response
- **Expired OTP**: Generic "Invalid or expired OTP" — no hint about expiry vs wrong code
- **Wrong OTP**: Same generic error — no attempt count revealed
- **Expired reset token**: "Invalid or expired reset token" — token auto-deleted by TTL index
- **Token reuse**: Old tokens deleted on new OTP — single-use
- **Password mismatch**: Zod `.refine()` catches at validation layer
- **Rate limit exceeded**: 3 req/15min forget-password, 5 req/15min verify + reset

---

## Audit & Review Log

### Code Audit (2026-03-28)

**Doc vs Code verified ✅:**

| Endpoint | Response Message | Response Shape | Match? |
|----------|:---:|:---:|:---:|
| 1.1 Login | ✅ | ✅ `{ accessToken, refreshToken }` | ✅ |
| 1.2 Forget Password | ✅ | ✅ no data | ✅ |
| 1.3 Verify OTP | ✅ | ✅ reset token string | ✅ |
| 1.4 Reset Password | ✅ | ✅ no data | ✅ |
| 1.5 Refresh Token | ✅ | ✅ `{ accessToken, refreshToken }` | ✅ |

**Security audit passed:**
- Email enumeration prevention (silent return) ✅
- OTP expiry checked BEFORE value comparison ✅
- Rate limiting on all auth endpoints ✅
- Reset token TTL 5min + auto-cleanup index ✅
- All old tokens invalidated on new OTP ✅
- `isResetPassword` permission flag check ✅
- bcrypt password hashing ✅
- `authentication` field `select: false` ✅

**Issue found & fixed:**

| # | Issue | Fix |
|---|-------|-----|
| 1 | `confirmPassword` validation `.min(1)` — allows 1-char password as confirm | Changed to `passwordSchema` (min 8, max 128) — consistent with `newPassword`. Same fix in `createChangePasswordZodSchema` |

**Remaining observations (not bugs):**

| # | Observation | Priority | Note |
|---|------------|:--------:|------|
| 1 | OTP expiry (3min) + reset token expiry (5min) hardcoded | P2 | Extract to config constant |
| 2 | `verifyEmail` returns different shapes: `{ tokens }` (new user) vs string (reset) | P2 | Frontend handles both — functional, but inconsistent |
| 3 | No audit logging for password reset attempts | P2 | Cannot track suspicious activity |
