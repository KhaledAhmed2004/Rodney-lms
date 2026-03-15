# Screen 10: Profile

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Auth](./01-auth.md) (change password, logout), [Progress](./06-progress.md) (badges in 6.3)

## UX Flow

### Profile Load
1. Student Profile tab e tap kore
2. Page load e parallel call:
   - Profile data → `GET /users/profile` (name, email, avatar, points, streak)
   - Earned badges → `GET /gamification/my-badges` (all badges, newest first)
   - Legal pages → `GET /legal` (terms, privacy etc.)
3. Screen sections render hoy: user info card → badges → legal links → logout

### View Badges
1. Profile e earned badges dekhay (icon + name + earned date)
2. Student badge section e tap korle → navigate to [Progress](./06-progress.md) screen (6.3 badges)
3. Typically 10-20 badges max per student — lightweight, no pagination needed

### Legal Pages
1. Student legal item e tap kore (e.g. "Terms of Service")
2. Full content load hoy → `GET /legal/:slug`
3. Content HTML format e ashe — WebView ba rich text e render hoy

### Edit Profile
1. Student "Edit Profile" button e tap kore
2. Name, phone, gender, dateOfBirth, location edit kore, optionally profile picture change kore
3. Submit → `PATCH /users/profile` (multipart/form-data)
4. Success → profile screen updated data dekhay

### Change Password
1. Student "Change Password" button e tap kore
2. Current password + new password + confirm password input kore
3. Submit → `POST /auth/change-password` (→ 10.7)
4. Success → confirmation dekhay

### Logout
1. Student "Logout" button e tap kore
2. Confirmation dialog dekhay → confirm korle `POST /auth/logout`
3. Server refreshToken cookie clear kore + device token remove kore (push notification band)
4. Client side: stored tokens clear kore → navigate to login screen

---

### 10.1 Get Own Profile

```
GET /users/profile
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile data retrieved successfully",
  "data": {
    "_id": "664a...",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/avatar.jpg",
    "phone": "+8801798765432",
    "gender": "male",
    "dateOfBirth": "1998-05-15",
    "location": "Chittagong, Bangladesh",
    "role": "STUDENT",
    "status": "ACTIVE",
    "verified": true,
    "totalPoints": 450,
    "streak": {
      "current": 7,
      "longest": 14,
      "lastActiveDate": "2026-03-14T10:30:00Z"
    },
    "onboardingCompleted": true
  }
}
```

---

### 10.2 Update Profile

```
PATCH /users/profile
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `name`: "John Updated"
- `gender`: "male"
- `dateOfBirth`: "1998-05-15"
- `location`: "Chittagong, Bangladesh"
- `phone`: "+8801798765432"
- `profilePicture`: (file, optional)

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "664a...",
    "name": "John Updated",
    "email": "john@example.com",
    "profilePicture": "https://cdn.example.com/new-avatar.jpg",
    "phone": "+8801798765432",
    "gender": "male",
    "dateOfBirth": "1998-05-15",
    "location": "Chittagong, Bangladesh"
  }
}
```

---

### 10.3 Get Legal Pages

```
GET /legal
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slug": "terms-of-service",
      "title": "Terms of Service"
    },
    {
      "slug": "privacy-policy",
      "title": "Privacy Policy"
    }
  ]
}
```

---

### 10.4 Get Legal Page by Slug

```
GET /legal/:slug
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms of Service</h1><p>Welcome to our platform...</p>",
    "updatedAt": "2026-02-01T10:00:00Z"
  }
}
```

---

### 10.5 Top Badges

> Same API as [6.3 Get My Achievements](./06-progress.md). Profile screen e all earned badges dekhay.

```
GET /gamification/my-badges
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Badges retrieved successfully",
  "data": [
    {
      "name": "Quiz Master",
      "icon": "https://cdn.example.com/badge.png",
      "description": "Pass 10 quizzes",
      "earnedAt": "2026-03-10T12:00:00Z"
    },
    {
      "name": "First Steps",
      "icon": "https://cdn.example.com/first-steps.png",
      "description": "Complete your first lesson",
      "earnedAt": "2026-03-05T08:30:00Z"
    }
  ]
}
```

> Sorted by `earnedAt: -1` (newest first). Typically 10-20 badges per student — no pagination needed.

---

### 10.6 Logout

> Same API as [1.5 Logout](./01-auth.md). Clears refreshToken cookie + removes device token for push notifications.

```
POST /auth/logout
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged out successfully."
}
```

> Client side: clear stored tokens (accessToken, refreshToken) → navigate to login screen.

---

### 10.7 Change Password

> Same API as [1.8 Change Password](./01-auth.md). Profile screen theke accessible.

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

### Audit Log

#### Round 1 — Profile Response Audit (2026-03-15) — All Fixed

**1. [HIGH] GET /users/profile — STUDENT Role e `.select()` Chilo Na**
- **Problem:** Non-STUDENT role er jonno exclusion chilo (`-achievements -totalPoints -streak -onboardingCompleted -deviceTokens`) but STUDENT er jonno kono `.select()` chilo na — full User document return hoto. `deviceTokens` (push notification tokens), `about`, `achievements`, `__v`, `createdAt`, `updatedAt` shob leak hoto
- **Security:** `deviceTokens` client e expose howa — push notification tokens sensitive data
- **Fix:** STUDENT role er jonno positive `.select()` add kora hoise: `name email profilePicture phone gender dateOfBirth location role status verified totalPoints streak onboardingCompleted`. Ekhon response exactly doc er 10.1 response example match kore
- **Affected:** 10.1 Get Own Profile

