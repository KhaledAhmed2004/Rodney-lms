# Auth Module Audit

**Date**: 2026-03-14
**Module**: `src/app/modules/auth/`
**Status**: Reviewed + Fixed

## Context

Auth module er comprehensive security + code quality audit. Multiple critical vulnerabilities fix kora hoyeche — OTP leak, brute-force vulnerability, missing validation, user enumeration, bcrypt DoS, etc.

---

## Files Reviewed

- `src/app/modules/auth/auth.controller.ts`
- `src/app/modules/auth/auth.service.ts`
- `src/app/modules/auth/auth.validation.ts`
- `src/app/modules/auth/auth.route.ts`
- `src/app/modules/auth/resetToken/resetToken.interface.ts`
- `src/app/modules/auth/resetToken/resetToken.model.ts`
- `src/helpers/authHelpers.ts`
- `src/helpers/jwtHelper.ts`
- `src/util/generateOTP.ts`
- `src/app/middlewares/auth.ts`
- `src/app/middlewares/rateLimit.ts`
- `src/types/auth.ts`

---

## Issues Found & Fixed

### Critical Security (Priority 1)

| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|
| 1 | OTP leaked in `resendVerifyEmail` response — `sendVerificationOTP()` returned `{ otp }`, controller sent it to client | CRITICAL | `authHelpers.ts:41`, `auth.controller.ts:117` | Removed return value, removed `data: result` from controller |
| 2 | `forgetPassword` controller passed `data: result` (potential future OTP leak) | HIGH | `auth.controller.ts:86` | Removed `data: result` from response |
| 3 | OTP only 4 digits (9000 combinations) — trivially brute-forced | CRITICAL | `generateOTP.ts` | Changed to 6-digit using `crypto.randomInt(100000, 999999)` |
| 4 | `resendVerifyEmail` route had NO Zod validation | HIGH | `auth.route.ts:53` | Created `createResendVerifyEmailZodSchema`, added `validateRequest` to route |
| 5 | No `.email()` validation on any email field — `"abc123"` passed | HIGH | `auth.validation.ts:5,12,19` | Added `.email().toLowerCase().trim()` via shared `emailSchema` |
| 6 | No password `.max()` — 1MB string causes bcrypt CPU exhaustion (DoS) | CRITICAL | `auth.validation.ts` | Added `.max(128)` to all password fields |
| 7 | No rate limiting on any auth endpoint — brute-force wide open | CRITICAL | `auth.route.ts` | Added `rateLimitMiddleware` to login (10/15min), forget-password (3/15min), verify-email (5/15min), resend-verify (3/15min), reset-password (5/15min) |

### Important Security (Priority 2)

| # | Issue | Severity | Where | Fix |
|---|-------|----------|-------|-----|
| 8 | Login error messages leak user existence — different messages for "not found", "unverified", "wrong password" | MEDIUM | `auth.service.ts:28,33,50` | Generic "Invalid email or password" for not-found + wrong-password + deleted. Kept "verify your account" (actionable) |
| 9 | `forgetPassword` threw error if email not found — reveals email existence | MEDIUM | `auth.service.ts:88` | Silent return if user not found (same success response either way) |
| 10 | ResetToken no TTL index — expired tokens persist forever in DB | MEDIUM | `resetToken.model.ts` | Added `resetTokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })` |
| 11 | ResetToken not invalidated after use — reusable within 5-min window | MEDIUM | `auth.service.ts:236` | Added `await ResetToken.deleteOne({ token })` after successful reset |
| 12 | `changePassword` conditional bug — `currentPassword &&` could skip password check | MEDIUM | `auth.service.ts:252` | Removed `currentPassword &&` guard |
| 13 | `console.log('deviceToken')` left in production code | LOW | `auth.controller.ts:57` | Removed |
| 14 | No password strength validation — `"a"` accepted as password | MEDIUM | `auth.validation.ts` | Shared `passwordSchema` with `.min(8).max(128)` for new/reset passwords |

