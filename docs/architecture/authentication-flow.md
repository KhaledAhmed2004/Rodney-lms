# Authentication Flow Documentation

**Project:** Enterprise Backend Template
**Authentication:** JWT
**Last Updated:** 2026-03-14

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Architecture](#authentication-architecture)
3. [Registration Flow](#registration-flow)
4. [Login Flow](#login-flow)
5. [Password Reset Flow](#password-reset-flow)
6. [JWT Token System](#jwt-token-system)
7. [Authorization & RBAC](#authorization--rbac)
8. [Security Best Practices](#security-best-practices)

---

## 🎯 Overview

This application implements a comprehensive authentication system:

- **Local Authentication**: Email/password with JWT tokens
- **Password Reset**: Secure token-based password recovery
- **Role-Based Access Control**: Super Admin, Student roles
- **Email Verification**: Confirm email addresses

### Authentication Stack

- **Strategy**: JWT (JSON Web Tokens)
- **Token Storage**: HTTP-only cookies + Authorization header
- **Password Hashing**: bcrypt (12 rounds)
- **Email Service**: Nodemailer

---

## 🏗️ Authentication Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  (Browser, Mobile App, Postman)                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 API Gateway Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   CORS   │  │  Morgan  │  │   Auth   │             │
│  │          │  │          │  │Middleware│             │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Authentication Module                      │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  Auth Controller │  │  Auth Service    │            │
│  │  - register      │  │  - createUser    │            │
│  │  - login         │  │  - validateCreds │            │
│  │  - resetPassword │  │  - generateTokens│            │
│  │                  │  │  - sendEmails    │            │
│  └──────────────────┘  └──────────────────┘             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐         │
│  │   User   │  │  Reset   │  │  JWT Helper  │         │
│  │  Model   │  │  Token   │  │              │         │
│  └──────────┘  └──────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Authentication Files

```
src/app/modules/auth/
├── auth.controller.ts          # HTTP request handlers
├── auth.service.ts             # Business logic
├── auth.route.ts               # Express routes
├── auth.validation.ts          # Zod schemas
└── resetToken/
    ├── resetToken.model.ts     # Password reset tokens
    └── resetToken.interface.ts # Types

src/helpers/
├── jwtHelper.ts                # JWT utilities
└── emailHelper.ts              # Email sending

src/app/middlewares/
└── auth.ts                     # JWT verification middleware
```

---

## 📝 Registration Flow

### Step-by-Step Process

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ 1. POST /api/v1/auth/register
       │    { name, email, password, role }
       ▼
┌────────────────────┐
│ Validation Layer   │ 2. Validate with Zod schema
│ (validateRequest)  │    - Email format
└──────┬─────────────┘    - Password strength
       │                  - Required fields
       ▼
┌────────────────────┐
│ Auth Controller    │ 3. Extract request data
│ .register()        │    - req.body
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Auth Service      │ 4. Check email uniqueness
│ .register()        │    - User.findOne({ email })
└──────┬─────────────┘
       │ Email exists?
       ├─ Yes ──► Throw ApiError(409, 'Email exists')
       │
       └─ No
       │
       ▼
┌────────────────────┐
│  User Model        │ 5. Hash password (pre-save hook)
│ pre('save')        │    - bcrypt.hash(password, 12)
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Database          │ 6. Save user
│ User.create()      │    - Insert document
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Email Service     │ 7. Send verification email
│ sendEmail()        │    - Welcome message
└──────┬─────────────┘    - Verification link
       │
       ▼
┌────────────────────┐
│  JWT Helper        │ 8. Generate tokens
│ createToken()      │    - Access token (1 day)
└──────┬─────────────┘    - Refresh token (7 days)
       │
       ▼
┌────────────────────┐
│  Response          │ 9. Set cookies + send response
│ res.cookie()       │    - accessToken (httpOnly)
└──────┬─────────────┘    - refreshToken (httpOnly)
       │
       ▼
┌────────────┐
│   Client   │ 10. Receive tokens + user data
└────────────┘
```

### Code Implementation

**Route**: `src/app/modules/auth/auth.route.ts`
```typescript
router.post(
  '/register',
  validateRequest(AuthValidation.register),
  rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), // 5 per 15 minutes
  AuthController.register
);
```

**Validation**: `src/app/modules/auth/auth.validation.ts`
```typescript
const register = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Need uppercase letter')
      .regex(/[a-z]/, 'Need lowercase letter')
      .regex(/[0-9]/, 'Need number'),
    role: z.nativeEnum(USER_ROLE).default(USER_ROLE.STUDENT),
  }),
});
```

**Controller**: `src/app/modules/auth/auth.controller.ts`
```typescript
const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);

  // Set cookies
  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'User registered successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});
```

**Service**: `src/app/modules/auth/auth.service.ts`
```typescript
const register = async (payload: {
  name: string;
  email: string;
  password: string;
  role: USER_ROLE;
}) => {
  // 1. Check if email exists
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // 2. Create user (password hashed by pre-save hook)
  const user = await User.create(payload);

  // 3. Send verification email
  await sendVerificationEmail(user.email, user._id.toString());

  // 4. Generate tokens
  const accessToken = jwtHelper.createToken(
    { userId: user._id, role: user.role },
    config.jwt_secret as string,
    config.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    { userId: user._id },
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expire_in as string
  );

  // 5. Remove password from response
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
  };
};
```

**Password Hashing** (Model Pre-Save Hook): `src/app/modules/user/user.model.ts`
```typescript
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  const saltRounds = Number(config.bcrypt_salt_rounds); // 12
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});
```

---

## 🔐 Login Flow

### Step-by-Step Process

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ 1. POST /api/v1/auth/login
       │    { email, password }
       ▼
┌────────────────────┐
│ Validation Layer   │ 2. Validate credentials
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│ Auth Controller    │ 3. Extract email & password
│ .login()           │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Auth Service      │ 4. Find user by email
│ .login()           │    - User.findOne({ email }).select('+password')
└──────┬─────────────┘
       │ User exists?
       ├─ No ──► Throw ApiError(401, 'Invalid credentials')
       │
       └─ Yes
       │
       ▼
┌────────────────────┐
│  User Model        │ 5. Compare password
│ .comparePassword() │    - bcrypt.compare(input, hashed)
└──────┬─────────────┘
       │ Password match?
       ├─ No ──► Throw ApiError(401, 'Invalid credentials')
       │
       └─ Yes
       │
       ▼
┌────────────────────┐
│  Check Status      │ 6. Verify user status
│                    │    - status === 'blocked'? Error
└──────┬─────────────┘    - status === 'deleted'? Error
       │
       ▼
┌────────────────────┐
│  JWT Helper        │ 7. Generate tokens
│ createToken()      │    - Access token
└──────┬─────────────┘    - Refresh token
       │
       ▼
┌────────────────────┐
│  Response          │ 8. Set cookies + send response
└──────┬─────────────┘
       │
       ▼
┌────────────┐
│   Client   │ 9. Receive tokens + user data
└────────────┘
```