**2. [HIGH] PATCH /users/profile — STUDENT Role e `.select()` Chilo Na**
- **Problem:** Same issue — `findOneAndUpdate` e non-STUDENT exclusion chilo but STUDENT er jonno kono `.select()` chilo na. Update response e full document return hoto — `deviceTokens`, `about`, `achievements`, `totalPoints`, `streak`, `__v`, timestamps shob ashto
- **Fix:** STUDENT role er jonno positive `.select()` add kora hoise — shudhu editable fields return hoy: `name email profilePicture phone gender dateOfBirth location`. Response Design Rules follow kore — PATCH e shudhu changeable fields return hoy, full object na
- **Affected:** 10.2 Update Profile

---

#### Round 2 — QA Tester Audit (2026-03-15) — All Fixed

**QA-1 [CRITICAL]: Mass Assignment — Student Privilege Escalation**
- **Problem:** `validateRequest` middleware validate kore but `req.body` parsed output diye replace kore na. `updateUserZodSchema` e `.strict()` chilo na. Student PATCH body te `role: "SUPER_ADMIN"`, `verified: true`, `totalPoints: 999999` pathate parto — shob `findOneAndUpdate` e directly apply hoto. **Any student could become admin in one request**
- **Fix:** `updateUserZodSchema` er body te `.strict()` add kora hoise — unknown fields (role, status, verified, totalPoints etc.) ashle 400 error return kore. Systemic `validateRequest` fix separate PR e recommend kora hoise
- **Affected:** 10.2 Update Profile

**QA-2 [CRITICAL]: Password Change Without Old Password Verification**
- **Problem:** `updateUserZodSchema` e `password` field chilo. Jokhon kono user PATCH /users/profile e `password: "newPass"` pathato, password directly update hoto — purano password verify hoto na. Session hijack korle real user ke permanently lock out kora possible chilo
- **Fix:** `password` field `updateUserZodSchema` theke remove kora hoise. Password change auth module er dedicated endpoint e (old password verify kore) handle hobe
- **Affected:** 10.2 Update Profile

**QA-3 [HIGH]: Email Change Without Uniqueness Check or Re-verification**
- **Problem:** `updateUserZodSchema` e `email` field chilo. (1) Already-taken email dile MongoDB unique index error → unhandled 500 (proper 400 na). (2) Email change korleo `verified: true` theke jeto — unverified email e verified status. Doc eO edit profile e email editable na — shudhu name, phone, gender, dateOfBirth, location, profilePicture
- **Fix:** `email` field `updateUserZodSchema` theke remove kora hoise. Email change alag flow e handle korte hobe (re-verification shoho). `.strict()` er karone ekhon email pathale 400 error ashe
- **Affected:** 10.2 Update Profile

**QA-4 [HIGH]: Soft-Deleted User Can Access & Update Profile**
- **Problem:** Auth middleware shudhu JWT validity + role check kore, user status check kore na. `status: DELETE` er user er JWT expire howar age porjonto profile access + modify korte parto
- **Fix:** `getUserProfileFromDB` e DELETE status check add kora hoise → 403 "Your account has been deleted". `updateProfileToDB` e ACTIVE-only check add kora hoise → non-ACTIVE user (DELETE, RESTRICTED, INACTIVE) profile update korte parbe na → 403 "Your account is not active"
- **Affected:** 10.1 Get Own Profile, 10.2 Update Profile

**QA-5 [MEDIUM]: Whitespace-Only Name Passes Validation**
- **Problem:** `name: z.string().optional()` — no `.trim()`, no `.min(1)`, no `.max()`. User `"   "` pathale Mongoose `trim: true` empty string banay → empty name stored. Max length limit nai — extremely long name eO accept korto
- **Fix:** `name` field e `.trim().min(1, 'Name cannot be empty').max(100)` add kora hoise. `location` field eO `.trim()` add kora hoise
- **Affected:** 10.2 Update Profile

**QA-6 [MEDIUM]: Default Profile Picture URL Passed to deleteFile**
- **Problem:** User model e default `'https://i.ibb.co/z5YHLV9/profile.png'`. First-time picture upload e `deleteFile(defaultUrl)` call hoto — S3/Cloudinary provider e external URL delete korar try hoto, error ba silent fail
- **Fix:** `DEFAULT_PROFILE_PICTURE` constant define kora hoise + `deleteFile` call er age check add kora hoise: `isExistUser.profilePicture !== DEFAULT_PROFILE_PICTURE` hole tokhon delete hobe
- **Affected:** 10.2 Update Profile

**QA-7 [LOW]: Empty PATCH Body Accepted**
- **Problem:** Shob field optional, empty `{}` pathale Zod pass korto → `findOneAndUpdate` empty payload diye run hoto → unchanged data return korto pretending update hoise. Wasted DB round trip
- **Fix:** `.refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' })` add kora hoise `updateUserZodSchema` e
- **Affected:** 10.2 Update Profile

**Systemic Note: `validateRequest` Doesn't Sanitize `req.body`**
- `validateRequest` middleware e `schema.parseAsync()` er parsed result `req.body` te assign hoy na — raw body untouched thake. `.strict()` dile unknown fields reject hoy (400), chara dile silently pass through kore. **Shob module er validation e ei risk ache.** Recommend: `validateRequest` e `req.body = result.body` add koro — but app-wide impact er jonno separate PR e test kore deploy korte hobe

---
