# Data Flow Documentation

**Project:** Enterprise Backend Template
**Last Updated:** 2025-11-25

---

## 📋 Table of Contents

1. [Request Lifecycle](#request-lifecycle)
2. [Authentication Flow](#authentication-flow)
3. [CRUD Operation Flows](#crud-operation-flows)
4. [File Upload Flow](#file-upload-flow)
5. [Real-Time Data Flow](#real-time-data-flow)
6. [Error Handling Flow](#error-handling-flow)

---

## 🔄 Request Lifecycle

### **Complete Request Flow (HTTP)**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                             │
│    GET /api/v1/products?page=1&limit=20                      │
│    Headers: { Authorization: "Bearer <token>" }              │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. SERVER RECEIVES REQUEST (Express)                         │
│    - Parse URL, headers, body                                │
│    - Create req, res objects                                 │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. CORS MIDDLEWARE                                           │
│    ✓ Check origin                                            │
│    ✓ Set CORS headers                                        │
│    ✓ Handle preflight (OPTIONS)                              │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. MORGAN LOGGER (HTTP Request Logging)                     │
│    → Log: "GET /api/v1/products 200 45ms"                   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. REQUEST CONTEXT (AsyncLocalStorage)                      │
│    → Store: { requestId, userId, timestamp, IP }            │
│    → Available globally via getRequestContext()             │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. OPENTELEMETRY SPAN                                        │
│    → Start span: "GET /api/v1/products"                     │
│    → Track duration, labels                                 │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. BODY PARSER (Express built-in)                           │
│    → Parse JSON body                                         │
│    → Attach to req.body                                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. ROUTING                                                   │
│    → Match route: /api/v1/products                          │
│    → Execute middleware chain                                │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. AUTH MIDDLEWARE (if protected route)                     │
│    ┌──────────────────────────────────────────────┐         │
│    │ Extract JWT from:                            │         │
│    │  - Authorization header (Bearer token)       │         │
│    │  - Cookies (accessToken)                     │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Verify JWT:                                  │         │
│    │  ✓ Signature valid?                          │         │
│    │  ✓ Not expired?                              │         │
│    │  ✓ Decode payload                            │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Check Role Permissions:                      │         │
│    │  ✓ User role: POSTER                         │         │
│    │  ✓ Required role: GUEST                      │         │
│    │  ✓ Access granted!                           │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Attach user to request:                      │         │
│    │  req.user = { id, email, role }              │         │
│    └──────────────────────────────────────────────┘         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 10. VALIDATION MIDDLEWARE (Zod)                             │
│    ┌──────────────────────────────────────────────┐         │
│    │ Validate req.query:                          │         │
│    │  ✓ page: number (valid)                      │         │
│    │  ✓ limit: number (valid)                     │         │
│    │  ✓ No unknown fields                         │         │
│    └──────────────────────────────────────────────┘         │
│    → If invalid: throw ValidationError (400)                │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 11. CONTROLLER (ProductController.getAllProducts)           │
│    ```typescript                                             │
│    const getAllProducts = catchAsync(async (req, res) => {  │
│      // Extract query params                                │
│      const query = req.query;                               │
│                                                              │
│      // Call service                                        │
│      const result = await ProductService                    │
│        .getAllProductsFromDB(query);                        │
│                                                              │
│      // Send response                                       │
│      sendResponse(res, {                                    │
│        statusCode: 200,                                     │
│        success: true,                                       │
│        message: 'Products retrieved',                       │
│        pagination: result.pagination,                       │
│        data: result.data                                    │
│      });                                                    │
│    });                                                      │
│    ```                                                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 12. SERVICE (ProductService.getAllProductsFromDB)           │
│    ┌──────────────────────────────────────────────┐         │
│    │ Build Query with QueryBuilder:               │         │
│    │  const qb = new QueryBuilder(                │         │
│    │    Product.find(),                           │         │
│    │    query                                     │         │
│    │  )                                           │         │
│    │    .search(['title', 'description'])         │         │
│    │    .filter()                                 │         │
│    │    .sort()                                   │         │
│    │    .paginate()                               │         │
│    │    .fields();                                │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Execute Query:                                │         │
│    │  const data = await qb.modelQuery            │         │
│    │    .populate('seller', 'name email');        │         │
│    │                                              │         │
│    │  const pagination =                          │         │
│    │    await qb.getPaginationInfo();             │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Return result:                                │         │
│    │  return { data, pagination }                 │         │
│    └──────────────────────────────────────────────┘         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 13. MODEL/DATABASE (Mongoose → MongoDB)                     │
│    ┌──────────────────────────────────────────────┐         │
│    │ Mongoose Query Execution:                    │         │
│    │  Product.find()                              │         │
│    │    .where({ $text: { $search: 'laptop' } }) │         │
│    │    .sort({ createdAt: -1 })                 │         │
│    │    .skip(0)                                  │         │
│    │    .limit(20)                                │         │
│    │    .populate('seller')                       │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ MongoDB Operations:                          │         │
│    │  - Use text index for search                │         │
│    │  - Apply filters                            │         │
│    │  - Sort results                             │         │
│    │  - Paginate (skip + limit)                  │         │
│    │  - Join with User collection (populate)     │         │
│    │  - Return documents                         │         │
│    └──────────────────┬───────────────────────────┘         │
│                       ▼                                      │
│    ┌──────────────────────────────────────────────┐         │
│    │ Mongoose Metrics Plugin:                     │         │
│    │  - Log query duration: 45ms                  │         │
│    │  - Log docs scanned: 100                     │         │
│    │  - Log docs returned: 20                     │         │
│    │  - Log index used: title_text               │         │
│    └──────────────────────────────────────────────┘         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 14. RESPONSE PREPARATION (sendResponse utility)             │
│    ```typescript                                             │
│    {                                                         │
│      success: true,                                          │
│      statusCode: 200,                                        │
│      message: 'Products retrieved successfully',            │
│      pagination: {                                           │
│        page: 1,                                             │
│        limit: 20,                                           │
│        total: 100,                                          │
│        totalPage: 5                                         │
│      },                                                     │
│      data: [ /* 20 products */ ]                            │
│    }                                                        │
│    ```                                                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 15. RESPONSE LOGGING                                         │
│    → Store response payload in res.locals                   │
│    → Log response size, status code                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 16. OPENTELEMETRY SPAN END                                  │
│    → End span                                                │
│    → Log duration: 58ms                                      │
│    → Timeline visualization in console                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ 17. SEND TO CLIENT                                           │
│    HTTP/1.1 200 OK                                           │
│    Content-Type: application/json                            │
│    {                                                         │
│      "success": true,                                        │
│      "message": "Products retrieved successfully",          │
│      "pagination": { ... },                                 │
│      "data": [ ... ]                                        │
│    }                                                        │
└──────────────────────────────────────────────────────────────┘
```

**Total Duration:** ~58ms
- Middleware: ~10ms
- Service/Database: ~45ms
- Response formatting: ~3ms

---

## 🔐 Authentication Flow

### **Login Flow (JWT)**

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│  POST /api/v1/auth/login                                     │
│  Body: { email, password }                                   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ VALIDATION MIDDLEWARE                                        │
│  ✓ Email format valid                                        │
│  ✓ Password provided                                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthController.login                                         │
│  → Call AuthService.loginToDB(email, password)              │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthService.loginToDB                                        │
│  ┌────────────────────────────────────────┐                 │
│  │ 1. Find user by email:                 │                 │
│  │    const user = await User.findOne(    │                 │
│  │      { email }                         │                 │
│  │    ).select('+password');              │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 2. Check if user exists:               │                 │
│  │    if (!user) throw NotFound           │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 3. Verify password:                    │                 │
│  │    const isMatch = await bcrypt        │                 │
│  │      .compare(password, user.password) │                 │
│  │    if (!isMatch) throw Unauthorized    │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 4. Generate JWT tokens:                │                 │
│  │    const accessToken = jwt.sign(       │                 │
│  │      { id, email, role },              │                 │
│  │      SECRET,                           │                 │
│  │      { expiresIn: '1d' }               │                 │
│  │    );                                  │                 │
│  │                                        │                 │
│  │    const refreshToken = jwt.sign(      │                 │
│  │      { id },                           │                 │
│  │      REFRESH_SECRET,                   │                 │
│  │      { expiresIn: '7d' }               │                 │
│  │    );                                  │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 5. Return user + tokens                │                 │
│  │    return { user, accessToken,         │                 │
│  │             refreshToken }             │                 │
│  └────────────────────────────────────────┘                 │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthController.login (continued)                             │
│  → Set cookies:                                              │
│    res.cookie('accessToken', token, {                        │
│      httpOnly: true,                                         │
│      secure: true,                                           │
│      sameSite: 'strict'                                      │
│    });                                                       │
│                                                              │
│  → Send response:                                            │
│    {                                                         │
│      success: true,                                          │
│      message: 'Login successful',                           │
│      data: { user, accessToken, refreshToken }              │
│    }                                                        │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│  ✓ Store accessToken (localStorage/memory)                  │
│  ✓ Store refreshToken (httpOnly cookie)                     │
│  ✓ Include in future requests:                              │
│    Authorization: Bearer <accessToken>                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 CRUD Operation Flows

### **CREATE Flow**

```
POST /api/v1/products
Body: { title, price, sellerId, images }

↓ Validation (Zod)
↓ Auth Check (JWT + Role)
↓ File Upload (if images provided)
↓ Controller: ProductController.createProduct
  ↓ Service: ProductService.createProductToDB(data)
    ↓ Check duplicates (optional)
    ↓ Model: Product.create(data)
      ↓ Pre-save hook runs
      ↓ MongoDB: Insert document
      ↓ Return created document
    ↓ Emit Socket.IO event (optional)
    ↓ Send notification (optional)
  ↓ Return created product
↓ Response: 201 Created
```

### **READ Flow (List with Pagination)**

```
GET /api/v1/products?page=1&limit=20&searchTerm=laptop

↓ Auth Check (allow GUEST)
↓ Query Validation
↓ Controller: ProductController.getAllProducts
  ↓ Service: ProductService.getAllProductsFromDB(query)
    ↓ QueryBuilder:
      - Build search query ($text)
      - Apply filters (status, category, etc.)
      - Sort (createdAt: -1)
      - Paginate (skip, limit)
      - Select fields
    ↓ Model: Product.find(query).populate('seller')
      ↓ MongoDB: Execute query with indexes
      ↓ Return documents
    ↓ Calculate pagination metadata
  ↓ Return { data, pagination }
↓ Response: 200 OK
```

### **UPDATE Flow**

```
PATCH /api/v1/products/:id
Body: { title: 'Updated Title' }

↓ Param Validation (id format)
↓ Body Validation (Zod)
↓ Auth Check (owner or admin)
↓ Controller: ProductController.updateProduct
  ↓ Service: ProductService.updateProductToDB(id, data)
    ↓ Check existence: Product.findById(id)
    ↓ Check ownership (if needed)
    ↓ File cleanup (if images updated)
    ↓ Model: Product.findByIdAndUpdate(id, data, { new: true })
      ↓ MongoDB: Update document
      ↓ Return updated document
    ↓ Emit Socket.IO event (optional)
  ↓ Return updated product
↓ Response: 200 OK
```

### **DELETE Flow**

```
DELETE /api/v1/products/:id

↓ Param Validation
↓ Auth Check (admin only)
↓ Controller: ProductController.deleteProduct
  ↓ Service: ProductService.deleteProductFromDB(id)
    ↓ Model: Product.findByIdAndDelete(id)
      ↓ MongoDB: Delete document
      ↓ Return deleted document
    ↓ Cleanup files (if any)
    ↓ Delete related data (cascade)
  ↓ Return deleted product
↓ Response: 200 OK
```

---

## 📁 File Upload Flow

```
POST /api/v1/products (with files)
Content-Type: multipart/form-data
Body:
  - title: "Product"
  - images: [file1.jpg, file2.png]

↓ Multer Middleware (fileHandler)
  ↓ Parse multipart form data
  ↓ Validate file type (images only)
  ↓ Validate file size (< 5MB per file)
  ↓ Validate count (max 10 files)
  ↓
  ↓ For each file:
    ↓ Generate unique filename
    ↓ Choose storage provider:
      ├─ Local: Save to public/uploads/
      ├─ S3: Upload to AWS S3
      └─ Cloudinary: Upload to Cloudinary
    ↓
    ↓ If image:
      ↓ Sharp optimization:
        - Resize if needed
        - Convert to WebP
        - Compress quality
        - Strip metadata
    ↓
    ↓ Save file
    ↓ Get file path/URL
  ↓
  ↓ Attach paths to req.body:
    req.body.images = [
      '/uploads/products/abc123.webp',
      '/uploads/products/def456.webp'
    ]

↓ Continue to validation & controller
↓ Save paths in database
↓ Return product with image URLs
```

---

## 🔄 Real-Time Data Flow (Socket.IO)

### **Chat Message Flow**

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT A                                                     │
│  socket.emit('send-message', {                               │
│    chatId: '123',                                            │
│    text: 'Hello!',                                           │
│    sender: 'user1'                                           │
│  });                                                         │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ SOCKET.IO SERVER                                             │
│  socket.on('send-message', async (data) => {                │
│    ┌────────────────────────────────────────┐               │
│    │ 1. Validate data                       │               │
│    │ 2. Save to database:                   │               │
│    │    const message = await Message       │               │
│    │      .create(data);                    │               │
│    │ 3. Populate sender details             │               │
│    │ 4. Emit to chat room:                  │               │
│    │    io.to(chatId).emit(                 │               │
│    │      'new-message',                    │               │
│    │      message                           │               │
│    │    );                                  │               │
│    │ 5. Update unread counters              │               │
│    │ 6. Send push notifications             │               │
│    └────────────────────────────────────────┘               │
│  });                                                         │
└─────────────┬────────────────────────┬───────────────────────┘
              │                        │
              ▼                        ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ CLIENT A (Sender)       │  │ CLIENT B (Receiver)     │
│  Receive confirmation   │  │  socket.on(             │
│  Mark as sent           │  │    'new-message',       │
│                         │  │    (message) => {       │
│                         │  │      // Display message │
│                         │  │      // Play sound      │
│                         │  │      // Show notif      │
│                         │  │    }                    │
│                         │  │  );                     │
└─────────────────────────┘  └─────────────────────────┘
```

---

## ⚠️ Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│ REQUEST                                                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ MIDDLEWARE/CONTROLLER/SERVICE                                │
│  ↓ Error thrown (any type)                                   │
│  ↓ catchAsync wrapper catches it                             │
│  ↓ Passes to next(error)                                     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ GLOBAL ERROR HANDLER                                         │
│  (src/app/middlewares/globalErrorHandler.ts)                │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ 1. Identify error type:                │                 │
│  │    - ApiError (custom)                 │                 │
│  │    - ValidationError (Mongoose/Zod)    │                 │
│  │    - CastError (MongoDB)               │                 │
│  │    - MulterError (file upload)         │                 │
│  │    - JWTError (authentication)         │                 │
│  │    - Generic Error                     │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 2. Format error response:              │                 │
│  │    {                                   │                 │
│  │      success: false,                   │                 │
│  │      message: 'Error message',         │                 │
│  │      errorMessages: [                  │                 │
│  │        { path: 'field', message: '...' }│                 │
│  │      ],                                │                 │
│  │      stack: (dev only)                 │                 │
│  │    }                                   │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 3. Log error:                          │                 │
│  │    - Winston logger (error level)      │                 │
│  │    - Include stack trace              │                 │
│  │    - Include request context          │                 │
│  └────────────────┬───────────────────────┘                 │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                 │
│  │ 4. Send response:                      │                 │
│  │    res.status(statusCode).json(error)  │                 │
│  └────────────────────────────────────────┘                 │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│  Receives error response:                                    │
│  {                                                           │
│    "success": false,                                         │
│    "message": "Product not found",                          │
│    "errorMessages": []                                      │
│  }                                                          │
└──────────────────────────────────────────────────────────────┘
```

---

**Documentation Version:** 1.0.0
**Last Review:** 2025-11-25
