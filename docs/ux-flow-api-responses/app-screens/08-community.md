# Screen 8: Community

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course Content](./05-course-content.md)

## UX Flow

### Feed Browse + Course Filter
1. Student Community page e dhoke
2. Page load e parallel call: feed → `GET /community/posts`, dropdown → `GET /courses/options`
3. Student dropdown theke course select kore → feed re-fetch: `GET /community/posts?courseId=COURSE_ID`
4. "All Courses" select korle courseId remove hoy → shob post dekhay
5. Scroll korle next page load hoy → `GET /community/posts?page=2`

### Create Post
1. Student "New Post" button e click kore
2. Title, content likhe, optionally course select kore dropdown theke, optionally image attach kore
3. Submit → `POST /community/posts` (multipart/form-data)
4. Success → feed e notun post dekhay

### View Post Detail + Replies
1. Student feed theke ekta post e tap kore
2. Post detail load hoy → `GET /community/posts/:id` (replies shoh ashe, max 200)
3. `hasMoreReplies: true` hole "Load more" dekhay

### Like / Unlike
1. Student post er like button e tap kore → `PATCH /community/posts/:id/like`
2. Response `{ liked: true }` hole heart fill, `{ liked: false }` hole heart empty
3. Frontend likesCount locally increment/decrement kore

### Reply to Post
1. Student reply box e content likhe submit kore → `POST /community/posts/:id/replies`
2. Arekta reply er reply korte chaile `parentReplyId` pathay (max 1 level nesting)
3. Success → reply list e notun reply dekhay

### My Posts
1. Student "My Posts" tab e tap kore
2. Nijer posts load hoy → `GET /community/posts/my-posts`
3. Same course filter + pagination support ache

### Edit Post
1. Student nijer post e "Edit" button e tap kore (author-only)
2. Title, content, course, image update kore → `PATCH /community/posts/:id` (multipart/form-data)
3. Image remove korte chaile `removeImage: "true"` pathay (notun image chara)
4. Course link remove korte chaile `courseId: "null"` pathay

### Edit Reply
1. Student nijer reply e "Edit" button e tap kore (author-only)
2. Content update kore → `PATCH /community/replies/:id`

### Delete Post / Reply
1. Student nijer post ba reply e "Delete" button e tap kore (author-only)
2. Confirmation dialog dekhay → confirm korle `DELETE /community/posts/:id` ba `DELETE /community/replies/:id`
3. Success → item list theke remove hoy

---

### 8.1 Create Post

```
POST /community/posts
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `title`: "Struggling with closures" (required)
- `courseId`: "COURSE_ID" (optional — link post to a course)
- `content`: "Can someone explain closures in JavaScript?..."
- `image`: (file, optional)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664k...",
    "title": "Struggling with closures",
    "course": "JavaScript Basics",
    "content": "Can someone explain closures in JavaScript?...",
    "image": "https://cdn.example.com/post-image.jpg",
    "createdAt": "2026-03-14T13:00:00Z"
  }
}
```

**Errors:**
- `400` — Course not found (invalid courseId)

---

### 8.2 Get Feed

```
GET /community/posts?page=1&limit=10&sort=-createdAt&courseId=COURSE_ID
Auth: Bearer {{accessToken}}
```