### Code Implementation

**Route**:
```typescript
router.post('/login', validateRequest(AuthValidation.login), AuthController.login);
```

**Validation**:
```typescript
const login = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password required'),
  }),
});
```

**Controller**:
```typescript
const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  res.cookie('accessToken', result.accessToken, cookieOptions);
  res.cookie('refreshToken', result.refreshToken, cookieOptions);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});
```

**Service**:
```typescript
const login = async (payload: { email: string; password: string }) => {
  // 1. Find user (include password field)
  const user = await User.findOne({ email: payload.email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 2. Check account status
  if (user.status === USER_STATUS.BLOCKED) {
    throw new ApiError(403, 'Your account has been blocked');
  }

  if (user.status === USER_STATUS.DELETED) {
    throw new ApiError(403, 'Account not found');
  }

  // 3. Compare password
  const isPasswordValid = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 4. Generate tokens
  const accessToken = jwtHelper.createToken(
    { userId: user._id, role: user.role },
    config.jwt_secret as string,
    config.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    { userId: user._id },
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expire_in as string
  );

  // 5. Remove password
  const userObject = user.toObject();
  delete userObject.password;

  return { user: userObject, accessToken, refreshToken };
};
```

**Password Comparison** (Model Instance Method):
```typescript
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Usage in service:
const isPasswordValid = await user.comparePassword(payload.password);
```

