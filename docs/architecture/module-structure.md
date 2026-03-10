# Module Structure Documentation

**Project:** Enterprise Backend Template
**Last Updated:** 2025-11-25

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [The 6-File Module Pattern](#the-6-file-module-pattern)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Naming Conventions](#naming-conventions)
5. [Code Organization Best Practices](#code-organization-best-practices)
6. [Module Interactions](#module-interactions)
7. [Shared Utilities](#shared-utilities)
8. [Real Examples](#real-examples)

---

## 🎯 Overview

This codebase follows a **feature-based module pattern** where each feature is self-contained in its own directory with a consistent 6-file structure. This approach ensures:

- **Predictability**: Every module follows the same pattern
- **Maintainability**: Easy to locate and modify code
- **Scalability**: New features can be added without affecting existing code
- **Testability**: Clear separation makes testing straightforward
- **Collaboration**: Team members can work on different modules independently

---

## 📦 The 6-File Module Pattern

Every module in `src/app/modules/` follows this exact structure:

```
src/app/modules/{feature}/
├── {feature}.interface.ts      # TypeScript types and interfaces
├── {feature}.model.ts          # Mongoose schema and model
├── {feature}.service.ts        # Business logic layer
├── {feature}.controller.ts     # HTTP request handlers
├── {feature}.validation.ts     # Zod validation schemas
└── {feature}.route.ts          # Express route definitions
```

### Why 6 Files?

**Separation of Concerns**: Each file has a single responsibility:
- **Interface**: Define data structures (what data looks like)
- **Model**: Define database schema (how data is stored)
- **Service**: Define business logic (what happens to data)
- **Controller**: Define HTTP handlers (how data is received/sent)
- **Validation**: Define validation rules (is data valid?)
- **Route**: Define API endpoints (where is data accessed?)

**Benefits:**
- Changes to validation don't affect business logic
- Database schema changes are isolated to model file
- New endpoints don't require modifying existing logic
- Testing becomes easier (mock services, test controllers independently)

---

## 📄 File-by-File Breakdown

### 1. Interface File (`{feature}.interface.ts`)

**Purpose**: Define TypeScript types and interfaces for the module.

**What Goes Here:**
- Main entity interface (e.g., `IUser`, `IProduct`)
- Enum definitions (e.g., `USER_ROLE`, `PRODUCT_STATUS`)
- Type unions (e.g., `type ProductCategory = 'electronics' | 'clothing'`)
- Related type definitions

**What Doesn't Go Here:**
- Business logic
- Validation rules
- Database-specific code
- HTTP-related types

**Example Structure:**

```typescript
import { Types } from 'mongoose';

// Enums
export enum USER_ROLE {
  ADMIN = 'admin',
  SELLER = 'seller',
  BUYER = 'buyer',
}

export enum USER_STATUS {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

// Main interface
export type IUser = {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: USER_ROLE;
  status?: USER_STATUS;
  avatar?: string;
  phone?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

// Related types (if needed)
export type IUserMethods = {
  comparePassword(password: string): Promise<boolean>;
};

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
```

**Key Points:**
- Use `Types.ObjectId` for references
- Make optional fields use `?`
- Include `createdAt` and `updatedAt` if using timestamps
- Export all enums and types
- Use descriptive names (prefix with `I` for interfaces)

---

### 2. Model File (`{feature}.model.ts`)

**Purpose**: Define Mongoose schema and model for database operations.

**What Goes Here:**
- Mongoose schema definition
- Schema options (timestamps, virtuals, etc.)
- Instance methods
- Static methods
- Query helpers
- Indexes
- Middleware (pre/post hooks)
- Model export

**What Doesn't Go Here:**
- Business logic (belongs in service)
- HTTP-related code (belongs in controller)
- Validation logic (belongs in validation file)

**Example Structure:**

```typescript
import { Schema, model } from 'mongoose';
import { IUser, IUserMethods, UserModel, USER_ROLE, USER_STATUS } from './user.interface';
import bcrypt from 'bcrypt';
import config from '../../../config';

// Schema definition
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      default: USER_ROLE.BUYER,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    avatar: {
      type: String,
    },
    phone: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Auto-create createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password; // Never expose password in JSON
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }); // For fast email lookups
userSchema.index({ role: 1, status: 1 }); // For filtering by role and status

// Pre-save middleware: Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const saltRounds = Number(config.bcrypt_salt_rounds);
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Instance method: Compare password
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Static method: Find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ status: USER_STATUS.ACTIVE });
};

// Export model
export const User = model<IUser, UserModel>('User', userSchema);
```

**Key Points:**
- Use type parameters: `Schema<IUser, UserModel, IUserMethods>`
- Set `select: false` for sensitive fields (password)
- Add indexes for frequently queried fields
- Use pre/post hooks for side effects (hash password, delete related data)
- Instance methods for document-level operations
- Static methods for collection-level operations
- Always export model, not schema

**Common Indexes:**
- `{ email: 1 }` - Unique user lookup
- `{ createdAt: -1 }` - Sort by date (newest first)
- `{ status: 1, role: 1 }` - Filter by status and role
- `{ 'location.coordinates': '2dsphere' }` - Geospatial queries

---

### 3. Service File (`{feature}.service.ts`)

**Purpose**: Contain all business logic for the module (the "fat" layer).

**What Goes Here:**
- All database operations
- Business logic and calculations
- Data transformations
- External API calls
- Complex query building
- Transaction handling
- Data aggregation

**What Doesn't Go Here:**
- HTTP request/response handling (belongs in controller)
- Request validation (belongs in validation)
- Route definitions (belongs in route)

**Example Structure:**

```typescript
import { User } from './user.model';
import { IUser } from './user.interface';
import ApiError from '../../../errors/ApiError';
import { QueryBuilder } from '../../builder/QueryBuilder';

// Create user
const createUser = async (payload: Partial<IUser>): Promise<IUser> => {
  // Business logic: Check if email already exists
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // Create user
  const user = await User.create(payload);

  // Don't return password
  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

// Get all users with filtering, sorting, pagination
const getAllUsers = async (query: Record<string, unknown>) => {
  const searchableFields = ['name', 'email'];

  const queryBuilder = new QueryBuilder(User.find(), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;
  const pagination = queryBuilder.getPaginationMeta(
    await User.countDocuments(queryBuilder.modelQuery.getFilter())
  );

  return { data: result, pagination };
};

// Get single user by ID
const getUserById = async (id: string): Promise<IUser> => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

// Update user
const updateUser = async (id: string, payload: Partial<IUser>): Promise<IUser> => {
  // Business logic: Don't allow email change if already verified
  const existingUser = await User.findById(id);
  if (!existingUser) {
    throw new ApiError(404, 'User not found');
  }

  if (payload.email && existingUser.isEmailVerified && payload.email !== existingUser.email) {
    throw new ApiError(400, 'Cannot change verified email');
  }

  const user = await User.findByIdAndUpdate(id, payload, { new: true, runValidators: true });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

// Delete user (soft delete)
const deleteUser = async (id: string): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.DELETED },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

// Export all service methods
export const UserService = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
```

**Key Points:**
- **Always throw ApiError** for errors (not generic Error)
- **Use QueryBuilder** for complex queries with search/filter/sort/pagination
- **Return clean data** (remove sensitive fields like password)
- **Business validation** happens here (email uniqueness, role permissions, etc.)
- **Export as namespace object** (UserService, ProductService, etc.)
- **Use async/await** for all database operations
- **Handle edge cases** (not found, duplicate, invalid state)

**Service Patterns:**

**1. Simple CRUD:**
```typescript
const create = async (payload: Partial<IEntity>) => {
  return await Entity.create(payload);
};

const getAll = async () => {
  return await Entity.find();
};

const getById = async (id: string) => {
  const entity = await Entity.findById(id);
  if (!entity) throw new ApiError(404, 'Not found');
  return entity;
};

const update = async (id: string, payload: Partial<IEntity>) => {
  const entity = await Entity.findByIdAndUpdate(id, payload, { new: true });
  if (!entity) throw new ApiError(404, 'Not found');
  return entity;
};

const deleteEntity = async (id: string) => {
  const entity = await Entity.findByIdAndDelete(id);
  if (!entity) throw new ApiError(404, 'Not found');
  return entity;
};
```

**2. With QueryBuilder (search, filter, pagination):**
```typescript
const getAll = async (query: Record<string, unknown>) => {
  const searchableFields = ['name', 'description'];

  const queryBuilder = new QueryBuilder(Entity.find(), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;
  const pagination = queryBuilder.getPaginationMeta(
    await Entity.countDocuments(queryBuilder.modelQuery.getFilter())
  );

  return { data: result, pagination };
};
```

**3. With Aggregation:**
```typescript
const getStatistics = async () => {
  const stats = await Entity.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    { $sort: { count: -1 } },
  ]);

  return stats;
};
```

**4. With Transactions:**
```typescript
import mongoose from 'mongoose';

const transferFunds = async (fromId: string, toId: string, amount: number) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct from sender
    await Account.findByIdAndUpdate(
      fromId,
      { $inc: { balance: -amount } },
      { session }
    );

    // Add to receiver
    await Account.findByIdAndUpdate(
      toId,
      { $inc: { balance: amount } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
```

---

### 4. Controller File (`{feature}.controller.ts`)

**Purpose**: Handle HTTP requests and responses (the "thin" layer).

**What Goes Here:**
- Extract data from request (body, params, query, user)
- Call service methods
- Send standardized responses
- Handle file uploads (if needed)

**What Doesn't Go Here:**
- Business logic (belongs in service)
- Database operations (belongs in service)
- Validation logic (already done by middleware)

**Example Structure:**

```typescript
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';

// Create user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'User created successfully',
    data: result,
  });
});

// Get all users
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Users retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

// Get single user
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User retrieved successfully',
    data: result,
  });
});

// Update user
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUser(req.params.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User updated successfully',
    data: result,
  });
});

// Delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.deleteUser(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User deleted successfully',
    data: result,
  });
});

// Export all controller methods
export const UserController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
```

**Key Points:**
- **Always wrap with catchAsync** (forwards errors to global error handler)
- **Always use sendResponse** for consistent response format
- **Extract data from request** (req.body, req.params, req.query, req.user)
- **Call service methods** (don't write business logic here)
- **Keep controllers thin** (3-10 lines per method)
- **Export as namespace object** (UserController, ProductController, etc.)
- **Use descriptive method names** (createUser, not create)

**Controller Patterns:**

**1. Basic CRUD:**
```typescript
const create = catchAsync(async (req, res) => {
  const result = await Service.create(req.body);
  sendResponse(res, { success: true, statusCode: 201, message: 'Created', data: result });
});

const getAll = catchAsync(async (req, res) => {
  const result = await Service.getAll(req.query);
  sendResponse(res, { success: true, statusCode: 200, message: 'Retrieved', ...result });
});

const getById = catchAsync(async (req, res) => {
  const result = await Service.getById(req.params.id);
  sendResponse(res, { success: true, statusCode: 200, message: 'Retrieved', data: result });
});

const update = catchAsync(async (req, res) => {
  const result = await Service.update(req.params.id, req.body);
  sendResponse(res, { success: true, statusCode: 200, message: 'Updated', data: result });
});

const deleteEntity = catchAsync(async (req, res) => {
  const result = await Service.deleteEntity(req.params.id);
  sendResponse(res, { success: true, statusCode: 200, message: 'Deleted', data: result });
});
```

**2. With User Context:**
```typescript
const getMyProfile = catchAsync(async (req, res) => {
  const userId = req.user._id; // From auth middleware
  const result = await UserService.getUserById(userId);
  sendResponse(res, { success: true, statusCode: 200, message: 'Profile retrieved', data: result });
});
```

**3. With File Upload:**
```typescript
const updateAvatar = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const avatarPath = req.file?.path; // From fileHandler middleware

  const result = await UserService.updateUser(userId, { avatar: avatarPath });
  sendResponse(res, { success: true, statusCode: 200, message: 'Avatar updated', data: result });
});
```

---

### 5. Validation File (`{feature}.validation.ts`)

**Purpose**: Define Zod schemas for request validation.

**What Goes Here:**
- Zod schemas for request body
- Zod schemas for params
- Zod schemas for query parameters
- Reusable schema components

**What Doesn't Go Here:**
- Business validation (belongs in service)
- Database validation (belongs in model)
- Authentication logic (belongs in middleware)

**Example Structure:**

```typescript
import { z } from 'zod';
import { USER_ROLE, USER_STATUS } from './user.interface';

// Create user schema
const createUser = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),

    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(50, 'Password cannot exceed 50 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),

    role: z
      .nativeEnum(USER_ROLE, { required_error: 'Role is required' })
      .default(USER_ROLE.BUYER),

    phone: z
      .string()
      .regex(/^[0-9]{10,15}$/, 'Invalid phone number')
      .optional(),

    avatar: z.string().url('Invalid avatar URL').optional(),
  }),
});

// Update user schema (all fields optional)
const updateUser = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    phone: z.string().regex(/^[0-9]{10,15}$/).optional(),
    avatar: z.string().url().optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
  }),
});

// Get user by ID schema (validate params)
const getUserById = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
});

// Get all users schema (validate query)
const getAllUsers = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    role: z.nativeEnum(USER_ROLE).optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
  }),
});

// Export all validation schemas
export const UserValidation = {
  createUser,
  updateUser,
  getUserById,
  getAllUsers,
};
```

**Key Points:**
- **Wrap in z.object()** with `body`, `params`, or `query`
- **Use descriptive error messages** (not generic "Required")
- **Chain validators** (.min().max().trim())
- **Use z.nativeEnum()** for TypeScript enums
- **Use regex for complex patterns** (phone, ObjectId, etc.)
- **Make update schemas optional** (all fields optional)
- **Export as namespace object** (UserValidation, ProductValidation, etc.)

**Common Validation Patterns:**

**1. Required String:**
```typescript
name: z.string({ required_error: 'Name is required' }).min(1).max(100).trim()
```

**2. Optional String:**
```typescript
description: z.string().max(500).optional()
```

**3. Email:**
```typescript
email: z.string().email('Invalid email').toLowerCase().trim()
```

**4. Password:**
```typescript
password: z.string()
  .min(8, 'Too short')
  .regex(/[A-Z]/, 'Need uppercase')
  .regex(/[a-z]/, 'Need lowercase')
  .regex(/[0-9]/, 'Need number')
```

**5. Enum:**
```typescript
role: z.nativeEnum(USER_ROLE)
```

**6. Number:**
```typescript
age: z.number().int().min(18).max(120)
```

**7. Boolean:**
```typescript
isActive: z.boolean().default(true)
```

**8. Array:**
```typescript
tags: z.array(z.string()).min(1, 'At least one tag required').max(10)
```

**9. ObjectId:**
```typescript
userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID')
```

**10. Date:**
```typescript
birthDate: z.string().datetime().or(z.date())
```

**11. URL:**
```typescript
website: z.string().url('Invalid URL')
```

**12. Custom Validation:**
```typescript
price: z.number().refine((val) => val > 0, 'Price must be positive')
```

---

### 6. Route File (`{feature}.route.ts`)

**Purpose**: Define Express routes and middleware chain.

**What Goes Here:**
- Route definitions (GET, POST, PATCH, DELETE)
- Middleware chain (auth, validation, file upload, rate limiting)
- Route grouping
- Route exports

**What Doesn't Go Here:**
- Business logic (belongs in service)
- Request handlers (belongs in controller)
- Validation schemas (belongs in validation)

**Example Structure:**

```typescript
import express from 'express';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLE } from './user.interface';
import fileHandler from '../../middlewares/fileHandler';
import rateLimit from '../../middlewares/rateLimit';

const router = express.Router();

// Public routes
router.post(
  '/register',
  validateRequest(UserValidation.createUser),
  rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), // 5 requests per 15 minutes
  UserController.createUser
);

// Protected routes (require authentication)
router.get(
  '/',
  auth(USER_ROLE.ADMIN), // Only admins can get all users
  validateRequest(UserValidation.getAllUsers),
  UserController.getAllUsers
);

router.get(
  '/:id',
  auth(USER_ROLE.ADMIN, USER_ROLE.SELLER, USER_ROLE.BUYER), // All authenticated users
  validateRequest(UserValidation.getUserById),
  UserController.getUserById
);

router.patch(
  '/:id',
  auth(USER_ROLE.ADMIN, USER_ROLE.SELLER, USER_ROLE.BUYER),
  validateRequest(UserValidation.updateUser),
  UserController.updateUser
);

router.delete(
  '/:id',
  auth(USER_ROLE.ADMIN), // Only admins can delete
  UserController.deleteUser
);

// File upload route
router.patch(
  '/:id/avatar',
  auth(USER_ROLE.ADMIN, USER_ROLE.SELLER, USER_ROLE.BUYER),
  fileHandler({
    provider: 's3',
    fields: [{ name: 'avatar', maxCount: 1, folder: 'avatars', allowedTypes: ['image'] }],
  }),
  UserController.updateAvatar
);

export const UserRoutes = router;
```

**Key Points:**
- **Order matters**: auth → validation → file upload → rate limit → controller
- **Use router.METHOD()** (router.get, router.post, etc.)
- **Chain middleware** in correct order
- **Export router** with descriptive name (UserRoutes, ProductRoutes, etc.)
- **Group related routes** together
- **Add comments** for route sections (Public, Protected, Admin-only, etc.)

**Middleware Chain Order:**

```
1. auth()              ← Verify JWT, check role permissions
2. validateRequest()   ← Validate req.body/params/query
3. fileHandler()       ← Handle file uploads (if needed)
4. rateLimit()         ← Throttle requests (if needed)
5. Controller          ← Handle request
```

**Route Patterns:**

**1. Public Route:**
```typescript
router.post('/login', validateRequest(AuthValidation.login), AuthController.login);
```

**2. Protected Route (any authenticated user):**
```typescript
router.get('/profile', auth(), UserController.getMyProfile);
```

**3. Role-Based Route:**
```typescript
router.delete('/:id', auth(USER_ROLE.ADMIN), UserController.deleteUser);
```

**4. Multiple Roles:**
```typescript
router.get('/:id', auth(USER_ROLE.ADMIN, USER_ROLE.SELLER), UserController.getUserById);
```

**5. With File Upload:**
```typescript
router.post(
  '/',
  auth(),
  fileHandler({ provider: 's3', fields: [{ name: 'images', maxCount: 5 }] }),
  validateRequest(ProductValidation.create),
  ProductController.create
);
```

**6. With Rate Limiting:**
```typescript
router.post(
  '/forgot-password',
  rateLimit({ maxRequests: 3, windowMs: 60 * 60 * 1000 }), // 3 per hour
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword
);
```

---

## 🎯 Naming Conventions

### File Names

**Pattern**: `{feature}.{type}.ts`

**Examples:**
- `user.interface.ts`
- `user.model.ts`
- `user.service.ts`
- `user.controller.ts`
- `user.validation.ts`
- `user.route.ts`

**Rules:**
- Always use lowercase
- Use singular form (user, not users)
- Use kebab-case for multi-word features (reset-token, not resetToken)

### Variable/Constant Names

**Interfaces**: PascalCase with `I` prefix
```typescript
export type IUser = { ... }
export type IProduct = { ... }
```

**Enums**: SCREAMING_SNAKE_CASE
```typescript
export enum USER_ROLE {
  ADMIN = 'admin',
  SELLER = 'seller',
}
```

**Models**: PascalCase (no prefix)
```typescript
export const User = model('User', userSchema);
export const Product = model('Product', productSchema);
```

**Services**: PascalCase + "Service" suffix
```typescript
export const UserService = { ... }
export const ProductService = { ... }
```

**Controllers**: PascalCase + "Controller" suffix
```typescript
export const UserController = { ... }
export const ProductController = { ... }
```

**Validations**: PascalCase + "Validation" suffix
```typescript
export const UserValidation = { ... }
export const ProductValidation = { ... }
```

**Routes**: PascalCase + "Routes" suffix
```typescript
export const UserRoutes = router;
export const ProductRoutes = router;
```

**Schema**: camelCase + "Schema" suffix
```typescript
const userSchema = new Schema({ ... });
const productSchema = new Schema({ ... });
```

### Function Names

**Service Methods**: camelCase, descriptive verbs
```typescript
createUser
getAllUsers
getUserById
updateUser
deleteUser
```

**Controller Methods**: camelCase, same as service
```typescript
createUser  // matches UserService.createUser
getAllUsers
getUserById
```

**Validation Schemas**: camelCase, match controller/service
```typescript
createUser  // matches UserController.createUser
updateUser
getUserById
```

---

## ✅ Code Organization Best Practices

### 1. Keep Controllers Thin

**❌ Bad (too much logic in controller):**
```typescript
const createUser = catchAsync(async (req, res) => {
  // Checking if email exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    throw new ApiError(409, 'Email already exists');
  }

  // Hashing password
  const hashedPassword = await bcrypt.hash(req.body.password, 12);

  // Creating user
  const user = await User.create({ ...req.body, password: hashedPassword });

  // Sending email
  await sendEmail(user.email, 'Welcome', 'Thanks for joining!');

  sendResponse(res, { success: true, statusCode: 201, data: user });
});
```

**✅ Good (thin controller, fat service):**
```typescript
// Controller
const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUser(req.body);
  sendResponse(res, { success: true, statusCode: 201, data: result });
});

// Service
const createUser = async (payload: Partial<IUser>) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(409, 'Email already exists');
  }

  const user = await User.create(payload); // Password hashed by pre-save hook
  await sendEmail(user.email, 'Welcome', 'Thanks for joining!');

  return user;
};
```

### 2. Use QueryBuilder for Complex Queries

**❌ Bad (manual query building):**
```typescript
const getAllUsers = async (query: any) => {
  const { searchTerm, page = 1, limit = 20, sortBy = 'createdAt', ...filters } = query;

  let queryObj: any = {};

  if (searchTerm) {
    queryObj.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  Object.keys(filters).forEach((key) => {
    queryObj[key] = filters[key];
  });

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(queryObj)
    .sort({ [sortBy]: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(queryObj);

  return {
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};
```

**✅ Good (using QueryBuilder):**
```typescript
const getAllUsers = async (query: Record<string, unknown>) => {
  const searchableFields = ['name', 'email'];

  const queryBuilder = new QueryBuilder(User.find(), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;
  const pagination = queryBuilder.getPaginationMeta(
    await User.countDocuments(queryBuilder.modelQuery.getFilter())
  );

  return { data: result, pagination };
};
```

### 3. Validate Existence Before Operations

**❌ Bad (no existence check):**
```typescript
const updateUser = async (id: string, payload: Partial<IUser>) => {
  return await User.findByIdAndUpdate(id, payload, { new: true });
};
```

**✅ Good (check existence, throw error):**
```typescript
const updateUser = async (id: string, payload: Partial<IUser>) => {
  const user = await User.findByIdAndUpdate(id, payload, { new: true, runValidators: true });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};
```

### 4. Use Enums for Constants

**❌ Bad (magic strings):**
```typescript
if (user.role === 'admin') { ... }
if (user.status === 'active') { ... }
```

**✅ Good (using enums):**
```typescript
if (user.role === USER_ROLE.ADMIN) { ... }
if (user.status === USER_STATUS.ACTIVE) { ... }
```

### 5. Consistent Error Handling

**❌ Bad (inconsistent errors):**
```typescript
throw new Error('User not found'); // Generic error
throw { message: 'Invalid email' }; // Plain object
return null; // No error thrown
```

**✅ Good (always use ApiError):**
```typescript
throw new ApiError(404, 'User not found');
throw new ApiError(400, 'Invalid email format');
throw new ApiError(409, 'Email already exists');
```

### 6. Remove Sensitive Data

**❌ Bad (password exposed):**
```typescript
const user = await User.findById(id);
return user; // Contains password!
```

**✅ Good (password excluded):**
```typescript
// Option 1: Set select: false in schema
password: { type: String, select: false }

// Option 2: Exclude in query
const user = await User.findById(id).select('-password');

// Option 3: Delete from object
const user = await User.findById(id);
const userObject = user.toObject();
delete userObject.password;
return userObject;
```

---

## 🔗 Module Interactions

### How Modules Communicate

**1. Direct Import (Common):**
```typescript
// In product.service.ts
import { User } from '../user/user.model';

const createProduct = async (payload: IProduct) => {
  // Verify seller exists
  const seller = await User.findById(payload.seller);
  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  return await Product.create(payload);
};
```

**2. Via References (MongoDB):**
```typescript
// In product.model.ts
seller: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
}

// In product.service.ts
const getProduct = async (id: string) => {
  return await Product.findById(id).populate('seller', 'name email avatar');
};
```

**3. Via Events (Socket.IO):**
```typescript
// In message.controller.ts
import { getIO } from '../../../helpers/socketHelper';

const sendMessage = catchAsync(async (req, res) => {
  const message = await MessageService.sendMessage(req.body);

  // Emit to Socket.IO
  const io = getIO();
  io.to(message.chatId.toString()).emit('new-message', message);

  sendResponse(res, { success: true, statusCode: 201, data: message });
});
```

**4. Via Shared Services:**
```typescript
// In email.helper.ts (shared utility)
export const sendEmail = async (to: string, subject: string, html: string) => { ... }

// Used in multiple modules
// auth.service.ts
import { sendEmail } from '../../../helpers/emailHelper';
await sendEmail(user.email, 'Verify Email', verificationHtml);

// user.service.ts
import { sendEmail } from '../../../helpers/emailHelper';
await sendEmail(user.email, 'Welcome', welcomeHtml);
```

### Module Dependency Graph

```
┌─────────────┐
│    User     │◄────────────────────┐
└──────┬──────┘                     │
       │                            │
       │ (seller ref)               │ (user ref)
       │                            │
       ▼                            │
┌─────────────┐              ┌─────────────┐
│   Product   │              │    Chat     │
└──────┬──────┘              └──────┬──────┘
       │                            │
       │ (product ref)              │ (chat ref)
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────┐
│   Payment   │              │   Message   │
└─────────────┘              └─────────────┘
       │                            │
       │                            │
       └────────────┬───────────────┘
                    │
                    ▼
              ┌─────────────┐
              │Notification │
              └─────────────┘
```

**Dependency Rules:**
- Modules can import other module models (for references)
- Modules should NOT import other module services (to avoid circular deps)
- Shared utilities should be in `/helpers` or `/shared`
- Socket.IO events should be emitted from controllers, not services

---

## 🛠️ Shared Utilities

Shared code that doesn't belong to any specific module goes in:

### `/src/helpers/` (Feature-specific helpers)

```
helpers/
├── emailHelper.ts         # Email sending
├── jwtHelper.ts          # JWT token generation/verification
├── paginationHelper.ts   # Pagination calculations
├── socketHelper.ts       # Socket.IO initialization
└── serviceHelpers.ts     # Common service utilities
```

**Usage:**
```typescript
import { sendEmail } from '../../helpers/emailHelper';
import { createToken } from '../../helpers/jwtHelper';
import { getIO } from '../../helpers/socketHelper';
```

### `/src/shared/` (Generic utilities)

```
shared/
├── catchAsync.ts         # Async error wrapper
├── sendResponse.ts       # Standardized response
├── logger.ts            # Winston logger
├── pick.ts              # Object property picker
└── unlinkFile.ts        # File deletion utility
```

**Usage:**
```typescript
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import logger from '../../../shared/logger';
```

### `/src/app/builder/` (Query helpers)

```
builder/
├── QueryBuilder.ts          # MongoDB query builder
└── AggregationBuilder.ts    # MongoDB aggregation builder
```

**Usage:**
```typescript
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AggregationBuilder } from '../../builder/AggregationBuilder';
```

### `/src/app/middlewares/` (Express middleware)

```
middlewares/
├── auth.ts                      # JWT authentication
├── validateRequest.ts           # Zod validation
├── fileHandler.ts              # File upload (Multer + Sharp)
├── rateLimit.ts                # Rate limiting
└── globalErrorHandler.ts       # Error handling
```

**Usage:**
```typescript
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import fileHandler from '../../middlewares/fileHandler';
```

---

## 📚 Real Examples

### Example 1: User Module

**Complete structure:**
```
src/app/modules/user/
├── user.interface.ts      (120 lines) - IUser, USER_ROLE, USER_STATUS
├── user.model.ts          (180 lines) - User model with bcrypt pre-save hook
├── user.service.ts        (250 lines) - CRUD + QueryBuilder
├── user.controller.ts     (100 lines) - Thin controllers with catchAsync
├── user.validation.ts     (150 lines) - Zod schemas for all operations
└── user.route.ts          (80 lines)  - Protected routes with auth
```

### Example 2: Product Module

**Complete structure:**
```
src/app/modules/product/
├── product.interface.ts   (90 lines)  - IProduct, PRODUCT_CATEGORY
├── product.model.ts       (150 lines) - Product model with seller ref
├── product.service.ts     (300 lines) - CRUD + image upload handling
├── product.controller.ts  (120 lines) - File upload controllers
├── product.validation.ts  (180 lines) - Image validation
└── product.route.ts       (100 lines) - fileHandler middleware
```

### Example 3: Message Module

**Complete structure:**
```
src/app/modules/message/
├── message.interface.ts   (60 lines)  - IMessage, MESSAGE_TYPE
├── message.model.ts       (100 lines) - Message model with chat/sender refs
├── message.service.ts     (200 lines) - CRUD + unread count calculations
├── message.controller.ts  (150 lines) - Socket.IO event emissions
├── message.validation.ts  (100 lines) - Message validation
└── message.route.ts       (70 lines)  - Auth-protected routes
```

---

## 🎯 Module Creation Checklist

When creating a new module, use this checklist:

### ✅ Planning Phase

□ Define module purpose and responsibilities
□ Identify required fields and types
□ Determine relationships with other modules
□ Plan validation rules
□ Identify authentication requirements

### ✅ Implementation Phase

□ **Create interface file** (types, enums)
□ **Create model file** (schema, indexes, hooks)
□ **Create service file** (business logic, QueryBuilder)
□ **Create controller file** (thin handlers, catchAsync, sendResponse)
□ **Create validation file** (Zod schemas)
□ **Create route file** (Express routes, middleware chain)

### ✅ Integration Phase

□ Register routes in `src/routes/index.ts`
□ Test all CRUD operations
□ Verify authentication works
□ Verify validation works
□ Check error handling
□ Test with Postman/Thunder Client

### ✅ Documentation Phase

□ Add JSDoc comments
□ Update API documentation
□ Add usage examples
□ Document any special behaviors

---

## 📝 Summary

**The 6-File Module Pattern ensures:**

1. **Consistency**: All modules follow the same structure
2. **Maintainability**: Easy to locate and modify code
3. **Scalability**: New modules don't affect existing code
4. **Testability**: Clear separation makes testing easy
5. **Collaboration**: Multiple developers can work independently

**Key Principles:**

- **Interface**: Define data structures
- **Model**: Define database schema
- **Service**: Define business logic (fat layer)
- **Controller**: Define HTTP handlers (thin layer)
- **Validation**: Define validation rules
- **Route**: Define API endpoints

**Always remember:**
- Controllers should be thin (3-10 lines)
- Services should be fat (all business logic)
- Use QueryBuilder for complex queries
- Use ApiError for all errors
- Use catchAsync for all controllers
- Use sendResponse for all responses
- Follow naming conventions consistently

---

**Happy Coding! 🚀**