> `courseId` is optional. If provided, only posts linked to that course are returned. If omitted, all posts are returned.

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPage": 3 },
  "data": [
    {
      "_id": "664k...",
      "author": {
        "_id": "664a...",
        "name": "John Doe",
        "profilePicture": "https://cdn.example.com/avatar.jpg",
        "role": "STUDENT"
      },
      "title": "Struggling with closures",
      "course": "JavaScript Basics",
      "content": "Can someone explain closures in JavaScript?...",
      "image": "https://cdn.example.com/post-image.jpg",
      "likesCount": 5,
      "repliesCount": 2,

      "isLiked": false,
      "createdAt": "2026-03-14T13:00:00Z"
    }
  ]
}
```

---

### 8.3 Get Post by ID

```
GET /community/posts/:id
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664k...",
    "author": {
      "_id": "664a...",
      "name": "John Doe",
      "profilePicture": "https://cdn.example.com/avatar.jpg",
      "role": "STUDENT"
    },
    "title": "Struggling with closures",
    "course": "JavaScript Basics",
    "content": "Can someone explain closures in JavaScript?...",
    "image": "https://cdn.example.com/post-image.jpg",
    "likesCount": 5,
    "repliesCount": 2,
    "isLiked": true,
    "replies": [
      {
        "_id": "664l...",
        "author": {
          "_id": "664b...",
          "name": "Alice Student",
          "profilePicture": "https://cdn.example.com/alice.jpg",
          "role": "STUDENT"
        },
        "content": "I had the same question! Anyone?",
        "children": [],
        "createdAt": "2026-03-14T13:20:00Z"
      },
      {
        "_id": "664m...",
        "author": {
          "_id": "664c...",
          "name": "Admin Jane",
          "profilePicture": "https://cdn.example.com/jane.jpg",
          "role": "SUPER_ADMIN"
        },
        "content": "Great question! A closure is when a function remembers its outer scope...",
        "children": [
          {
            "_id": "664n...",
            "author": {
              "_id": "664a...",
              "name": "John Doe",
              "profilePicture": "https://cdn.example.com/avatar.jpg",
              "role": "STUDENT"
            },
            "content": "Thanks, that makes sense now!",
            "parentReply": "664m...",
            "createdAt": "2026-03-14T13:45:00Z"
          }
        ],
        "createdAt": "2026-03-14T13:30:00Z"
      }
    ],
    "hasMoreReplies": false,
    "createdAt": "2026-03-14T13:00:00Z"
  }
}
```

> `hasMoreReplies: true` means the post has more than 200 replies — frontend should show a "Load more" option or indicate there are additional replies.

---

### 8.4 Toggle Like

```
PATCH /community/posts/:id/like
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": { "liked": true }
}
```

---

### 8.5 Reply to Post

```
POST /community/posts/:id/replies
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

#### Example 1: Simple reply (post er directly under)

```json
// Request
{ "content": "Great post! Thanks for sharing." }

// Response (201)
{
  "success": true,
  "data": {
    "_id": "664l...",
    "content": "Great post! Thanks for sharing.",
    "parentReply": null,
    "createdAt": "2026-03-14T13:30:00Z"
  }
}
```

#### Example 2: Nested reply (reply er reply — 1 level only)

```json
// Request — parentReplyId = jeita reply er under e reply korte chao
{ "content": "I agree!", "parentReplyId": "664l..." }

// Response (201)
{
  "success": true,
  "data": {
    "_id": "664n...",
    "content": "I agree!",
    "parentReply": "664l...",
    "createdAt": "2026-03-14T13:45:00Z"
  }
}
```

> `parentReplyId` optional — na dile top-level reply hoy. Dile oi reply er under boshbe (max 1 level, nested reply er reply kora jay na).

**Errors:**
- `404` — Post not found / Parent reply not found
- `400` — Parent reply does not belong to this post
- `400` — Cannot reply to a nested reply (max 1 level)

---

### 8.6 Delete Post / Delete Reply

```
DELETE /community/posts/:id
DELETE /community/replies/:id
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

### 8.7 My Posts

```
GET /community/posts/my-posts?page=1&limit=10&sort=-createdAt&courseId=COURSE_ID
Auth: Bearer {{accessToken}}
```

> Returns only the authenticated user's posts. `courseId` is optional filter. Same response shape as Get Feed (8.2).

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
  "data": [
    {
      "_id": "664k...",
      "author": {
        "_id": "664a...",
        "name": "John Doe",
        "profilePicture": "https://cdn.example.com/avatar.jpg",
        "role": "STUDENT"
      },
      "title": "My first post",
      "course": "JavaScript Basics",
      "content": "Here's what I learned today...",
      "image": "https://cdn.example.com/post-image.jpg",
      "likesCount": 3,
      "repliesCount": 1,

      "isLiked": true,
      "createdAt": "2026-03-14T13:00:00Z"
    }
  ]
}
```