---

## 🔑 Password Reset Flow

### Step-by-Step Process

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ 1. POST /api/v1/auth/forgot-password
       │    { email }
       ▼
┌────────────────────┐
│  Auth Service      │ 2. Find user by email
│ .forgotPassword()  │
└──────┬─────────────┘
       │ User exists?
       ├─ No ──► Return success (don't reveal if email exists)
       │
       └─ Yes
       │
       ▼
┌────────────────────┐
│  Crypto Token      │ 3. Generate secure token
│ crypto.randomBytes │    - 32 bytes random token
└──────┬─────────────┘    - Hash with SHA256
       │
       ▼
┌────────────────────┐
│  ResetToken Model  │ 4. Save hashed token
│ .create()          │    - user, token, expiresAt (5 minutes)
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Email Service     │ 5. Send reset email
│ sendEmail()        │    - Reset link with plain token
└──────┬─────────────┘    - Expires in 5 minutes
       │
       ▼
┌────────────┐
│   Client   │ 6. User clicks reset link
└──────┬─────┘    GET /reset-password?token=...
       │
       ▼
┌────────────┐
│   Client   │ 7. POST /api/v1/auth/reset-password
└──────┬─────┘    { token, newPassword, confirmPassword }
       │
       ▼
┌────────────────────┐
│  Auth Service      │ 8. Hash token & find in DB
│ .resetPassword()   │    - Hash submitted token
└──────┬─────────────┘    - ResetToken.findOne({ token, expiresAt > now })
       │ Token valid?
       ├─ No ──► Throw ApiError(400, 'Invalid or expired token')
       │
       └─ Yes
       │
       ▼
┌────────────────────┐
│  User Model        │ 9. Update password
│ .findByIdAndUpdate │    - Pre-save hook hashes password
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  ResetToken        │ 10. Mark token as used
│ .updateOne()       │     - { used: true }
└──────┬─────────────┘
       │
       ▼
┌────────────┐
│   Client   │ 11. Password reset successful
└────────────┘
```

### Code Implementation

**Forgot Password**:
```typescript
const forgotPassword = async (email: string) => {
  // 1. Find user
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists
    return { message: 'If email exists, reset link sent' };
  }

  // 2. Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // 3. Save token (expires in 5 minutes)
  await ResetToken.create({
    user: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  // 4. Send email
  const resetUrl = `${config.frontend_url}/reset-password?token=${resetToken}`;
  await sendEmail(
    user.email,
    'Password Reset',
    `Click here to reset password: ${resetUrl}`
  );

  return { message: 'If email exists, reset link sent' };
};
```

**Reset Password**:
```typescript
const resetPassword = async (token: string, newPassword: string) => {
  // 1. Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // 2. Find valid token
  const resetToken = await ResetToken.findOne({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
    used: false,
  });

  if (!resetToken) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // 3. Update password
  const user = await User.findByIdAndUpdate(
    resetToken.user,
    { password: newPassword },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // 4. Mark token as used
  await ResetToken.updateOne({ _id: resetToken._id }, { used: true });

  return { message: 'Password reset successful' };
};
```

**ResetToken Model**: `src/app/modules/auth/resetToken/resetToken.model.ts`
```typescript
const resetTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: Auto-delete expired tokens
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResetToken = model('ResetToken', resetTokenSchema);
```

---

## 🎫 JWT Token System

### Token Structure

**Access Token Payload:**
```typescript
{
  userId: "507f1f77bcf86cd799439011",
  role: "buyer",
  iat: 1700000000,  // Issued at
  exp: 1700086400   // Expires at (1 day later)
}
```

**Refresh Token Payload:**
```typescript
{
  userId: "507f1f77bcf86cd799439011",
  iat: 1700000000,
  exp: 1700604800   // Expires at (7 days later)
}
```

### JWT Helper Functions

**Location**: `src/helpers/jwtHelper.ts`

**Create Token:**
```typescript
const createToken = (
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};
```

**Verify Token:**
```typescript
const verifyToken = (token: string, secret: string): JwtPayload => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
};
```

### Auth Middleware

**Location**: `src/app/middlewares/auth.ts`

```typescript
const auth = (...requiredRoles: USER_ROLE[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Extract token from cookie or header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'You are not authorized');
    }

    // 2. Verify token
    const decoded = jwtHelper.verifyToken(token, config.jwt_secret as string);

    // 3. Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // 4. Check if account is blocked/deleted
    if (user.status === USER_STATUS.BLOCKED) {
      throw new ApiError(403, 'Your account has been blocked');
    }

    if (user.status === USER_STATUS.DELETED) {
      throw new ApiError(403, 'Account not found');
    }

    // 5. Check role permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }

    // 6. Attach user to request
    req.user = user;

    next();
  });
};

