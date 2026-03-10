---
paths:
  - "src/**/*.route.ts"
  - "src/routes/**/*"
---

# Route Design Standards (রাউট ডিজাইন স্ট্যান্ডার্ড)

> এই ফাইলে Express route ফাইল তৈরি ও maintain করার সব নিয়ম আছে।
> নতুন module তৈরি বা existing route পরিবর্তনের আগে এই নিয়মগুলো মেনে চলুন।

---

## ১. ফাইল নামকরণ (File Naming)

**নিয়ম**: সবসময় singular `*.route.ts` ব্যবহার করুন। `*.routes.ts` ব্যবহার করবেন না।

```
✅ user.route.ts
✅ payment.route.ts
✅ notification.route.ts

❌ payment.routes.ts
❌ notification.routes.ts
```

**Export নাম**: `PascalCase` + `Routes` suffix, named export ব্যবহার করুন।

```typescript
// ✅ সঠিক
export const PaymentRoutes = router;

// ❌ ভুল
export default router;
export const paymentRouter = router;
```

---

## ২. Base Path নামকরণ (Base Path Convention)

**নিয়ম**: Resource paths সবসময় **plural** হবে।

```typescript
// src/routes/index.ts
const apiRoutes = [
  { path: '/users',         route: UserRoutes },         // ✅ plural
  { path: '/courses',       route: CourseRoutes },        // ✅ plural
  { path: '/payments',      route: PaymentRoutes },       // ✅ plural
  { path: '/notifications', route: NotificationRoutes },  // ✅ plural
  { path: '/chats',         route: ChatRoutes },          // ✅ plural
  { path: '/messages',      route: MessageRoutes },       // ✅ plural
];
```

**ব্যতিক্রম (Exceptions)**:
- `/auth` — singular রাখা যায়, কারণ এটা resource নয়, action namespace

```
✅ /users, /courses, /payments, /messages, /chats, /notifications
✅ /auth (exception — action namespace)
❌ /user (singular resource path)
```

---

## ৩. HTTP Method ব্যবহার (HTTP Method Semantics)

| Method   | ব্যবহার                                     | উদাহরণ                                    |
|----------|----------------------------------------------|--------------------------------------------|
| `GET`    | Data পড়া, কোনো side effect নেই              | `GET /courses`, `GET /courses/:id`         |
| `POST`   | নতুন resource তৈরি **অথবা** action execute   | `POST /courses`, `POST /auth/login`        |
| `PATCH`  | আংশিক update (partial update)                | `PATCH /courses/:id`                       |
| `DELETE` | Resource মুছে ফেলা                           | `DELETE /courses/:id`                      |

**গুরুত্বপূর্ণ নিয়ম**:
- `PUT` ব্যবহার করবেন না — সবসময় `PATCH` ব্যবহার করুন (partial update)
- Action endpoints (login, logout, refund, block) → `POST` বা `PATCH` ব্যবহার করুন
- Idempotent state toggle → `PATCH` (e.g., `PATCH /:id/block`, `PATCH /:id/visibility`)
- Irreversible action → `POST` (e.g., `POST /:paymentId/refund`, `POST /auth/login`)

---

## ৪. URL গঠন (URL Structure Rules)

### ৪.১ Naming Convention

- **kebab-case** ব্যবহার করুন multi-word paths এ
- **camelCase** ব্যবহার করুন param names এ
- URL segments সবসময় lowercase

```
✅ /my-courses
✅ /read-all
✅ /forget-password
✅ /:courseId/modules/:moduleId

❌ /myCourses
❌ /readAll
❌ /forgetPassword
```

### ৪.২ Param Naming Convention

Param নাম সবসময় resource name + `Id` pattern follow করবে:

```
✅ /:courseId
✅ /:moduleId
✅ /:lessonId
✅ /:paymentId

❌ /:identifier  (avoid — descriptive param নাম ব্যবহার করুন)
```

**ব্যতিক্রম**: যদি route file এ শুধু একটি resource-এর CRUD থাকে এবং nesting নেই, তাহলে `/:id` ব্যবহার করা acceptable:

```typescript
// ✅ acceptable — simple module, no nesting
router.get('/:id', UserController.getUserById);
router.patch('/:id/block', UserController.blockUser);
```

### ৪.৩ Redundant Segments এড়িয়ে চলুন

Base path ইতিমধ্যে resource name বহন করে। URL-এ resource name repeat করবেন না:

```
✅ GET /users/:id                  → "get user by id"
❌ GET /users/:id/user             → redundant "/user" suffix

✅ GET /users/:id/profile          → nested sub-resource
❌ GET /users/:id/user-profile     → redundant "user-" prefix
```

