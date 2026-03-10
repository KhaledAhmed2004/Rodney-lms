# Real-Time Socket.IO Documentation

**Project:** Enterprise Backend Template
**Real-Time Engine:** Socket.IO v4+
**Last Updated:** 2025-11-25

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Socket.IO Architecture](#socketio-architecture)
3. [Connection Flow](#connection-flow)
4. [Authentication](#authentication)
5. [Room Management](#room-management)
6. [Chat System](#chat-system)
7. [Presence Tracking](#presence-tracking)
8. [Typing Indicators](#typing-indicators)
9. [Notifications](#notifications)
10. [Best Practices](#best-practices)

---

## 🎯 Overview

This application uses **Socket.IO** for real-time bidirectional communication between clients and server. Socket.IO enables:

- **Real-time chat**: Instant messaging between users
- **Presence tracking**: Online/offline status updates
- **Typing indicators**: "User is typing..." notifications
- **Live notifications**: Push notifications to connected users
- **Room-based messaging**: Private chats and group conversations

### Real-Time Stack

- **Library**: Socket.IO 4.0+
- **Protocol**: WebSocket (with fallback to polling)
- **Authentication**: JWT tokens
- **Transport**: WebSocket → Long Polling (fallback)
- **Namespace**: `/` (default namespace)

---

## 🏗️ Socket.IO Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                  Client Applications                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Web App    │  │  Mobile App  │  │   Desktop    │ │
│  │ (Browser)    │  │   (React     │  │   (Electron) │ │
│  │              │  │    Native)   │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │    WebSocket / HTTP Long Polling    │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Socket.IO Server (Express)                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Connection Manager                        │ │
│  │  • Authentication (JWT)                           │ │
│  │  • Connection tracking (Map<userId, socketId>)    │ │
│  │  • Room management                                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Event Handlers                            │ │
│  │  • join-room / leave-room                         │ │
│  │  • send-message                                   │ │
│  │  • typing / stop-typing                           │ │
│  │  • disconnect                                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Emitters (from HTTP controllers)          │ │
│  │  • new-message (after saving to DB)               │ │
│  │  • new-notification                               │ │
│  │  • user-online / user-offline                     │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐         │
│  │   Chat   │  │ Message  │  │ Notification │         │
│  │  Model   │  │  Model   │  │    Model     │         │
│  └──────────┘  └──────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Socket.IO Files

```
src/
├── server.ts                          # Socket.IO initialization
├── helpers/
│   └── socketHelper.ts                # Socket.IO setup & utilities
├── app/helpers/
│   ├── presenceHelper.ts              # Online/offline tracking
│   └── unreadHelper.ts                # Unread message counts
└── app/modules/
    ├── chat/
    │   ├── chat.controller.ts         # HTTP + Socket.IO emit
    │   └── chat.service.ts
    └── message/
        ├── message.controller.ts      # HTTP + Socket.IO emit
        └── message.service.ts
```

---

## 🔌 Connection Flow

### Client Connection Process

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ 1. Connect to Socket.IO server
       │    socket = io('http://localhost:5000', {
       │      auth: { token: 'JWT_TOKEN' }
       │    })
       ▼
┌────────────────────┐
│  Socket.IO Server  │ 2. Middleware: Authenticate
│  Authentication    │    - Extract token from auth
└──────┬─────────────┘    - Verify JWT
       │                  - Find user in DB
       │ Valid token?
       ├─ No ──► Reject connection (disconnect)
       │
       └─ Yes
       │
       ▼
┌────────────────────┐
│  Connection Event  │ 3. Emit 'connection' event
│  Handler           │    - socket.on('connection', ...)
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Join Personal     │ 4. Join user's personal room
│  Room              │    - socket.join(`user:${userId}`)
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Join Chat Rooms   │ 5. Auto-join all user's chats
│                    │    - Chat.find({ participants: userId })
└──────┬─────────────┘    - socket.join(chatId) for each
       │
       ▼
┌────────────────────┐
│  Track Connection  │ 6. Store socket mapping
│                    │    - connectedUsers.set(userId, socketId)
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Emit Online       │ 7. Notify others user is online
│  Status            │    - io.emit('user-online', { userId })
└──────┬─────────────┘
       │
       ▼
┌────────────┐
│   Client   │ 8. Connection established
└────────────┘    - Listen for events
                  - Can send/receive messages
```

### Code Implementation

**Server Initialization**: `src/server.ts`

```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config from './config';
import { initializeSocket } from './helpers/socketHelper';

const server: HTTPServer = app.listen(config.port, () => {
  console.log(`✅ Server running on port ${config.port}`);
});

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.frontend_url,
    credentials: true,
  },
  pingTimeout: 60000, // 60 seconds
});

initializeSocket(io);
```

**Socket Helper**: `src/helpers/socketHelper.ts`

```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../app/modules/user/user.model';
import { Chat } from '../app/modules/chat/chat.model';
import { trackUserOnline, trackUserOffline } from '../app/helpers/presenceHelper';

let io: SocketIOServer;

// Connected users map: userId -> socketId
const connectedUsers = new Map<string, string>();

export const initializeSocket = (socketServer: SocketIOServer) => {
  io = socketServer;

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, config.jwt_secret as string) as any;

      // Find user
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.data.user = user;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    console.log(`✅ User connected: ${user.name} (${socket.id})`);

    // 1. Join personal room
    socket.join(`user:${userId}`);

    // 2. Join all user's chats
    const userChats = await Chat.find({ participants: userId });
    userChats.forEach((chat) => {
      socket.join(chat._id.toString());
    });

    // 3. Track connection
    connectedUsers.set(userId, socket.id);

    // 4. Notify others user is online
    await trackUserOnline(userId, io);

    // Event handlers
    socket.on('join-room', (data) => handleJoinRoom(socket, data));
    socket.on('leave-room', (data) => handleLeaveRoom(socket, data));
    socket.on('send-message', (data) => handleSendMessage(socket, data));
    socket.on('typing', (data) => handleTyping(socket, data));
    socket.on('stop-typing', (data) => handleStopTyping(socket, data));

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${user.name}`);
      connectedUsers.delete(userId);
      await trackUserOffline(userId, io);
    });
  });
};

// Get Socket.IO instance (for use in controllers)
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Get socket ID for a user
export const getSocketId = (userId: string): string | undefined => {
  return connectedUsers.get(userId);
};

// Check if user is online
export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};
```

---

## 🔐 Authentication

### JWT-Based Authentication

**Client Side** (JavaScript/React):
```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('accessToken'); // Or from cookies

const socket = io('http://localhost:5000', {
  auth: {
    token: token,
  },
});

// Listen for connection errors
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Redirect to login
});
```

**Server Side** (Middleware):
```typescript
io.use(async (socket: Socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, config.jwt_secret as string) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.data.user = user; // Attach to socket
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

### Access User in Event Handlers

```typescript
socket.on('send-message', (data) => {
  const user = socket.data.user; // Authenticated user
  const userId = user._id.toString();

  // Use user data
  console.log(`Message from: ${user.name}`);
});
```

---

## 🏠 Room Management

### What are Rooms?

**Rooms** are arbitrary channels that sockets can join and leave. They're used for:
- **Private chats**: Each chat has its own room
- **Personal notifications**: Each user has a personal room (`user:${userId}`)
- **Broadcasting**: Send messages to specific groups

### Personal Room Pattern

**Every user joins their personal room on connection:**
```typescript
socket.join(`user:${userId}`);
```

**Send notification to specific user:**
```typescript
io.to(`user:${userId}`).emit('new-notification', {
  title: 'New Message',
  message: 'You have a new message from John',
});
```

### Chat Room Pattern

**Join a chat room:**
```typescript
socket.on('join-room', async (data: { chatId: string }) => {
  const { chatId } = data;
  const userId = socket.data.user._id.toString();

  // Verify user is participant
  const chat = await Chat.findOne({
    _id: chatId,
    participants: userId,
  });

  if (!chat) {
    socket.emit('error', { message: 'Not authorized to join this chat' });
    return;
  }

  // Join room
  socket.join(chatId);

  console.log(`User ${userId} joined chat ${chatId}`);

  // Notify user
  socket.emit('joined-room', { chatId });
});
```

**Leave a chat room:**
```typescript
socket.on('leave-room', (data: { chatId: string }) => {
  const { chatId } = data;

  socket.leave(chatId);

  console.log(`User left chat ${chatId}`);

  socket.emit('left-room', { chatId });
});
```

**Send message to chat room:**
```typescript
io.to(chatId).emit('new-message', {
  messageId: message._id,
  chatId: message.chat,
  sender: message.sender,
  content: message.content,
  createdAt: message.createdAt,
});
```

---

## 💬 Chat System

### Message Flow

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ 1. User types message
       │    socket.emit('send-message', {
       │      chatId, content, type
       │    })
       ▼
┌────────────────────┐
│  Socket.IO Server  │ 2. Receive 'send-message' event
│  Event Handler     │    - Extract chatId, content, type
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Message Service   │ 3. Save to database
│ .sendMessage()     │    - Create Message document
└──────┬─────────────┘    - Update Chat.lastMessage
       │
       ▼
┌────────────────────┐
│  Socket.IO Emit    │ 4. Broadcast to chat room
│  io.to(chatId)     │    - Emit 'new-message' event
└──────┬─────────────┘
       │
       ▼
┌────────────┐
│   Clients  │ 5. All clients in chat receive message
└────────────┘    - Display in UI
                  - Play sound notification
```

### Code Implementation

**Client Sending Message**:
```javascript
// Send message
socket.emit('send-message', {
  chatId: '507f1f77bcf86cd799439011',
  content: 'Hello!',
  type: 'text',
});

// Listen for new messages
socket.on('new-message', (data) => {
  console.log('New message:', data);
  // Update UI
  addMessageToChat(data);
});
```

**Server Event Handler** (in `socketHelper.ts`):
```typescript
const handleSendMessage = async (socket: Socket, data: any) => {
  const { chatId, content, type } = data;
  const userId = socket.data.user._id.toString();

  try {
    // 1. Verify user is in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    // 2. Create message (via service or directly)
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content,
      type: type || 'text',
    });

    // 3. Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        content,
        sender: userId,
        createdAt: new Date(),
      },
    });

    // 4. Broadcast to chat room
    io.to(chatId).emit('new-message', {
      _id: message._id,
      chat: message.chat,
      sender: {
        _id: socket.data.user._id,
        name: socket.data.user.name,
        avatar: socket.data.user.avatar,
      },
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
    });

    // 5. Send notification to offline users
    const participants = chat.participants
      .map((p) => p.toString())
      .filter((p) => p !== userId);

    participants.forEach((participantId) => {
      if (!isUserOnline(participantId)) {
        // Create push notification (via notification service)
        // sendPushNotification(participantId, 'New message', content);
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
};
```

**HTTP Controller with Socket.IO** (alternative approach):
```typescript
// In message.controller.ts
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.sendMessage(req.body);

  // Emit via Socket.IO
  const io = getIO();
  io.to(result.chat.toString()).emit('new-message', result);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Message sent',
    data: result,
  });
});
```

---

## 👥 Presence Tracking

### Online/Offline Status

**Presence Helper**: `src/app/helpers/presenceHelper.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { User } from '../modules/user/user.model';
import { USER_STATUS } from '../modules/user/user.interface';

// Track user coming online
export const trackUserOnline = async (userId: string, io: SocketIOServer) => {
  // Update user's lastSeen
  await User.findByIdAndUpdate(userId, {
    lastSeen: new Date(),
    isOnline: true,
  });

  // Notify all connected users
  io.emit('user-online', {
    userId,
    timestamp: new Date(),
  });
};

// Track user going offline
export const trackUserOffline = async (userId: string, io: SocketIOServer) => {
  // Update user's lastSeen
  await User.findByIdAndUpdate(userId, {
    lastSeen: new Date(),
    isOnline: false,
  });

  // Notify all connected users
  io.emit('user-offline', {
    userId,
    timestamp: new Date(),
  });
};

// Get online users in a chat
export const getOnlineUsersInChat = async (chatId: string): Promise<string[]> => {
  const chat = await Chat.findById(chatId).populate('participants', '_id isOnline');

  if (!chat) {
    return [];
  }

  return chat.participants
    .filter((user: any) => user.isOnline)
    .map((user: any) => user._id.toString());
};
```

**Client Listening**:
```javascript
socket.on('user-online', (data) => {
  console.log(`User ${data.userId} is now online`);
  // Update UI: Show green dot
  updateUserStatus(data.userId, 'online');
});

socket.on('user-offline', (data) => {
  console.log(`User ${data.userId} went offline`);
  // Update UI: Show gray dot
  updateUserStatus(data.userId, 'offline');
});
```

### User Model Schema Update

**Add presence fields**:
```typescript
const userSchema = new Schema({
  // ... other fields
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
});
```

---

## ⌨️ Typing Indicators

### Typing Flow

```
User A starts typing
      │
      ▼
socket.emit('typing', { chatId })
      │
      ▼
Server receives event
      │
      ▼
io.to(chatId).emit('user-typing', { userId, chatId })
      │
      ▼
User B receives event
      │
      ▼
Display "User A is typing..."
      │
      │ (after 3 seconds or user stops)
      ▼
socket.emit('stop-typing', { chatId })
      │
      ▼
Hide typing indicator
```

### Code Implementation

**Client Side**:
```javascript
let typingTimeout;

// User starts typing
inputField.addEventListener('input', () => {
  socket.emit('typing', { chatId: currentChatId });

  // Auto-stop after 3 seconds
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop-typing', { chatId: currentChatId });
  }, 3000);
});

// User stops typing
inputField.addEventListener('blur', () => {
  socket.emit('stop-typing', { chatId: currentChatId });
  clearTimeout(typingTimeout);
});

// Listen for typing events
socket.on('user-typing', (data) => {
  if (data.chatId === currentChatId && data.userId !== myUserId) {
    showTypingIndicator(data.userName);
  }
});

socket.on('user-stopped-typing', (data) => {
  if (data.chatId === currentChatId) {
    hideTypingIndicator(data.userId);
  }
});
```

**Server Side**:
```typescript
// Typing handler
const handleTyping = (socket: Socket, data: { chatId: string }) => {
  const { chatId } = data;
  const userId = socket.data.user._id.toString();
  const userName = socket.data.user.name;

  // Broadcast to others in chat (not sender)
  socket.to(chatId).emit('user-typing', {
    userId,
    userName,
    chatId,
  });
};

// Stop typing handler
const handleStopTyping = (socket: Socket, data: { chatId: string }) => {
  const { chatId } = data;
  const userId = socket.data.user._id.toString();

  socket.to(chatId).emit('user-stopped-typing', {
    userId,
    chatId,
  });
};
```

**With Throttling** (prevent spam):
```typescript
import { throttle } from 'lodash';

// Throttle typing events (max once per second)
const handleTyping = throttle(
  (socket: Socket, data: { chatId: string }) => {
    const { chatId } = data;
    const userId = socket.data.user._id.toString();

    socket.to(chatId).emit('user-typing', { userId, chatId });
  },
  1000, // 1 second
  { leading: true, trailing: false }
);
```

---

## 🔔 Notifications

### Push Notifications via Socket.IO

**Send to specific user**:
```typescript
const sendNotificationToUser = (userId: string, notification: any) => {
  const io = getIO();

  io.to(`user:${userId}`).emit('new-notification', {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    createdAt: notification.createdAt,
  });
};
```

**Usage in controllers**:
```typescript
// In payment.controller.ts
const createPayment = catchAsync(async (req: Request, res: Response) => {
  const payment = await PaymentService.createPayment(req.body);

  // Notify seller
  await NotificationService.create({
    recipient: payment.seller,
    type: 'payment',
    title: 'New Payment',
    message: `You received $${payment.amount / 100} from ${payment.buyer.name}`,
    data: { paymentId: payment._id },
  });

  // Send real-time notification
  sendNotificationToUser(payment.seller.toString(), {
    type: 'payment',
    title: 'New Payment',
    message: `You received $${payment.amount / 100}`,
  });

  sendResponse(res, { success: true, statusCode: 201, data: payment });
});
```

**Client Side**:
```javascript
socket.on('new-notification', (notification) => {
  // Show browser notification
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icon.png',
    });
  }

  // Show in-app notification
  showToast(notification.title, notification.message);

  // Update notification badge
  incrementNotificationCount();
});
```

---

## ✅ Best Practices

### 1. Always Authenticate Connections

**✅ DO:**
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const user = await verifyToken(token);
  socket.data.user = user;
  next();
});
```

**❌ DON'T:**
```typescript
io.on('connection', (socket) => {
  // No authentication - anyone can connect!
});
```

### 2. Validate Event Data

**✅ DO:**
```typescript
socket.on('send-message', async (data) => {
  if (!data.chatId || !data.content) {
    socket.emit('error', { message: 'Invalid data' });
    return;
  }

  // Verify user is in chat
  const chat = await Chat.findOne({
    _id: data.chatId,
    participants: userId,
  });

  if (!chat) {
    socket.emit('error', { message: 'Unauthorized' });
    return;
  }

  // Process message
});
```

**❌ DON'T:**
```typescript
socket.on('send-message', async (data) => {
  // No validation - trust client data
  await Message.create(data);
});
```

### 3. Use Rooms for Targeted Broadcasting

**✅ DO:**
```typescript
io.to(chatId).emit('new-message', message); // Only chat participants
```

**❌ DON'T:**
```typescript
io.emit('new-message', message); // All connected clients (bad!)
```

### 4. Handle Disconnections Gracefully

**✅ DO:**
```typescript
socket.on('disconnect', async () => {
  connectedUsers.delete(userId);
  await trackUserOffline(userId, io);

  // Clean up any temporary data
  // Release resources
});
```

### 5. Throttle High-Frequency Events

**✅ DO:**
```typescript
import { throttle } from 'lodash';

const handleTyping = throttle(
  (socket, data) => { /* ... */ },
  1000 // Max once per second
);
```

### 6. Error Handling

**✅ DO:**
```typescript
socket.on('send-message', async (data) => {
  try {
    const message = await saveMessage(data);
    io.to(data.chatId).emit('new-message', message);
  } catch (error) {
    console.error('Message error:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
});
```

### 7. Use Acknowledgements for Critical Events

**Server:**
```typescript
socket.on('send-message', async (data, callback) => {
  try {
    const message = await saveMessage(data);
    io.to(data.chatId).emit('new-message', message);

    // Acknowledge success
    callback({ success: true, messageId: message._id });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

**Client:**
```javascript
socket.emit('send-message', { chatId, content }, (response) => {
  if (response.success) {
    console.log('Message sent:', response.messageId);
  } else {
    console.error('Failed:', response.error);
    // Retry or show error
  }
});
```

### 8. Namespace Organization

**For large apps, use namespaces:**
```typescript
const chatNamespace = io.of('/chat');
const notificationNamespace = io.of('/notifications');

chatNamespace.on('connection', (socket) => {
  // Chat-specific events
});

notificationNamespace.on('connection', (socket) => {
  // Notification-specific events
});
```

### 9. Monitor Connection Health

**Ping/Pong:**
```typescript
io.on('connection', (socket) => {
  const interval = setInterval(() => {
    socket.emit('ping');
  }, 25000); // Every 25 seconds

  socket.on('pong', () => {
    console.log('Client alive');
  });

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});
```

### 10. Graceful Shutdown

```typescript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing Socket.IO connections...');

  io.close(() => {
    console.log('All Socket.IO connections closed');
    process.exit(0);
  });
});
```

---

## 📊 Event Reference

### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `connection` | `{ auth: { token } }` | Initial connection with JWT |
| `join-room` | `{ chatId }` | Join a chat room |
| `leave-room` | `{ chatId }` | Leave a chat room |
| `send-message` | `{ chatId, content, type }` | Send a message |
| `typing` | `{ chatId }` | User started typing |
| `stop-typing` | `{ chatId }` | User stopped typing |
| `disconnect` | - | Client disconnected |

### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `connection` | - | Connection established |
| `connect_error` | `{ message }` | Authentication failed |
| `joined-room` | `{ chatId }` | Successfully joined room |
| `left-room` | `{ chatId }` | Successfully left room |
| `new-message` | `{ message }` | New message in chat |
| `user-typing` | `{ userId, userName, chatId }` | User is typing |
| `user-stopped-typing` | `{ userId, chatId }` | User stopped typing |
| `user-online` | `{ userId, timestamp }` | User came online |
| `user-offline` | `{ userId, timestamp }` | User went offline |
| `new-notification` | `{ notification }` | New notification |
| `error` | `{ message }` | Error occurred |

---

## 📝 Summary

**Key Takeaways:**

1. **JWT Authentication**: Every Socket.IO connection authenticated with JWT
2. **Room-Based Messaging**: Personal rooms (`user:${userId}`) + chat rooms
3. **Event Handlers**: Clean separation of concerns (join, leave, message, typing)
4. **Presence Tracking**: Real-time online/offline status
5. **Typing Indicators**: Throttled events to prevent spam
6. **Push Notifications**: Targeted notifications to specific users
7. **Error Handling**: Try-catch + error events
8. **Graceful Disconnection**: Clean up on disconnect

**Socket.IO Checklist:**

□ JWT authentication middleware configured
□ Personal rooms for each user
□ Chat rooms for conversations
□ Presence tracking (online/offline)
□ Typing indicators with throttling
□ Error handling in all event handlers
□ Acknowledgements for critical events
□ Graceful disconnect handling
□ Connection monitoring (ping/pong)
□ Room authorization (verify user is participant)

---

**Happy Real-Time Coding! 🚀**