---

### 8.8 Edit Post

```
PATCH /community/posts/:id
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

> Author-only. At least one field required. Send `courseId: "null"` (string) to remove course link.

**Form Data (all optional):**
- `title`: "Updated title"
- `content`: "Updated content..."
- `courseId`: "COURSE_ID" or "null" (to remove)
- `image`: (file, replaces existing image)
- `removeImage`: "true" (removes existing image without replacing)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664k...",
    "title": "Updated title",
    "content": "Updated content...",
    "course": "JavaScript Basics",
    "image": "https://cdn.example.com/new-image.jpg",
    "updatedAt": "2026-03-14T14:00:00Z"
  }
}
```

**Errors:**
- `404` — Post not found
- `403` — Not the author
- `400` — Course not found (invalid courseId)

---

### 8.9 Edit Reply

```
PATCH /community/replies/:id
Content-Type: application/json
Auth: Bearer {{accessToken}}
```

**Request Body:**
```json
{ "content": "Updated reply content" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664l...",
    "content": "Updated reply content",
    "updatedAt": "2026-03-14T14:10:00Z"
  }
}
```

**Errors:**
- `404` — Reply not found
- `403` — Not the author

---

### 8.10 Get Post Replies (Paginated)

```
GET /community/posts/:id/replies?page=1&limit=20&sort=-createdAt
Auth: Bearer {{accessToken}}
```

> Paginated top-level replies with their children. Use for "Load more" when `hasMoreReplies: true` in 8.3.

**Response:**
```json
{
  "success": true,
  "message": "Replies retrieved successfully",
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPage": 3 },
  "data": [
    {
      "_id": "664l...",
      "author": {
        "_id": "664b...",
        "name": "Alice Student",
        "profilePicture": "https://cdn.example.com/alice.jpg",
        "role": "STUDENT"
      },
      "content": "I had the same question! Anyone?",
      "children": [],
      "createdAt": "2026-03-14T13:20:00Z"
    },
    {
      "_id": "664m...",
      "author": {
        "_id": "664c...",
        "name": "Admin Jane",
        "profilePicture": "https://cdn.example.com/jane.jpg",
        "role": "SUPER_ADMIN"
      },
      "content": "A closure is when a function remembers its outer scope...",
      "children": [
        {
          "_id": "664n...",
          "author": { "_id": "664a...", "name": "John Doe", "profilePicture": "...", "role": "STUDENT" },
          "content": "Thanks, that makes sense now!",
          "parentReply": "664m...",
          "createdAt": "2026-03-14T13:45:00Z"
        }
      ],
      "createdAt": "2026-03-14T13:30:00Z"
    }
  ]
}
```

> Pagination top-level replies er upor kaje kore. Children batch fetch hoy per page — separate pagination nai. Default sort: `createdAt ASC` (oldest first).

---

### 8.11 Course Options (Filter Dropdown)

```
GET /courses/options
Auth: Bearer {{accessToken}}
```

> Lightweight endpoint for populating course filter dropdown. Returns only published courses with `_id` + `title`, alphabetically sorted. Both STUDENT and SUPER_ADMIN can access.

**Response:**
```json
{
  "success": true,
  "data": [
    { "_id": "664a...", "title": "JavaScript Basics" },
    { "_id": "664b...", "title": "React Advanced" }
  ]
}
```

---

### Audit Log

#### Round 1 — Edge Case Audit (2026-03-15) — All Fixed