export default auth;
```

**Usage in Routes:**
```typescript
// Public route (no auth)
router.get('/products', ProductController.getAll);

// Protected route (any authenticated user)
router.get('/profile', auth(), UserController.getMyProfile);

// Role-based route (only super admins)
router.delete('/users/:id', auth(USER_ROLE.SUPER_ADMIN), UserController.deleteUser);

// Multiple roles allowed
router.post('/courses', auth(USER_ROLE.SUPER_ADMIN), CourseController.create);
```

### Token Refresh Flow

```typescript
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  // 1. Get refresh token
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token not found');
  }

  // 2. Verify refresh token
  const decoded = jwtHelper.verifyToken(
    refreshToken,
    config.jwt_refresh_secret as string
  );

  // 3. Find user
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // 4. Generate new access token
  const newAccessToken = jwtHelper.createToken(
    { userId: user._id, role: user.role },
    config.jwt_secret as string,
    config.jwt_expire_in as string
  );

  // 5. Send new access token
  res.cookie('accessToken', newAccessToken, cookieOptions);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Token refreshed',
    data: { accessToken: newAccessToken },
  });
});
```

---

## 🛡️ Authorization & RBAC

### Role-Based Access Control (RBAC)

**User Roles**: `src/app/modules/user/user.interface.ts`
```typescript
export enum USER_ROLE {
  SUPER_ADMIN = 'super_admin',
  STUDENT = 'student',
}
```

### Permission Matrix

| Endpoint | Super Admin | Student | Public |
|----------|-------------|---------|--------|
| **Auth** |
| POST /register | ✅ | ✅ | ✅ |
| POST /login | ✅ | ✅ | ✅ |
| POST /forgot-password | ✅ | ✅ | ✅ |
| **Users** |
| GET /users | ✅ | ❌ | ❌ |
| GET /users/:id | ✅ | ✅* | ❌ |
| PATCH /users/:id | ✅ | ✅* | ❌ |
| DELETE /users/:id | ✅ | ❌ | ❌ |
| **Courses** |
| GET /courses | ✅ | ✅ | ✅ |
| POST /courses | ✅ | ❌ | ❌ |
| PATCH /courses/:id | ✅ | ❌ | ❌ |
| DELETE /courses/:id | ✅ | ❌ | ❌ |

*\* = Only own resources*

### Resource Ownership Check

**Pattern**: Check if user owns the resource

```typescript
const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.id;
  const userId = req.user._id;

  // 1. Find product
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // 2. Check ownership (unless admin)
  if (req.user.role !== USER_ROLE.SUPER_ADMIN && resource.owner.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only update your own resources');
  }

  // 3. Update product
  const result = await ProductService.updateProduct(productId, req.body);

  sendResponse(res, { success: true, statusCode: 200, data: result });
});
```

---

## 🔒 Security Best Practices

### 1. Password Security

**✅ DO:**
- Hash passwords with bcrypt (12+ rounds)
- Never store plain-text passwords
- Enforce strong password requirements (min 8 chars, uppercase, lowercase, number)
- Use `select: false` for password field

**❌ DON'T:**
- Use weak hashing (MD5, SHA1)
- Hash passwords in controller (use model hooks)
- Return passwords in responses

### 2. JWT Security

**✅ DO:**
- Use strong secrets (32+ random characters)
- Set short expiration for access tokens (1 day)
- Store tokens in httpOnly cookies
- Verify tokens on every protected request

**❌ DON'T:**
- Store secrets in code (use environment variables)
- Use long expiration (> 7 days for access tokens)
- Store tokens in localStorage (XSS vulnerable)
- Skip token verification

### 3. Cookie Security

**✅ DO:**
```typescript
res.cookie('accessToken', token, {
  httpOnly: true,     // Prevent JavaScript access
  secure: true,       // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 86400000,   // 1 day
});
```

**❌ DON'T:**
```typescript
res.cookie('accessToken', token, {
  httpOnly: false,    // ❌ Vulnerable to XSS
  secure: false,      // ❌ Vulnerable to interception
  sameSite: 'none',   // ❌ Vulnerable to CSRF
});
```

### 4. Rate Limiting

**Protect against brute force:**
```typescript
// Login: 10 requests per 15 minutes
router.post(
  '/login',
  rateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000 }),
  AuthController.login
);

