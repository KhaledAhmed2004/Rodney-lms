# Screen 7: Discussion

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md)

## UX Flow

### Post List + Search + Course Filter
1. Admin Discussion page e dhoke
2. Page load e parallel call: posts → `GET /community/posts`, dropdown → `GET /courses/options`
3. Admin search box e type kore → `GET /community/posts?searchTerm=closures`
4. Admin dropdown theke course select kore → `GET /community/posts?courseId=COURSE_ID`
5. Search + filter combine hoy → `GET /community/posts?searchTerm=closures&courseId=COURSE_ID`
6. Clear korle shob post dekhay

### View Post Detail
1. Admin post list theke ekta post e click kore
2. Post detail + replies load hoy → `GET /community/posts/:id`
3. Admin badge dekhay jokhon `author.role === "SUPER_ADMIN"`

### Reply to Post (Admin Response)
1. Admin post detail e reply box e content likhe → `POST /community/posts/:id/replies`
2. Nested reply korte chaile `parentReplyId` pathay (max 1 level)
3. Success → reply list e admin reply dekhay (with admin badge)

### Moderate — Delete Post / Reply
1. Admin kono post ba reply delete korte chaile "Delete" button e click kore
2. Confirmation dialog → confirm korle `DELETE /community/posts/:id` ba `DELETE /community/replies/:id`
3. Success → item list theke remove hoy

---

### 7.1 Get All Posts

```
GET /community/posts?page=1&limit=10&sort=-createdAt&searchTerm=closures&courseId=COURSE_ID
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same response shape as [App Community Feed](../app-screens/08-community.md#82-get-feed)

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

### 7.2 Get Post by ID

```
GET /community/posts/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same endpoint as [App Get Post by ID](../app-screens/08-community.md#83-get-post-by-id). Returns post with nested replies.

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
    "isLiked": false,
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

> `hasMoreReplies: true` means the post has more than 200 replies.

> Frontend can check `author.role === "SUPER_ADMIN"` to show an "Admin" badge on posts and replies.

---

### 7.3 Reply to Post

```
POST /community/posts/:id/replies
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Same endpoint as [App Reply to Post](../app-screens/08-community.md#85-reply-to-post). Admin can reply directly or nested (1 level max).

**Request:**
```json
{ "content": "Great question! Here's how closures work..." }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664l...",
    "content": "Great question! Here's how closures work...",
    "parentReply": null,
    "createdAt": "2026-03-14T14:00:00Z"
  }
}
```

**Errors:**
- `404` — Post not found / Parent reply not found
- `400` — Parent reply does not belong to this post
- `400` — Cannot reply to a nested reply (max 1 level)

---

### 7.4 Delete Post / Delete Reply

```
DELETE /community/posts/:id
DELETE /community/replies/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{ "success": true, "message": "Post/Reply deleted successfully" }
```

---

### 7.5 Course Options (Filter Dropdown)

```
GET /courses/options
Auth: Bearer {{accessToken}} (STUDENT / SUPER_ADMIN)
```

> Same endpoint as [App Community Course Options](../app-screens/08-community.md#810-course-options-filter-dropdown). Lightweight — returns published courses with `_id` + `title` for filter dropdown.

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

> Dashboard Discussion ar App Community same endpoints use kore. Full detailed Banglish explanation: [App Community Audit Log](../app-screens/08-community.md#audit-log)

**Round 1 — Edge Case Audit (2026-03-15) — 5/5 Fixed**
1. Response bloat fix — unnecessary fields (updatedAt, __v) remove kora hoise `.select()` diye
2. Image-only update Zod e reject hoto — `image` field schema te add kora hoise
3. Invalid courseId dile kono error hoto na — ekhon `validateCourseId()` diye 400 error ashe
4. toggleLike e double-click korle 500 error ashto — atomic `findOneAndDelete` + duplicate key catch diye fix
5. Deleted user er posts feed e dekhato + crash korto — populate `match` + null-author filter add kora hoise

**Round 2 — QA Tester Audit (2026-03-15) — 5/5 Fixed**
1. **[HIGH]** Whitespace-only input (e.g. `"   "`) Zod e pass korto — `.trim()` add kora hoise shob schema te
2. **[HIGH]** Replies paginate hoto na (1000+ reply ekbare fetch) — `REPLY_LIMIT = 200` + `hasMoreReplies` flag add
3. **[MEDIUM]** Validation fail korle uploaded image orphan hoto — `fileHandler` URL track kore + `globalErrorHandler` cleanup kore
4. **[LOW]** repliesCount negative hoye jeto — conditional `{ $gte: deleteCount }` guard add
5. **[LOW]** Image remove korar way chilo na — `removeImage: "true"` form-data field add kora hoise