### Code Quality (Priority 3)

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 15 | Token generation logic duplicated 3x (login, verify, refresh) | `auth.service.ts:54-65, 145-154, 316-327` | Extracted `generateTokenPair()` helper |
| 16 | Cookie options duplicated 4x with inconsistent `path` | `auth.controller.ts:19-23, 40-44, 63-67, 137-141` | Extracted `REFRESH_TOKEN_COOKIE` constant with consistent `path: '/'` |
| 17 | Reset token in Authorization header — non-standard, conflicts with JWT pattern | `auth.controller.ts:91` | Moved to request body: `{ token, newPassword, confirmPassword }` |

### Documentation Sync (Priority 4)

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 18 | Docs said 6-digit OTP but code used 4-digit | `authentication-flow.md` | Code fixed to 6-digit, docs already correct |
| 19 | Docs said rate limiting exists but code had none | `authentication-flow.md` | Code fixed, docs updated with actual limits |
| 20 | Docs said reset token TTL 1 hour but code used 5 min | `authentication-flow.md` | Docs updated to match code (5 min) |
| 21 | Docs referenced wrong roles (ADMIN/SELLER/BUYER vs SUPER_ADMIN/STUDENT) | `authentication-flow.md` | Docs updated to actual roles |
| 22 | Postman collection had reset token in Authorization header | `postman-collection.json` | Updated to body format |

---

## What Was Already Good

| # | Pattern | Where |
|---|---------|-------|
| 1 | Password field `select: false` in User schema | `user.model.ts` |
| 2 | Authentication object `select: false` (OTP hidden by default) | `user.model.ts` |
| 3 | httpOnly cookies for refresh token | `auth.controller.ts` |
| 4 | OTP 3-minute expiry | `auth.service.ts`, `authHelpers.ts` |
| 5 | Reset token 5-minute expiry | `auth.service.ts:175` |
| 6 | Auto-login after email verification (industry standard) | `auth.service.ts` |
| 7 | Refresh token rotation on each refresh | `auth.service.ts` |
| 8 | Device token tracking with `$addToSet` / `$pull` | `user.model.ts` |
| 9 | Role-based access on sensitive ops (logout, change-password) | `auth.route.ts` |
| 10 | Cookie + body fallback for refresh token (mobile support) | `auth.controller.ts` |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/helpers/authHelpers.ts` | Removed OTP return value |
| `src/util/generateOTP.ts` | 4-digit → 6-digit, `Math.random()` → `crypto.randomInt()` |
| `src/app/modules/auth/auth.validation.ts` | Email format, password max/min, shared schemas, resend schema |
| `src/app/modules/auth/auth.route.ts` | Rate limiting on 5 endpoints, resend validation |
| `src/app/modules/auth/auth.service.ts` | Generic errors, token helper, silent forgetPassword, token invalidation, password check fix |
| `src/app/modules/auth/auth.controller.ts` | Cookie constant, console.log removed, OTP leak removed, reset token from body |
| `src/app/modules/auth/resetToken/resetToken.model.ts` | TTL index added |
| `src/types/auth.ts` | `IAuthResetPassword` — added `token` field |
| `docs/architecture/authentication-flow.md` | Roles, OTP, rate limits, reset token flow synced |
| `public/postman-collection.json` | Reset password body updated |

---

## Remaining Considerations

| # | Item | Priority | Note |
|---|------|----------|------|
| 1 | Auth middleware doesn't check cookies — only Authorization header | LOW | Docs say cookie check ache but code e nei. Ekhon frontend Bearer header use kore, so functional impact nai |
| 2 | No account lockout after failed attempts | LOW | Rate limiting cover kore partially, but per-account lockout would be better |
| 3 | No refresh token blacklist/revocation | LOW | If token compromised, no way to revoke. Would need Redis-based blacklist |
| 4 | `verifyEmail` dual-purpose endpoint (verify + reset) | LOW | Works but confusing API contract. Consider splitting in future |
| 5 | No auth tests exist | MEDIUM | Test infrastructure ready (Vitest + MongoDB Memory Server) but no auth test files written |