---

## ৫. Route Declaration Order (ক্রিটিকাল)

এটি সবচেয়ে গুরুত্বপূর্ণ নিয়ম। Express routes **first-match** ভিত্তিতে কাজ করে — প্রথম যে route match করে সেটাই execute হয়।

### নিয়ম: Fixed paths সবসময় param paths-এর আগে declare করুন

```typescript
// ✅ সঠিক ক্রম
router.get('/stats',       PaymentController.getStats);       // fixed path আগে
router.get('/history',     PaymentController.getHistory);     // fixed path আগে
router.get('/:paymentId',  PaymentController.getById);        // param path পরে

// ❌ ভুল ক্রম (BUG!)
router.get('/:paymentId',  PaymentController.getById);        // এটা "stats" কে match করবে!
router.get('/stats',       PaymentController.getStats);       // এটা কখনো reach হবে না!
```

### সম্পূর্ণ Declaration Order Template

একটি route file এ routes এই ক্রমে declare করুন:

```typescript
// ====== SECTION 1: Webhook/special (no auth) ======
router.post('/webhook', WebhookController.handle);

// ====== SECTION 2: Collection-level fixed paths ======
router.post('/',         Controller.create);            // create
router.get('/',          Controller.getAll);             // list
router.get('/stats',     Controller.getStats);           // fixed path
router.get('/my-items',  Controller.getMyItems);         // fixed path

// ====== SECTION 3: Collection-level actions ======
router.patch('/read-all', Controller.readAll);           // collection action

// ====== SECTION 4: Namespace prefixes (admin, stripe, etc.) ======
router.get('/admin',            Controller.adminList);
router.patch('/admin/read-all', Controller.adminReadAll);    // fixed BEFORE param
router.patch('/admin/:id/read', Controller.adminMarkRead);   // param AFTER fixed

// ====== SECTION 5: Sub-resource fixed paths (reorder etc.) ======
// MUST be before /:id routes
router.patch('/:courseId/modules/reorder', Controller.reorderModules);

// ====== SECTION 6: Single resource by param ======
router.get('/:id',      Controller.getById);
router.patch('/:id',    Controller.update);
router.delete('/:id',   Controller.delete);

// ====== SECTION 7: Resource actions ======
router.patch('/:id/block',      Controller.block);
router.patch('/:id/unblock',    Controller.unblock);
router.post('/:id/refund',      Controller.refund);
router.patch('/:id/visibility', Controller.toggleVisibility);

// ====== SECTION 8: Nested sub-resources ======
router.post('/:courseId/modules',              Controller.addModule);
router.patch('/:courseId/modules/:moduleId',   Controller.updateModule);
router.delete('/:courseId/modules/:moduleId',  Controller.deleteModule);
```

### কমেন্ট Section Separator ব্যবহার করুন

বড় route file (১০+ routes) এ section comments দিয়ে organize করুন:

```typescript
// ==================== COURSE ROUTES ====================

// ... course CRUD ...

// ==================== MODULE ROUTES ====================

// ... module CRUD ...

// ==================== LESSON ROUTES ====================

// ... lesson CRUD ...
```

---

## ৬. Middleware Chain Order (Canonical)

প্রতিটা route-এ middleware এই exact order-এ থাকবে:

```
rateLimitMiddleware(...)  →  auth(...)  →  fileHandler(...)  →  validateRequest(...)  →  Controller
     [1. optional]          [2. auth]      [3. upload]          [4. validation]          [5. handler]
```

### কেন এই order?

1. **Rate limit** আগে — auth check-এর আগেই abusive requests block করতে হবে
2. **Auth** দ্বিতীয় — user identify করা দরকার file upload ও validation-এর আগে
3. **File upload** তৃতীয় — multipart body parse করে `req.body` তে file URL inject করে
4. **Validation** চতুর্থ — file URL সহ complete `req.body` validate করতে পারে
5. **Controller** শেষে — validated data নিয়ে business logic execute করে

```typescript
// ✅ সঠিক chain (সব middleware সহ)
router.post(
  '/',
  rateLimitMiddleware({ windowMs: 60_000, max: 20, routeName: 'create-user' }),
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  validateRequest(CourseValidation.createCourseZodSchema),
  CourseController.createCourse,
);

// ✅ সবচেয়ে সাধারণ chain (auth + validation)
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.updateCourseZodSchema),
  CourseController.updateCourse,
);

// ❌ ভুল — validation file upload-এর আগে (req.body তে file URL থাকবে না)
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.createCourseZodSchema),  // ❌ file URL নেই এখনো!
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  CourseController.createCourse,
);
```