**1. Response Bloat (POST, REPLY queries)**
- **Problem:** Post response e `updatedAt`, `__v` ashto, reply response e `post`, `updatedAt`, `__v` ashto — frontend er jonno ei fields unnecessary, response size baraye
- **Fix:** Shob post + reply query te `.select()` add kora hoise — shudhu dorkar fields return hoy. Post: `_id title content course image likesCount repliesCount createdAt`. Reply: `_id author content parentReply createdAt`

**2. Image-only Post Update Zod e Reject Hoto**
- **Problem:** Edit Post e shudhu image dile (title/content chara) Zod er `.refine()` reject korto — "At least one field must be provided" error ashto, karon `image` field schema te chilo na
- **Fix:** updatePost Zod schema te `image: z.string().optional()` add kora hoise — ekhon shudhu image diyeo update kora jay

**3. CourseId Existence Validate Hoto Na**
- **Problem:** Create/Update post e user jodi invalid courseId dey (DB te exist kore na), kono error hoto na — post save hoye jeto non-existent course reference niye
- **Fix:** `validateCourseId()` helper banano hoise — Course collection e findById kore check kore, na thakle 400 "Course not found" error throw kore. `createPost` + `updatePost` duita e call hoy

**4. toggleLike Race Condition (Double-Click e 500 Error)**
- **Problem:** User fast double-click korle 2 ta concurrent request ashto → 2 ta PostLike create hoto → duplicate key error 500 response
- **Fix:** Atomic approach — unlike er jonno `findOneAndDelete` (ekbar e check + delete), like er jonno `try-catch` diye duplicate key (error code 11000) catch kora hoy. Double-click e crash hoy na, silently `{ liked: true }` return kore

**5. Deleted User er Posts Feed e Dekhay + Null Author Crash**
- **Problem:** User account delete hoye gele (status: DELETE), tar posts feed e theke jeto — author populate korle crash/null error ashto
- **Fix:** Populate e `match: { status: { $ne: 'DELETE' } }` add kora hoise — deleted user er author null ashe. List endpoints e (getAllPosts, getMyPosts) null-author posts filter out hoy. Single post view te null thakle frontend "Deleted User" dekhabe

---

#### Round 2 — QA Tester Audit (2026-03-15) — All Fixed

**QA-1 [HIGH]: Whitespace-only Title/Content Zod e Pass Hoto**
- **Problem:** User jodi shudhu spaces dey (e.g. `"   "`) — Zod e `z.string().min(1)` pass korto karon length 3. Tar por Mongoose `trim` kore empty string banaye deto → `required` field error ashto 500 status code diye (proper 400 na). Update e `findByIdAndUpdate` Mongoose validators skip kore — tai empty title DB te store hoye jeto
- **Fix:** Shob Zod schema te (createPost, createReply, updatePost, updateReply) string fields e `.trim()` add kora hoise `.min(1)` er age. Ekhon `"   "` → trim → `""` → `.min(1)` fail → proper 400 validation error return kore
- **Affected:** 8.1 Create Post, 8.5 Reply, 8.8 Edit Post, 8.9 Edit Reply

**QA-2 [HIGH]: Post Detail e Replies Paginate Hoto Na**
- **Problem:** `getPostById` e `PostReply.find({ post: id })` call e kono `.limit()` chilo na — post e 1000+ reply thakle shob ekbare fetch hoto. Response huge, query slow, memory usage high
- **Fix:** `REPLY_LIMIT = 200` constant add kora hoise + `.limit(REPLY_LIMIT)` query te. Response e `hasMoreReplies: true/false` flag add kora hoise — frontend e eta diye "Load more" button dekhate parbe. `hasMoreReplies` calculate hoy: `post.repliesCount > REPLY_LIMIT`
- **Affected:** 8.3 Get Post by ID