// Forget password: 3 requests per 15 minutes
router.post(
  '/forget-password',
  rateLimit({ maxRequests: 3, windowMs: 15 * 60 * 1000 }),
  AuthController.forgetPassword
);

// Verify email: 5 requests per 15 minutes
router.post(
  '/verify-email',
  rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 }),
  AuthController.verifyEmail
);

// Resend verify email: 3 requests per 15 minutes
router.post(
  '/resend-verify-email',
  rateLimit({ maxRequests: 3, windowMs: 15 * 60 * 1000 }),
  AuthController.resendVerifyEmail
);

// Reset password: 5 requests per 15 minutes
router.post(
  '/reset-password',
  rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 }),
  AuthController.resetPassword
);
```

### 5. Input Validation

**Always validate:**
- Email format
- Password strength
- Required fields
- Type correctness

**Use Zod for all inputs:**
```typescript
const login = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
```

### 6. Error Messages

**❌ Bad (reveals info):**
```typescript
throw new ApiError(404, 'User with email test@example.com not found');
```

**✅ Good (generic):**
```typescript
throw new ApiError(401, 'Invalid email or password');
```

### 7. Token Expiration

**Recommended values:**
- Access token: 15 minutes - 1 day
- Refresh token: 7 - 30 days
- Reset token: 5 - 15 minutes

### 8. HTTPS Only

**Production environment:**
```typescript
if (config.env === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

## 📝 Summary

**Key Takeaways:**

1. **Auth Method**: Local (email/password)
2. **JWT Tokens**: Access (short-lived) + Refresh (long-lived)
3. **Secure Password**: bcrypt hashing with 12 rounds
4. **RBAC**: Super Admin, Student roles with permission matrix
5. **Password Reset**: Crypto tokens with 5-minute expiration
6. **Auth Middleware**: Verifies JWT + checks role permissions
7. **Security**: httpOnly cookies, rate limiting, input validation

**Authentication Checklist:**

□ Passwords hashed with bcrypt (12+ rounds)
□ JWT tokens stored in httpOnly cookies
□ Access token expires in 1 day
□ Refresh token expires in 7 days
□ Auth middleware verifies every protected route
□ Role-based access control implemented
□ Rate limiting on auth endpoints
□ Input validation with Zod
□ Generic error messages (don't reveal user existence)
□ HTTPS in production

---

**Happy Authenticating! 🚀**