### Validation বাধ্যতামূলক

প্রতিটা `POST` এবং `PATCH` route-এ `validateRequest()` থাকতে **হবে**। কোনো exception নেই।

```typescript
// ❌ validation ছাড়া route — FORBIDDEN
router.post('/:otherUserId', auth(...), ChatController.createChat);

// ✅ validation সহ
router.post(
  '/:otherUserId',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(ChatValidation.createChatZodSchema),
  ChatController.createChat,
);
```

---

## ৭. Sub-resource Pattern (নেস্টিং নিয়ম)

### নেস্টিং গভীরতা: সর্বোচ্চ ৩ লেভেল

```
✅ /courses/:courseId/modules/:moduleId/lessons/:lessonId     (3 levels — maximum)
❌ /courses/:courseId/modules/:moduleId/lessons/:lessonId/comments/:commentId  (4 levels — too deep!)
```

৩ লেভেলের বেশি হলে, ভিতরের resource-কে flat করে আলাদা route file-এ নিন:

```typescript
// ❌ 4 levels deep
router.get('/:courseId/modules/:moduleId/lessons/:lessonId/comments/:commentId');

// ✅ comments কে আলাদা flat route হিসেবে নিন
// src/routes/index.ts → { path: '/comments', route: CommentRoutes }
router.get('/:commentId');                              // GET /comments/:commentId
router.get('/lesson/:lessonId');                        // GET /comments/lesson/:lessonId
```

### নেস্টিং সামঞ্জস্য (Consistency)

একই sub-resource-এর সব CRUD operation একই nesting level ব্যবহার করবে:

```typescript
// ❌ অসামঞ্জস্য — GET lesson অন্য level-এ
router.post('/:courseId/modules/:moduleId/lessons',              Controller.create);
router.get('/:courseId/lessons/:lessonId',                       Controller.getById);   // ❌ module level skip!
router.patch('/:courseId/modules/:moduleId/lessons/:lessonId',   Controller.update);

// ✅ সামঞ্জস্যপূর্ণ — সব lesson operation একই level-এ
router.post('/:courseId/modules/:moduleId/lessons',              Controller.create);
router.get('/:courseId/modules/:moduleId/lessons/:lessonId',     Controller.getById);   // ✅ consistent
router.patch('/:courseId/modules/:moduleId/lessons/:lessonId',   Controller.update);
```

---

## ৮. Action Endpoints (Non-CRUD Operations)

CRUD ছাড়া action-based endpoint গুলো কিভাবে design করবেন:

### Pattern: `METHOD /:id/action-name`

Action সবসময় resource ID-র পরে suffix হিসেবে আসবে:

```typescript
// ✅ সঠিক — action as suffix
router.patch('/:id/block',            UserController.blockUser);
router.patch('/:id/unblock',          UserController.unblockUser);
router.post('/:paymentId/refund',     PaymentController.refund);
router.patch('/:lessonId/visibility', CourseController.toggleVisibility);

// ❌ ভুল — action as prefix
router.post('/refund/:paymentId', PaymentController.refund);
router.post('/block/:id',        UserController.blockUser);
```

### Collection-level Actions

সব resource-এ একসাথে action করলে, ID ছাড়া action name ব্যবহার করুন:

```typescript
// ✅ Collection-level action
router.patch('/read-all',           NotificationController.readAll);
router.patch('/admin/read-all',     NotificationController.adminReadAll);

// ✅ Reorder (collection-level, must be before /:id)
router.patch('/:courseId/modules/reorder', CourseController.reorderModules);
```

### Action Method Selection Guide

| Action Type                     | Method  | উদাহরণ                          |
|---------------------------------|---------|----------------------------------|
| State toggle (block/unblock)    | `PATCH` | `PATCH /:id/block`              |
| Visibility toggle               | `PATCH` | `PATCH /:id/visibility`         |
| Mark as read                    | `PATCH` | `PATCH /:id/read`               |
| Batch update (read-all)         | `PATCH` | `PATCH /read-all`               |
| Reorder items                   | `PATCH` | `PATCH /:parentId/items/reorder`|
| Refund (irreversible)           | `POST`  | `POST /:paymentId/refund`       |
| Login/Logout                    | `POST`  | `POST /auth/login`              |
| Send verification email         | `POST`  | `POST /auth/verify-email`       |

---

## ৯. Route File-এ যা রাখবেন না (Anti-patterns)

### ৯.১ Business Logic Route File-এ রাখবেন না

