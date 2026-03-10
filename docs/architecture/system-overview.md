# System Architecture Overview

**Project:** Enterprise Backend Template
**Tech Stack:** TypeScript + Express + MongoDB + Socket.IO + Stripe
**Last Updated:** 2025-11-25

---

## 📋 Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [Design Patterns](#design-patterns)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (Web Browser, Mobile App, Postman, etc.)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                │
│  │   CORS   │  │  Morgan  │  │ Rate Limit │                │
│  └──────────┘  └──────────┘  └───────────┘                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  MIDDLEWARE LAYER                            │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    Auth    │  │  Validation  │  │ File Upload  │        │
│  │    (JWT)   │  │    (Zod)     │  │   (Multer)   │        │
│  └────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTROLLER LAYER                           │
│         (Thin layer - Request/Response handling)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    User     │  │   Product   │  │   Order     │         │
│  │ Controller  │  │ Controller  │  │ Controller  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│          (Fat layer - Business logic)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    User     │  │   Product   │  │   Order     │         │
│  │   Service   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Model    │  │   Builder   │  │   Helper    │         │
│  │  (Mongoose) │  │   (Query)   │  │  (Cache)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │     Redis    │  │  File Store  │      │
│  │  (Primary)   │  │   (Cache)    │  │  (S3/Local)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘

                         PLUS

┌─────────────────────────────────────────────────────────────┐
│              REAL-TIME COMMUNICATION                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Socket.IO Server                       │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │       │
│  │  │ Chat Room  │  │ Presence   │  │   Events   │ │       │
│  │  └────────────┘  └────────────┘  └────────────┘ │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             EXTERNAL SERVICES                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Stripe  │  │  Nodema  │  │   AWS    │                  │
│  │ Payment  │  │   iler   │  │    S3    │                  │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### **Backend Framework**
- **Runtime:** Node.js v16+
- **Language:** TypeScript 5+
- **Framework:** Express.js
- **Server:** ts-node-dev (development), Node.js (production)

### **Database**
- **Primary:** MongoDB (Mongoose ORM)
- **Cache:** Redis (optional)
- **File Storage:** Local / AWS S3 / Cloudinary

### **Real-Time**
- **Protocol:** WebSocket (Socket.IO)
- **Features:** Chat, Notifications, Presence

### **Authentication**
- **Strategy:** JWT (Access + Refresh tokens)
- **Session:** Cookie-based

### **Payment**
- **Provider:** Stripe
- **Features:** Escrow, Connect, Webhooks

### **Validation**
- **Schema:** Zod
- **File Upload:** Multer + Sharp (image optimization)

### **Email**
- **Service:** Nodemailer
- **Templates:** Custom HTML templates

### **Logging & Monitoring**
- **Logger:** Winston (dual logger system)
- **Request Logging:** Morgan
- **Tracing:** OpenTelemetry
- **Metrics:** Custom Mongoose plugin

### **Code Quality**
- **Linter:** ESLint
- **Formatter:** Prettier
- **Testing:** Vitest + Supertest

---

## 🎨 Design Patterns

### **1. Module Pattern** (Feature-based)

Every feature follows this structure:

```
src/app/modules/{feature}/
├── {feature}.interface.ts      # Types & Interfaces
├── {feature}.model.ts          # Mongoose Schema
├── {feature}.controller.ts     # Request Handlers
├── {feature}.service.ts        # Business Logic
├── {feature}.route.ts          # Express Routes
└── {feature}.validation.ts     # Zod Schemas
```

**Benefits:**
- Clear separation of concerns
- Easy to locate code
- Scalable and maintainable
- Consistent across all features

### **2. Layered Architecture**

```
Routes → Middleware → Controller → Service → Model → Database
```

**Flow:**
1. **Route:** Define endpoint + middleware chain
2. **Middleware:** Auth, validation, file upload
3. **Controller:** Extract request data, call service
4. **Service:** Business logic, database operations
5. **Model:** Mongoose schema, queries
6. **Database:** MongoDB operations

**Benefits:**
- Thin controllers, fat services
- Testability (mock layers easily)
- Reusability (services used across controllers)

### **3. Dependency Injection**

Services depend on models, not vice versa:

```typescript
// service.ts
import { UserModel } from './user.model';

const getUser = async (id: string) => {
  return await UserModel.findById(id);
};
```

### **4. Repository Pattern** (via QueryBuilder)

Complex queries abstracted via QueryBuilder:

```typescript
const users = new QueryBuilder(User.find(), query)
  .search(['name', 'email'])
  .filter()
  .sort()
  .paginate();
```

### **5. Factory Pattern** (File Upload)

Multi-provider file upload:

```typescript
fileHandler({
  provider: 's3', // or 'local', 'cloudinary'
  fields: [...]
})
```

### **6. Observer Pattern** (Socket.IO Events)

Event-driven real-time communication:

```typescript
socket.on('send-message', (data) => {
  io.to(data.roomId).emit('new-message', message);
});
```

### **7. Middleware Chain Pattern**

Composable middleware:

```typescript
router.post(
  '/',
  auth(USER_ROLES.ADMIN),
  validateRequest(schema),
  fileHandler(['avatar']),
  rateLimit(),
  controller
);
```

---

## 📁 Project Structure

