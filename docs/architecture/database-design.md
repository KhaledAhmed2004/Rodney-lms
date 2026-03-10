# Database Design Documentation

**Project:** Enterprise Backend Template
**Database:** MongoDB with Mongoose ODM
**Last Updated:** 2025-11-25

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Schema Design Patterns](#schema-design-patterns)
4. [Collections Overview](#collections-overview)
5. [Relationships & References](#relationships--references)
6. [Indexing Strategy](#indexing-strategy)
7. [Data Validation](#data-validation)
8. [Best Practices](#best-practices)

---

## 🎯 Overview

This application uses **MongoDB** as the primary database with **Mongoose** as the Object Data Modeling (ODM) library. MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents.

### Why MongoDB?

**Advantages for this project:**
- **Flexible Schema**: Easy to evolve data models
- **Scalability**: Horizontal scaling with sharding
- **Performance**: Fast read/write operations
- **Rich Queries**: Powerful aggregation framework
- **JSON-Native**: Natural fit for JavaScript/TypeScript
- **Relationships**: Supports both embedded and referenced data

### Database Stack

- **Database**: MongoDB 6.0+
- **ODM**: Mongoose 8.0+
- **Query Builder**: Custom QueryBuilder class
- **Aggregation**: Custom AggregationBuilder class
- **Transactions**: Multi-document ACID transactions
- **Indexes**: Compound and single-field indexes

---

## 🏗️ Database Architecture

### Connection Architecture

```
┌─────────────────────────────────────────────┐
│          Application Layer                  │
│  (Express Server + Socket.IO)               │
└────────────────┬────────────────────────────┘
                 │
                 │ Mongoose Connection
                 │ (Connection Pool)
                 ▼
┌─────────────────────────────────────────────┐
│         MongoDB Database                    │
│  ┌────────────────────────────────────┐    │
│  │         Collections:                │    │
│  │  • users                            │    │
│  │  • products                         │    │
│  │  • chats                            │    │
│  │  • messages                         │    │
│  │  • payments                         │    │
│  │  • notifications                    │    │
│  │  • bookmarks                        │    │
│  │  • resettokens                      │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Connection Configuration

**Location**: `src/server.ts`

```typescript
import mongoose from 'mongoose';
import config from './config';

const connectDB = async () => {
  try {
    await mongoose.connect(config.database_url as string, {
      dbName: 'enterprise-backend', // Database name
    });

    console.log('✅ Database connected successfully');

    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};
```

**Connection Pool Settings:**
- Default pool size: 10 connections
- Auto-reconnect on disconnect
- Graceful shutdown on SIGINT/SIGTERM

---

## 🎨 Schema Design Patterns

### Pattern 1: Embedded Documents

**Use When:** One-to-few relationships, data that's always queried together

**Example: User with Embedded Address**

```typescript
const userSchema = new Schema({
  name: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
});
```

**Pros:**
- Fast reads (single query)
- Data locality (related data together)
- Atomic updates

**Cons:**
- Data duplication if same address shared
- Document size limits (16MB max)
- Harder to query embedded data independently

### Pattern 2: References (Normalization)

**Use When:** One-to-many or many-to-many relationships, independent entities

**Example: Product with Seller Reference**

```typescript
const productSchema = new Schema({
  title: String,
  price: Number,
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to User collection
    required: true,
  },
});
```

**Pros:**
- No data duplication
- Independent entity updates
- Smaller documents
- Easy to query referenced data

**Cons:**
- Multiple queries (or populate)
- Slower reads
- Potential data inconsistency

### Pattern 3: Hybrid Approach

**Use When:** Need both performance and flexibility

**Example: Message with Sender Reference + Cached Name**

```typescript
const messageSchema = new Schema({
  content: String,
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: String, // Cached for fast display
  senderAvatar: String, // Cached for fast display
  chat: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
});
```

**Pros:**
- Fast reads (no populate needed for display)
- Reference available for full user data
- Best of both worlds

**Cons:**
- Data duplication (need sync mechanism)
- Slightly larger documents

### Pattern 4: Bucketing (Time-Series Data)

**Use When:** Large amount of time-series data

**Example: Messages Grouped by Chat**

```typescript
const chatSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: {
    content: String,
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date,
  },
  messageCount: Number,
  createdAt: Date,
  updatedAt: Date,
});

const messageSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  type: { type: String, enum: ['text', 'image', 'file'] },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: Date,
});
```

**Pros:**
- Efficient queries (group by chat)
- Easy pagination
- Clear data boundaries

**Cons:**
- Need to maintain bucket metadata (message count, last message)

---

## 📊 Collections Overview

### Users Collection

**Purpose**: Store user accounts and authentication data

**Schema**: `src/app/modules/user/user.model.ts`

```typescript
{
  name: String,              // Full name
  email: String,             // Unique email (indexed)
  password: String,          // Hashed password (select: false)
  role: Enum,                // 'admin' | 'seller' | 'buyer'
  status: Enum,              // 'active' | 'blocked' | 'deleted'
  avatar: String,            // Profile picture URL
  phone: String,             // Phone number
  isEmailVerified: Boolean,  // Email verification status
  createdAt: Date,           // Auto-generated
  updatedAt: Date,           // Auto-generated
}
```

**Indexes:**
```typescript
userSchema.index({ email: 1 }); // Unique email lookup
userSchema.index({ role: 1, status: 1 }); // Filter by role and status
userSchema.index({ createdAt: -1 }); // Sort by registration date
```

**Relationships:**
- One user → Many products (seller)
- One user → Many chats (participant)
- One user → Many messages (sender)
- One user → Many payments (buyer/seller)
- One user → Many bookmarks

### Products Collection

**Purpose**: Store product listings

**Schema**: `src/app/modules/product/product.model.ts` (if exists)

```typescript
{
  title: String,             // Product name
  description: String,       // Product description
  price: Number,             // Product price
  category: Enum,            // Product category
  images: [String],          // Image URLs
  seller: ObjectId,          // Reference to User
  status: Enum,              // 'active' | 'sold' | 'deleted'
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number],   // [longitude, latitude]
  },
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
productSchema.index({ seller: 1 }); // Get products by seller
productSchema.index({ category: 1, status: 1 }); // Filter by category
productSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial queries
productSchema.index({ title: 'text', description: 'text' }); // Text search
```

**Relationships:**
- Many products → One seller (User)
- One product → Many bookmarks
- One product → Many payments

### Chats Collection

**Purpose**: Store chat conversations

**Schema**: `src/app/modules/chat/chat.model.ts`

```typescript
{
  participants: [ObjectId],  // Array of User IDs
  lastMessage: {
    content: String,
    sender: ObjectId,
    createdAt: Date,
  },
  unreadCount: Map,          // Map<userId, count>
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
chatSchema.index({ participants: 1 }); // Find chats by participant
chatSchema.index({ updatedAt: -1 }); // Sort by recent activity
```

**Relationships:**
- One chat → Many participants (User)
- One chat → Many messages

### Messages Collection

**Purpose**: Store individual chat messages

**Schema**: `src/app/modules/message/message.model.ts`

```typescript
{
  chat: ObjectId,            // Reference to Chat
  sender: ObjectId,          // Reference to User
  content: String,           // Message text
  type: Enum,                // 'text' | 'image' | 'file'
  fileUrl: String,           // File URL (if type = 'file' or 'image')
  readBy: [ObjectId],        // Array of User IDs who read the message
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
messageSchema.index({ chat: 1, createdAt: -1 }); // Get messages by chat (sorted)
messageSchema.index({ sender: 1 }); // Get messages by sender
messageSchema.index({ readBy: 1 }); // Check if message read
```

**Relationships:**
- Many messages → One chat
- Many messages → One sender (User)

### Payments Collection

**Purpose**: Store payment transactions (Stripe escrow)

**Schema**: `src/app/modules/payment/payment.model.ts`

```typescript
{
  buyer: ObjectId,           // Reference to User (buyer)
  seller: ObjectId,          // Reference to User (seller)
  product: ObjectId,         // Reference to Product
  amount: Number,            // Payment amount (in cents)
  platformFee: Number,       // Platform fee (in cents)
  sellerAmount: Number,      // Amount seller receives
  currency: String,          // 'usd', 'eur', etc.
  status: Enum,              // 'pending' | 'completed' | 'failed' | 'refunded'
  paymentIntentId: String,   // Stripe PaymentIntent ID
  transferId: String,        // Stripe Transfer ID (to seller)
  metadata: Object,          // Additional data
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
paymentSchema.index({ buyer: 1 }); // Get payments by buyer
paymentSchema.index({ seller: 1 }); // Get payments by seller
paymentSchema.index({ status: 1 }); // Filter by status
paymentSchema.index({ paymentIntentId: 1 }); // Lookup by Stripe ID
```

**Relationships:**
- Many payments → One buyer (User)
- Many payments → One seller (User)
- Many payments → One product

### Notifications Collection

**Purpose**: Store user notifications

**Schema**: `src/app/modules/notification/notification.model.ts`

```typescript
{
  recipient: ObjectId,       // Reference to User
  sender: ObjectId,          // Reference to User (optional)
  type: Enum,                // 'message' | 'payment' | 'system'
  title: String,             // Notification title
  message: String,           // Notification content
  data: Object,              // Additional data (product ID, chat ID, etc.)
  isRead: Boolean,           // Read status
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
notificationSchema.index({ recipient: 1, isRead: 1 }); // Get unread notifications
notificationSchema.index({ createdAt: -1 }); // Sort by date
```

**Relationships:**
- Many notifications → One recipient (User)
- Many notifications → One sender (User)

### Bookmarks Collection

**Purpose**: Store user bookmarks/favorites

**Schema**: `src/app/modules/bookmark/bookmark.model.ts`

```typescript
{
  user: ObjectId,            // Reference to User
  product: ObjectId,         // Reference to Product
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```typescript
bookmarkSchema.index({ user: 1, product: 1 }, { unique: true }); // Prevent duplicates
bookmarkSchema.index({ user: 1 }); // Get bookmarks by user
```

**Relationships:**
- Many bookmarks → One user
- Many bookmarks → One product

### ResetTokens Collection

**Purpose**: Store password reset tokens

**Schema**: `src/app/modules/auth/resetToken/resetToken.model.ts`

```typescript
{
  user: ObjectId,            // Reference to User
  token: String,             // Hashed reset token
  expiresAt: Date,           // Token expiration
  used: Boolean,             // Whether token was used
  createdAt: Date,
}
```

**Indexes:**
```typescript
resetTokenSchema.index({ token: 1 }); // Lookup by token
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index (auto-delete)
```

**Relationships:**
- Many reset tokens → One user

---

## 🔗 Relationships & References

### Relationship Types

#### 1. One-to-One

**Example**: User → Profile (if separated)

```typescript
const profileSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    unique: true, // Ensures one-to-one
  },
  bio: String,
  website: String,
});
```

#### 2. One-to-Many

**Example**: User → Products (seller has many products)

```typescript
const productSchema = new Schema({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: String,
  price: Number,
});
```

**Queries:**
```typescript
// Get all products by seller
const products = await Product.find({ seller: userId });

// Get product with seller info
const product = await Product.findById(id).populate('seller', 'name email avatar');
```

#### 3. Many-to-Many

**Example**: Chats ↔ Users (many users in many chats)

```typescript
const chatSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  lastMessage: Object,
});
```

**Queries:**
```typescript
// Get all chats for a user
const chats = await Chat.find({ participants: userId });

// Get chat with participant info
const chat = await Chat.findById(id).populate('participants', 'name avatar');
```

### Populate Examples

**Basic Populate:**
```typescript
const product = await Product.findById(id).populate('seller');
// product.seller is now a User object, not just an ID
```

**Selective Populate:**
```typescript
const product = await Product.findById(id).populate('seller', 'name email avatar');
// Only populate specific fields
```

**Nested Populate:**
```typescript
const message = await Message.findById(id)
  .populate('sender', 'name avatar')
  .populate({
    path: 'chat',
    populate: {
      path: 'participants',
      select: 'name avatar',
    },
  });
// Populate chat, then populate participants within chat
```

**Multiple Populates:**
```typescript
const payment = await Payment.findById(id)
  .populate('buyer', 'name email')
  .populate('seller', 'name email')
  .populate('product', 'title price');
// Populate multiple references
```

### Virtual Populate

**Use When**: Reverse population (parent → children without storing array)

**Example**: User → Products (virtual)

```typescript
// In user.model.ts
userSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'seller',
});

// Usage
const user = await User.findById(id).populate('products');
// user.products contains all products where seller = user._id
```

---

## 🔍 Indexing Strategy

### Why Indexes?

**Without Index**: MongoDB scans entire collection (slow)
**With Index**: MongoDB uses B-tree to find documents (fast)

**Trade-off**: Faster reads, slower writes (index must be updated)

### Index Types

#### 1. Single-Field Index

**Use**: Query by single field

```typescript
userSchema.index({ email: 1 }); // Ascending index
```

**Queries Optimized:**
```typescript
User.findOne({ email: 'test@example.com' }); // Fast
User.find({ email: 'test@example.com' }); // Fast
```

#### 2. Compound Index

**Use**: Query by multiple fields together

```typescript
userSchema.index({ role: 1, status: 1 });
```

**Queries Optimized:**
```typescript
User.find({ role: 'seller', status: 'active' }); // Fast
User.find({ role: 'seller' }); // Fast (left-most prefix)
User.find({ status: 'active' }); // Slow (not left-most)
```

**Index Prefix Rule**: Compound index `{ a: 1, b: 1, c: 1 }` can optimize:
- `{ a: 1 }`
- `{ a: 1, b: 1 }`
- `{ a: 1, b: 1, c: 1 }`

But NOT:
- `{ b: 1 }`
- `{ c: 1 }`
- `{ b: 1, c: 1 }`

#### 3. Unique Index

**Use**: Ensure field uniqueness

```typescript
userSchema.index({ email: 1 }, { unique: true });
```

**Effect**: Prevents duplicate emails

#### 4. Text Index

**Use**: Full-text search

```typescript
productSchema.index({ title: 'text', description: 'text' });
```

**Queries:**
```typescript
Product.find({ $text: { $search: 'laptop gaming' } });
```

#### 5. Geospatial Index (2dsphere)

**Use**: Location-based queries

```typescript
productSchema.index({ 'location.coordinates': '2dsphere' });
```

**Queries:**
```typescript
// Find products within 10km of a point
Product.find({
  'location.coordinates': {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 10000, // 10km in meters
    },
  },
});
```

#### 6. TTL Index (Time-To-Live)

**Use**: Auto-delete expired documents

```typescript
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Effect**: Documents auto-deleted when `expiresAt` passes

### Indexing Best Practices

**✅ DO:**
- Index frequently queried fields
- Index fields used in sorting
- Use compound indexes for multi-field queries
- Create unique indexes for unique fields (email, username)
- Monitor slow queries and add indexes

**❌ DON'T:**
- Over-index (each index slows writes)
- Index low-cardinality fields (boolean, small enums)
- Duplicate indexes (MongoDB uses only one per query)
- Index fields that change frequently

**Performance Impact:**
- **Read**: 100x - 1000x faster with proper indexes
- **Write**: 5-10% slower per index
- **Storage**: ~10% increase per index

### Analyzing Queries

**Use `.explain()` to check if index is used:**

```typescript
const explain = await User.find({ email: 'test@example.com' }).explain('executionStats');

console.log(explain.executionStats);
// {
//   executionSuccess: true,
//   nReturned: 1,              // Documents returned
//   executionTimeMillis: 2,    // Query time
//   totalKeysExamined: 1,      // Keys examined
//   totalDocsExamined: 1,      // Documents scanned
//   executionStages: {
//     stage: 'FETCH',
//     inputStage: {
//       stage: 'IXSCAN',        // Index scan (GOOD!)
//       indexName: 'email_1',
//     }
//   }
// }
```

**Good**: `stage: 'IXSCAN'` (index scan)
**Bad**: `stage: 'COLLSCAN'` (collection scan)

---

## ✅ Data Validation

### Mongoose Schema Validation

**Built-in Validators:**

```typescript
const userSchema = new Schema({
  // Required
  name: {
    type: String,
    required: [true, 'Name is required'],
  },

  // Min/Max length
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    maxlength: [50, 'Password cannot exceed 50 characters'],
  },

  // Min/Max value
  age: {
    type: Number,
    min: [18, 'Must be at least 18 years old'],
    max: [120, 'Invalid age'],
  },

  // Enum
  role: {
    type: String,
    enum: {
      values: ['admin', 'seller', 'buyer'],
      message: '{VALUE} is not a valid role',
    },
  },

  // Unique (creates index)
  email: {
    type: String,
    unique: true,
  },

  // Match (regex)
  phone: {
    type: String,
    match: [/^[0-9]{10,15}$/, 'Invalid phone number'],
  },

  // Custom validator
  price: {
    type: Number,
    validate: {
      validator: function (value) {
        return value > 0;
      },
      message: 'Price must be positive',
    },
  },
});
```

### Custom Validation Methods

**Instance Method:**
```typescript
userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};
```

**Static Method:**
```typescript
userSchema.statics.findActiveUsers = function () {
  return this.find({ status: 'active' });
};
```

**Pre-Save Validation:**
```typescript
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

### Zod Validation Layer

**In addition to Mongoose validation, we use Zod for request validation:**

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string()
      .min(8)
      .regex(/[A-Z]/, 'Need uppercase letter')
      .regex(/[0-9]/, 'Need number'),
    role: z.enum(['admin', 'seller', 'buyer']).default('buyer'),
  }),
});
```

**Why Two Layers?**
- **Zod**: Validates HTTP requests (before reaching database)
- **Mongoose**: Validates database operations (even if called internally)

---

## 🎯 Best Practices

### 1. Use Timestamps

**Always enable timestamps:**
```typescript
const schema = new Schema({...}, { timestamps: true });
```

**Benefits:**
- Auto-creates `createdAt` and `updatedAt`
- Useful for sorting, filtering, debugging

### 2. Select False for Sensitive Fields

```typescript
password: {
  type: String,
  select: false, // Never included in queries
}
```

**To include when needed:**
```typescript
const user = await User.findById(id).select('+password');
```

### 3. Use Lean Queries for Performance

**Regular Query** (returns Mongoose document):
```typescript
const users = await User.find(); // Mongoose documents (with methods)
```

**Lean Query** (returns plain JavaScript object):
```typescript
const users = await User.find().lean(); // Plain objects (faster, less memory)
```

**Use Lean When:**
- You don't need Mongoose document methods
- You're just reading data (not updating)
- Performance is critical

### 4. Avoid N+1 Query Problem

**❌ Bad (N+1 queries):**
```typescript
const products = await Product.find(); // 1 query