Route file শুধুমাত্র middleware chain define করবে। কোনো data transformation বা business logic রাখবেন না।

```typescript
// ❌ FORBIDDEN — business logic route file-এ
router.post(
  '/',
  auth(...),
  fileUploadHandler(),
  async (req: Request, res: Response, next: NextFunction) => {
    // 50 lines of file type detection, attachment building...
    req.body = { ...req.body, sender: req.user.id, attachments, type };
    next();
  },
  MessageController.sendMessage
);

// ✅ সঠিক — সব logic controller/service-এ
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  fileHandler({ maxFilesTotal: 10, enforceAllowedFields: ['image', 'media', 'doc'] }),
  MessageController.sendMessage,   // controller-এ file processing logic
);
```

### ৯.২ Legacy Middleware ব্যবহার করবেন না

```typescript
// ❌ legacy middleware
import fileUploadHandler from '../../middlewares/fileUploadHandler';

// ✅ standard middleware
import { fileHandler } from '../../middlewares/fileHandler';
```

### ৯.৩ Error Response সরাসরি Route-এ পাঠাবেন না

```typescript
// ❌ সরাসরি error response route-এ
catch (error) {
  return res.status(500).json({ message: 'Invalid File Format' });
}

// ✅ ApiError throw করুন, globalErrorHandler handle করবে
throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid file format');
```

---

## ১০. Import Order (Route File)

Route file-এ imports এই ক্রমে সাজান:

```typescript
// 1. Express
import express from 'express';

// 2. Enums/Constants
import { USER_ROLES } from '../../../enums/user';

// 3. Middlewares (auth → fileHandler → validateRequest → rateLimit)
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { rateLimitMiddleware } from '../../middlewares/rateLimit';

// 4. Controller
import { FeatureController } from './feature.controller';

// 5. Validation
import { FeatureValidation } from './feature.validation';
```

---

## ১১. সম্পূর্ণ Route File Template

```typescript
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { FeatureController } from './feature.controller';
import { FeatureValidation } from './feature.validation';

const router = express.Router();

// ==================== FEATURE ROUTES ====================

// Create feature
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  validateRequest(FeatureValidation.createZodSchema),
  FeatureController.create,
);

// Get all features (public)
router.get('/', FeatureController.getAll);

// Get my features (authenticated)
router.get(
  '/my-features',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  FeatureController.getMyFeatures,
);

// Get feature by ID
router.get('/:id', FeatureController.getById);

// Update feature
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  validateRequest(FeatureValidation.updateZodSchema),
  FeatureController.update,
);

// Delete feature
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  FeatureController.remove,
);

// ==================== ACTIONS ====================

// Block feature
router.patch(
  '/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  FeatureController.block,
);

export const FeatureRoutes = router;
```

---

## ১২. Quick Checklist (নতুন Route তৈরির আগে)

- [ ] ফাইল নাম `*.route.ts` (singular)?
- [ ] Base path plural (`/features`, not `/feature`)?
- [ ] Fixed paths সব param paths-এর আগে?
- [ ] `reorder` / `stats` / named paths `/:id`-এর আগে declare করা হয়েছে?
- [ ] Middleware chain order: `rateLimit → auth → fileHandler → validateRequest → controller`?
- [ ] প্রতিটা POST/PATCH route-এ `validateRequest()` আছে?
- [ ] Standard `fileHandler` ব্যবহার হচ্ছে (legacy `fileUploadHandler` নয়)?
- [ ] Route file-এ কোনো business logic নেই?
- [ ] Action endpoints `/:id/action` format-এ (not `/action/:id`)?
- [ ] Sub-resource nesting ৩ level-এর বেশি নয়?
- [ ] একই sub-resource-এর সব operation একই nesting level-এ?
- [ ] Section comments আছে (১০+ routes হলে)?
- [ ] Export নাম `PascalCase` + `Routes` suffix?
- [ ] `src/routes/index.ts`-এ register করা হয়েছে?

---

## ১৩. Known Issues (পরিচিত সমস্যা — ভবিষ্যতে Fix করতে হবে)

| Issue | File | বর্তমান | সঠিক | Status |
|-------|------|---------|-------|--------|
| Action prefix pattern | payment.route.ts | `POST /refund/:paymentId` | `POST /:paymentId/refund` | Frontend sync needed |
| Redundant URL segment | user.route.ts | `GET /:id/user` | `GET /:id/public` or remove | Frontend sync needed |
| Missing validation | chat.route.ts | No `validateRequest` | Add Zod schemas | Separate task |
| Missing validation | payment.route.ts | No `validateRequest` | Add Zod schemas | Separate task |