**QA-3 [MEDIUM]: Validation Fail Korle Uploaded Image Orphan Hoye Jay**
- **Problem:** `fileHandler` middleware age run kore → S3/Cloudinary te image upload kore → Zod validation middleware pore run kore. Validation fail korle (e.g. title missing) error throw hoy, kintu uploaded image storage e theke jay forever — delete korar kono mechanism chilo na
- **Fix:** 2 jaygay change — (1) `fileHandler.ts` e upload korar por shob URL track kore: `req._uploadedFileUrls = [url1, url2, ...]`. (2) `globalErrorHandler.ts` e ANY error ashle check kore `_uploadedFileUrls` ache kina — thakle shob file delete kore dey. Ekhon validation fail korleo orphaned files thake na
- **Affected:** 8.1 Create Post, 8.8 Edit Post (jekhane image upload ache)

**QA-4 [LOW]: repliesCount Negative Hoye Jete Pare**
- **Problem:** Data inconsistency thakle (e.g. repliesCount 0 but actual replies ache, ba manual DB edit), reply delete korle `$inc: { repliesCount: -deleteCount }` count ke negative banaye dey. Frontend e "-1 replies" dekhay
- **Fix:** Conditional filter add kora hoise update query te: `{ _id: reply.post, repliesCount: { $gte: deleteCount } }` — mane MongoDB update taholei run korbe jokhon repliesCount >= deleteCount. Count 0 hole ba insufficient hole update skip hoy, negative hoy na
- **Affected:** 8.6 Delete Reply

**QA-5 [LOW]: Post theke Image Remove Korar Kono Way Chilo Na**
- **Problem:** Edit Post e image replace kora jeto (notun file upload), course remove kora jeto (`courseId: "null"`), kintu existing image just delete korar (replace chara) kono mechanism chilo na — user image niye stuck thakto
- **Fix:** `removeImage: "true"` form-data field add kora hoise. Validation e `z.union([z.literal('true'), z.literal('false')]).transform(v => v === 'true')`. Service e logic: `removeImage === true && new image nai` hole purano file storage theke delete + `$unset: { image: 1 }` diye DB theke field remove. New image dile removeImage ignore hoy
- **Affected:** 8.8 Edit Post

---

#### Round 3 — Staff Engineer Audit (2026-03-29)

**1. [P1] Pagination count mismatch — deleted user filter applied AFTER pagination**
- **Problem:** `getAllPosts` e deleted-user posts filter hoto pagination calculate howar POR. 10 item per page e 3 ta deleted-user post filter out hole 7 ta item dekhay but pagination bole `total: 25`. Empty pages o possible
- **Fix:** Pre-filter approach — deleted user IDs query diye `baseFilter.author = { $nin: deletedUserIds }` add kora hoise QueryBuilder er age. Pagination ekhon accurate. Post-filter remove kora hoise
- **Affected:** 8.2 Get Feed

**2. [P1] `hasMoreReplies: true` but no paginated replies endpoint**
- **Problem:** `getPostById` e `hasMoreReplies` flag chilo but 200+ replies load korar kono API chilo na — "Load more" button dead
- **Fix:** `GET /community/posts/:id/replies?page=1&limit=20` endpoint add kora hoise. Top-level replies paginate hoy, children batch fetch hoy per page. Nested tree structure same as 8.3
- **Affected:** New endpoint 8.10

**3. [P2] `likesCount` / `repliesCount` counter drift**
- **Problem:** `PostLike.create()` ar `Post.$inc({ likesCount: 1 })` — 2 ta separate operation. First succeed kore second fail korle count drift hoy. Same for replies
- **Fix:** `$inc` replace kora hoise `countDocuments` diye — source of truth (PostLike/PostReply collection) theke fresh count set hoy. Self-healing — previous drift o correct hoy
- **Affected:** 8.4 Toggle Like, 8.5 Reply, 8.6 Delete Reply

**4. [P2] Edit response e `updatedAt` missing**
- **Problem:** Post/reply edit korle response e `updatedAt` chilo na — client "edited" indicator dekhate parto na
- **Fix:** `updatePost` select e `updatedAt` add, `updateReply` select e `updatedAt` add
- **Affected:** 8.8 Edit Post, 8.9 Edit Reply