for (const product of products) {
  product.seller = await User.findById(product.seller); // N queries
}
```

**✅ Good (2 queries):**
```typescript
const products = await Product.find().populate('seller'); // 2 queries total
```

### 5. Use Projections

**Fetch only needed fields:**
```typescript
// Bad: Fetch all fields
const users = await User.find();

// Good: Fetch only name and email
const users = await User.find().select('name email');
```

### 6. Limit Results

**Always paginate:**
```typescript
const page = 1;
const limit = 20;

const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit);
```

### 7. Use Transactions for Multi-Document Operations

**Example: Transfer payment**
```typescript
import mongoose from 'mongoose';

const session = await mongoose.startSession();
session.startTransaction();

try {
  // Deduct from buyer
  await Payment.create([{ buyer: buyerId, amount: -100 }], { session });

  // Add to seller
  await Payment.create([{ seller: sellerId, amount: 100 }], { session });

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 8. Handle Soft Deletes

**Instead of deleting, mark as deleted:**
```typescript
// Bad: Hard delete
await User.findByIdAndDelete(id);

// Good: Soft delete
await User.findByIdAndUpdate(id, { status: 'deleted' });
```

**Filter out deleted in queries:**
```typescript
User.find({ status: { $ne: 'deleted' } });
```

### 9. Use Aggregation for Complex Queries

**Example: Group products by seller**
```typescript
const stats = await Product.aggregate([
  { $match: { status: 'active' } },
  {
    $group: {
      _id: '$seller',
      count: { $sum: 1 },
      avgPrice: { $avg: '$price' },
    },
  },
  { $sort: { count: -1 } },
  { $limit: 10 },
]);
```

### 10. Monitor Database Performance

**Use Mongoose plugin for logging:**
```typescript
const mongooseMetrics = require('./app/logging/mongooseMetrics');
// Auto-logs slow queries with execution time
```

**Check query performance:**
```typescript
const explain = await Model.find().explain('executionStats');
console.log(explain.executionStats.executionTimeMillis);
```

---

## 📊 Database Schema Diagram

```
┌─────────────────┐
│      User       │
│─────────────────│
│ _id: ObjectId   │◄──────────────┐
│ name: String    │               │
│ email: String   │               │
│ password: String│               │
│ role: Enum      │               │
│ status: Enum    │               │
│ avatar: String  │               │
└─────────────────┘               │
        △                         │
        │                         │
        │ seller                  │ participants (many)
        │                         │
┌───────┴─────────┐        ┌──────┴──────────┐
│    Product      │        │      Chat       │
│─────────────────│        │─────────────────│
│ _id: ObjectId   │        │ _id: ObjectId   │
│ title: String   │        │ participants: []│
│ price: Number   │        │ lastMessage: {} │
│ seller: ObjectId│        └─────────────────┘
│ category: Enum  │               △
│ images: []      │               │
│ status: Enum    │               │ chat
└─────────────────┘               │
        △                  ┌──────┴──────────┐
        │                  │    Message      │
        │ product          │─────────────────│
        │                  │ _id: ObjectId   │
┌───────┴─────────┐        │ chat: ObjectId  │
│    Payment      │        │ sender: ObjectId│
│─────────────────│        │ content: String │
│ _id: ObjectId   │        │ type: Enum      │
│ buyer: ObjectId │        │ readBy: []      │
│ seller: ObjectId│        └─────────────────┘
│ product: ObjectId│
│ amount: Number  │        ┌─────────────────┐
│ status: Enum    │        │  Notification   │
└─────────────────┘        │─────────────────│
                           │ _id: ObjectId   │
                           │ recipient: ObjId│
                           │ sender: ObjectId│
                           │ type: Enum      │
                           │ message: String │
                           │ isRead: Boolean │
                           └─────────────────┘
```

---

## 📝 Summary

**Key Takeaways:**

1. **Use References** for independent entities (User, Product, Chat)
2. **Use Embedding** for tightly coupled data (address, coordinates)
3. **Index Strategically**: Frequently queried fields, sort fields, unique fields
4. **Validate at Two Layers**: Zod (HTTP) + Mongoose (Database)
5. **Use Lean Queries** for read-only operations
6. **Always Paginate** large datasets
7. **Use Transactions** for multi-document updates
8. **Soft Delete** instead of hard delete
9. **Monitor Performance** with explain() and metrics
10. **Follow Naming Conventions**: Consistent schema structure

**Database Checklist:**

□ Schema designed with proper relationships
□ Indexes added for common queries
□ Validation rules defined (Mongoose + Zod)
□ Timestamps enabled
□ Sensitive fields marked `select: false`
□ Soft delete implemented
□ Query performance monitored

---

**Happy Database Designing! 🚀**