```
project/
├── src/
│   ├── app/
│   │   ├── modules/              # Feature modules
│   │   │   ├── user/
│   │   │   ├── auth/
│   │   │   ├── product/
│   │   │   └── ...
│   │   ├── middlewares/          # Global middleware
│   │   ├── builder/              # Query/Aggregation builders
│   │   ├── helpers/              # Helper functions
│   │   └── logging/              # Logging & tracing
│   ├── config/                   # Configuration
│   ├── enums/                    # Enum definitions
│   ├── errors/                   # Custom errors
│   ├── helpers/                  # Shared helpers
│   ├── routes/                   # Central routing
│   ├── shared/                   # Shared utilities
│   ├── types/                    # TypeScript types
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server initialization
├── scripts/                      # Code generation scripts
├── docs/                         # Documentation
├── tests/                        # Test files
├── public/                       # Static files
└── dist/                         # Compiled JavaScript
```

---

## 🔑 Core Components

### **1. Authentication System**
- JWT-based authentication
- Role-based access control (RBAC)
- Password reset flow
- Email verification

### **2. Real-Time System**
- Socket.IO server
- Chat rooms
- Presence tracking
- Typing indicators
- Unread counters

### **3. Payment System**
- Stripe integration
- Escrow payments
- Seller onboarding (Stripe Connect)
- Webhook handling
- Platform fees

### **4. File Upload System**
- Multi-provider support
- Image optimization (Sharp)
- Type validation
- Size limits
- Folder organization

### **5. Logging & Tracing**
- Winston logger (BD timezone)
- Morgan HTTP logging
- OpenTelemetry tracing
- Mongoose query metrics
- Request context tracking

### **6. Validation System**
- Zod schema validation
- Type-safe validation
- Custom validation rules
- Error formatting

---

## 🔄 Data Flow

### **Typical Request Flow:**

```
1. Client Request
   │
   ├─→ [CORS Middleware]
   │
   ├─→ [Morgan Logger]
   │
   ├─→ [Request Context] (AsyncLocalStorage)
   │
   ├─→ [Auth Middleware]
   │    ├─ Verify JWT
   │    ├─ Check role permissions
   │    └─ Attach user to req.user
   │
   ├─→ [Validation Middleware]
   │    ├─ Validate req.body/params/query
   │    └─ Throw error if invalid
   │
   ├─→ [File Handler] (if needed)
   │    ├─ Upload files
   │    ├─ Optimize images
   │    └─ Store paths in req.body
   │
   ├─→ [Controller]
   │    ├─ Extract data from request
   │    ├─ Call service method
   │    └─ Send standardized response
   │
   ├─→ [Service]
   │    ├─ Business logic
   │    ├─ Database operations
   │    ├─ External API calls
   │    └─ Return data
   │
   ├─→ [Model/Database]
   │    ├─ Mongoose query
   │    ├─ Data validation
   │    └─ Return documents
   │
   └─→ Response to Client
```

---

## 🔒 Security Architecture

### **1. Authentication**
- JWT tokens (httpOnly cookies)
- Refresh token rotation
- Token expiration
- Secure password hashing (bcrypt)

### **2. Authorization**
- Role-based access control
- Route-level permissions
- Resource ownership checks

### **3. Input Validation**
- Zod schema validation
- SQL/NoSQL injection prevention
- XSS protection
- File type validation

### **4. Rate Limiting**
- Per-route limits
- IP-based throttling
- Redis-backed (distributed)

### **5. CORS**
- Whitelist origins
- Credential support
- Preflight handling

### **6. Data Protection**
- Password fields excluded by default
- Sensitive data redaction
- HTTPS enforcement (production)

### **7. Error Handling**
- No stack traces in production
- Generic error messages
- Detailed logging (server-side)

---

## 🎯 Architecture Principles

### **1. Separation of Concerns**
- Each layer has single responsibility
- Controllers don't contain business logic
- Services don't handle HTTP

### **2. DRY (Don't Repeat Yourself)**
- Shared utilities
- Reusable middleware
- Common patterns abstracted

### **3. Type Safety**
- TypeScript everywhere
- Strong typing
- Interface-first design

### **4. Testability**
- Pure functions
- Mockable dependencies
- Isolated layers

### **5. Scalability**
- Stateless architecture
- Horizontal scaling ready
- Database indexing
- Query optimization

### **6. Maintainability**
- Consistent patterns
- Clear naming
- Comprehensive documentation
- Auto-generated code

---

## 📈 Performance Considerations

### **Database**
- Proper indexing
- Query optimization
- Aggregation pipelines
- Connection pooling

### **Caching**
- Redis for sessions
- Query result caching
- Static file caching

### **File Uploads**
- Image optimization
- CDN integration
- Lazy loading

### **API**
- Pagination
- Field selection
- Compression (gzip)
- Rate limiting

---

## 🔮 Future Enhancements

1. **Microservices:** Split into smaller services
2. **GraphQL:** Alternative API layer
3. **Message Queue:** RabbitMQ/Redis for async tasks
4. **Elasticsearch:** Advanced search
5. **Docker:** Containerization
6. **CI/CD:** Automated deployment
7. **Monitoring:** Grafana/Prometheus

---

**Documentation Version:** 1.0.0
**Last Review:** 2025-11-25
**Next Review:** Every major release
