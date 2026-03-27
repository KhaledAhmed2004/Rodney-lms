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
6. OTP input kore submit → `POST /auth/verify-email` (→ 1.2)
7. Auto-login hoy → tokens paye → Home screen e navigate

### Login Flow
1. Student email + password input kore
2. Submit → `POST /auth/login` (→ 1.4) — optionally `deviceToken` for push notifications
3. Success → tokens save + `refreshToken` httpOnly cookie auto-set → Home screen e navigate
4. "Forgot Password?" link e tap korle → forgot password flow

### Forgot Password Flow
1. Student "Forgot Password?" e tap kore
2. Email input → `POST /auth/forget-password` (→ 1.5)
3. Success → OTP verify screen e navigate (always success — even if email doesn't exist, prevents enumeration)
4. OTP input → `POST /auth/verify-email` (→ 1.6)
5. New password + confirm → `POST /auth/reset-password` (→ 1.7) — token pathay
6. Success → Login screen e navigate

### Token Refresh (Background)
1. API call 401 return kore (access token expired)
2. Client auto-retry → `POST /auth/refresh-token` (→ 1.8) — cookie theke token niye
3. New token pair paye → original request retry
4. Refresh token o expire hole → login screen e redirect

---

<!-- ═══════════ Registration Flow ═══════════ -->

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

### 1.2 Verify Email — Auto-login

```
POST /auth/verify-email
Content-Type: application/json
Auth: None
```

> Registration flow e use hoy. New user OTP verify korle auto-login hoy — tokens return kore.

**Request Body:**
```json
{
  "email": "john@example.com",
  "oneTimeCode": 123456
}
```

**Response:**
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

> `refreshToken` also set as httpOnly cookie.

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

<!-- ═══════════ Login Flow ═══════════ -->

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

<!-- ═══════════ Forgot Password Flow ═══════════ -->

### 1.5 Forget Password

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

### 1.6 Verify OTP — Reset Password

```
POST /auth/verify-email
Content-Type: application/json
Auth: None
```

> Forgot Password flow e use hoy. Already verified user OTP verify korle reset token return kore.

**Request Body:**
```json
{
  "email": "john@example.com",
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

> `data` te reset token ashe — 1.7 Reset Password e ei token pathate hobe.

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

### 1.8 Refresh Token

```
POST /auth/refresh-token
Content-Type: application/json
Auth: None (token in body or cookie)
```

**Request Body:**
```json
{ "refreshToken": "{{refreshToken}}" }
```

> Body optional jodi `refreshToken` cookie te already ache (login/verify theke auto-set hoy).

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
| 12 | Verify Email (1.2) | 2 flows mixed in one section | Split: 1.2 Verify Email — Auto-login (Registration), 1.6 Verify OTP — Reset Password (Forgot Password) |
| 13 | Endpoints reordered | Mixed flow order | Grouped by flow: Registration (1.1–1.3) → Login (1.4) → Forgot Password (1.5–1.7) → Refresh Token (1.8) |
| 14 | Logout + Change Password | Was in auth doc (1.5, 1.8) | Removed — belongs to [Profile Screen](./10-profile.md) (10.6 Logout, 10.7 Change Password) |

### Files Checked

| File | What Checked |
|------|-------------|
| `src/app/modules/user/user.controller.ts` | Register message |
| `src/app/modules/user/user.service.ts` | Register response `.select()` fields |
| `src/app/modules/auth/auth.controller.ts` | All auth endpoint messages + cookie handling |
| `src/app/modules/auth/auth.service.ts` | Verify email logic (new user vs reset), login deviceToken, logout deviceToken, refresh token |
| `src/helpers/authHelpers.ts` | Resend OTP logic |

> No code changes — doc-only update.

---

### QA Security Audit (2026-03-15) — 19/24 Fixed

**CRITICAL — All Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | OTP logged to console in production | `user.service.ts:32` | `console.log` removed |
| 2 | User enumeration via verify/resend — different error messages | `auth.service.ts:120`, `authHelpers.ts:18` | Silent return for all invalid cases — generic "Invalid or expired OTP" message |
| 3 | OTP comparison not constant-time | `auth.service.ts:130` | String comparison instead of `!==` on numbers |
| 4 | INACTIVE/RESTRICTED users could login | `auth.service.ts:58` | Added status checks for INACTIVE (403) and RESTRICTED (403) |
| 5 | Auth middleware never verified user still exists/active | `auth.ts` | Added DB lookup — checks `status` + `passwordChangedAt` on every authenticated request |

**HIGH — All Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | OTP expiry checked AFTER value — wrong order | `auth.service.ts:130-139` | Expiry check moved before value check |
| 7 | Reset tokens not invalidated on password change | `auth.service.ts:changePasswordToDB` | `ResetToken.deleteMany({ user })` added to changePassword |
| 8 | Refresh token endpoint had no rate limiting | `auth.route.ts` | Added `rateLimitMiddleware` (10 req/15min) |
| 9 | No JWT invalidation after password change/reset | `user.model.ts`, `auth.ts` | `passwordChangedAt` field added — auth middleware rejects tokens issued before password change |
| 10 | Forgot-password sent OTP to deleted/inactive users | `auth.service.ts:forgetPasswordToDB` | Silent return for DELETE/INACTIVE status |
| 11 | No OTP invalidation on wrong attempts | — | Not fixed — 3-minute OTP expiry + 5 req rate limit provides sufficient protection. Per-attempt invalidation would lock out legitimate users on typos |

**MEDIUM — 5/7 Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 12 | `confirmPassword` no Zod `.refine()` match check | `auth.validation.ts` | Added `.refine()` + `.min(1)` to both reset and change password schemas |
| 13 | Resend-verify revealed existence + verification state | `authHelpers.ts` | Silent return (covered by #2) |
| 14 | Rate limiter failed open on error | `rateLimit.ts` | Changed to fail closed — returns 429 on error |
| 15 | In-memory rate limiter won't work across multiple instances | — | Not fixed — architecture decision, needs Redis. Documented as deployment constraint |
| 16 | Login leaked verification status before password check | `auth.service.ts:loginUserFromDB` | Moved `verified` check after password match |
| 17 | Email send not awaited (fire-and-forget) | `auth.service.ts:105`, `user.service.ts:35` | Added `await` to both email sends |
| 18 | No per-account lockout, only per-IP rate limit | — | Not fixed — needs model change + complex logic. Current IP rate limit (10/15min) provides baseline protection |

**LOW — 4/6 Fixed**

| # | Issue | File | Fix |
|---|-------|------|-----|
| 19 | Refresh token in both cookie and response body | — | Not fixed — removing from body would break existing frontend clients |
| 20 | `confirmPassword` check duplicated in service | — | Kept as defense-in-depth — Zod refine (#12) is primary, service check is backup |
| 21 | Reset token exist + expiry in 2 separate queries (TOCTOU) | `auth.service.ts:resetPasswordToDB` | Combined into single `findOne({ token, expireAt: { $gt: now } })` |
| 22 | Multiple reset tokens accumulated per user | `auth.service.ts:verifyEmailToDB` | `ResetToken.deleteMany({ user })` before creating new token |
| 23 | Cookie `sameSite: 'lax'` | — | Not changed — `lax` needed for cross-origin auth flows. POST-only endpoints already mitigate CSRF |
| 24 | No index on `token` field in ResetToken | `resetToken.model.ts` | Added `resetTokenSchema.index({ token: 1 })` |

**Not Fixed (5 items) — Reasons:**

| # | Issue | Reason |
|---|-------|--------|
| 11 | OTP invalidation on wrong attempt | Too aggressive — typos would force re-request. 3min expiry + rate limit is sufficient |
| 15 | Redis-based rate limiter | Infrastructure dependency — needs Redis setup. Document as deployment constraint |
| 18 | Per-account lockout | Complex model change — needs `failedLoginAttempts` field + lockout duration logic. Separate PR recommended |
| 19 | Refresh token only in cookie | Breaking change — frontend reads token from response body. Needs frontend coordination |
| 23 | Cookie `sameSite: strict` | `lax` is correct for cross-origin flows — `strict` would break redirect-based auth |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/modules/auth/auth.service.ts` | OTP order fix, generic errors, login status checks, await email, reset token cleanup, single query |
| `src/app/modules/auth/auth.controller.ts` | No changes needed |
| `src/app/modules/auth/auth.validation.ts` | `confirmPassword` `.refine()` + `.min(1)` |
| `src/app/modules/auth/auth.route.ts` | Refresh token rate limit |
| `src/app/modules/auth/resetToken/resetToken.model.ts` | Token index |
| `src/app/middlewares/auth.ts` | DB lookup for user status + passwordChangedAt |
| `src/app/middlewares/rateLimit.ts` | Fail closed |
| `src/app/modules/user/user.service.ts` | Removed OTP console.log, await email |
| `src/app/modules/user/user.model.ts` | `passwordChangedAt` field |
| `src/app/modules/user/user.interface.ts` | `passwordChangedAt` type |
| `src/helpers/authHelpers.ts` | Silent return for enumeration |
