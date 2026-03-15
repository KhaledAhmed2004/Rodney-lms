# Screen 11: Chat

> **Section**: App APIs (Student-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Community](./08-community.md)

---

### 11.1 Create Chat

```
POST /chats/:otherUserId
Auth: Bearer {{accessToken}}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664p...",
    "participants": ["664a...", "664m..."],
    "lastMessage": null,
    "createdAt": "2026-03-14T15:00:00Z"
  }
}
```

---

### 11.2 Get My Chats

```
GET /chats
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664p...",
      "participants": [
        {
          "_id": "664m...",
          "name": "Jane Smith",
          "profilePicture": "https://cdn.example.com/jane.jpg"
        }
      ],
      "lastMessage": {
        "text": "Hello! How are you?",
        "sender": "664a...",
        "createdAt": "2026-03-14T15:10:00Z"
      },
      "unreadCount": 2,
      "createdAt": "2026-03-14T15:00:00Z"
    }
  ]
}
```

---

### 11.3 Send Message

```
POST /messages
Content-Type: multipart/form-data
Auth: Bearer {{accessToken}}
```

**Form Data:**
- `chatId`: "CHAT_ID"
- `text`: "Hello! How are you?"
- `image`: (file, optional, up to 5)
- `media`: (file, optional, up to 3)
- `doc`: (file, optional, up to 5)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664q...",
    "chatId": "664p...",
    "sender": "664a...",
    "text": "Hello! How are you?",
    "image": [],
    "media": [],
    "doc": [],
    "createdAt": "2026-03-14T15:10:00Z"
  }
}
```

---

### 11.4 Get Messages

```
GET /messages/:chatId?page=1&limit=50
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 50, "total": 25, "totalPage": 1 },
  "data": [
    {
      "_id": "664q...",
      "chatId": "664p...",
      "sender": {
        "_id": "664a...",
        "name": "John Doe",
        "profilePicture": "https://cdn.example.com/avatar.jpg"
      },
      "text": "Hello! How are you?",
      "image": [],
      "media": [],
      "doc": [],
      "createdAt": "2026-03-14T15:10:00Z"
    }
  ]
}
```

---

### 11.5 Mark Chat as Read

```
POST /messages/chat/:chatId/read
Auth: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat marked as read"
}
```

---

### 11.6 Get Public User Details

```
GET /users/:id/user
Auth: None
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "664m...",
    "name": "Jane Smith",
    "profilePicture": "https://cdn.example.com/jane.jpg",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

---

---
