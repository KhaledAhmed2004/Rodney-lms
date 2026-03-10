/**
 * SocketBuilder Events Registry
 *
 * Type-safe event definitions for Socket.IO emissions.
 * All event names and their payloads are strictly typed.
 *
 * @example
 * ```typescript
 * // TypeScript will enforce correct payload structure
 * SocketBuilder
 *   .toChat(chatId)
 *   .emit('MESSAGE_SENT', { message }) // ✅ Type-checked
 *   .send();
 *
 * SocketBuilder
 *   .toChat(chatId)
 *   .emit('MESSAGE_SENT', { msg: data }) // ❌ Compile error!
 *   .send();
 * ```
 *
 * @module SocketBuilder/events
 */

// ==================== MESSAGE INTERFACES ====================

export interface IMessagePayload {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  attachments?: any[];
  createdAt?: Date;
  [key: string]: any;
}

export interface INotificationPayload {
  _id: string;
  receiver: string;
  title?: string;
  text?: string;
  type?: string;
  isRead?: boolean;
  [key: string]: any;
}

// ==================== SOCKET EVENTS INTERFACE ====================

/**
 * Type-safe Socket.IO events registry
 *
 * Add new events here to get compile-time type checking.
 */
export interface ISocketEvents {
  // ==================== CHAT EVENTS ====================

  /** Emitted when a new message is sent */
  MESSAGE_SENT: {
    message: IMessagePayload;
  };

  /** Emitted when a message is delivered to a user */
  MESSAGE_DELIVERED: {
    messageId: string;
    chatId: string;
    userId: string;
  };

  /** Emitted when a message is read by a user */
  MESSAGE_READ: {
    messageId: string;
    chatId: string;
    userId: string;
  };

  /** Emitted when multiple messages are read at once */
  MESSAGES_READ_BULK: {
    messageIds: string[];
    chatId: string;
    userId: string;
  };

  // ==================== PRESENCE EVENTS ====================

  /** Emitted when a user comes online in a chat */
  USER_ONLINE: {
    userId: string;
    chatId: string;
    lastActive?: number | Date;
  };

  /** Emitted when a user goes offline in a chat */
  USER_OFFLINE: {
    userId: string;
    chatId: string;
    lastActive?: number | Date;
  };

  // ==================== TYPING EVENTS ====================

  /** Emitted when a user starts typing */
  TYPING_START: {
    userId: string;
    chatId: string;
  };

  /** Emitted when a user stops typing */
  TYPING_STOP: {
    userId: string;
    chatId: string;
  };

  // ==================== NOTIFICATION EVENTS ====================

  /** Emitted when a notification is received */
  NOTIFICATION_RECEIVED: {
    notification: INotificationPayload;
    timestamp?: string;
  };

  /** Emitted when notification count changes */
  NOTIFICATION_COUNT_UPDATE: {
    userId: string;
    count: number;
  };

  // ==================== UNREAD COUNT EVENTS ====================

  /** Emitted when unread message count changes */
  UNREAD_COUNT_UPDATE: {
    chatId: string;
    userId: string;
    count: number;
  };

  // ==================== ERROR EVENTS ====================

  /** Emitted when an acknowledgment error occurs */
  ACK_ERROR: {
    message: string;
    code?: string;
    chatId?: string;
    messageId?: string;
  };

  // ==================== SYSTEM EVENTS ====================

  /** Emitted for system-wide announcements */
  SYSTEM_ANNOUNCEMENT: {
    message: string;
    type?: 'info' | 'warning' | 'error';
    expiresAt?: Date;
  };

  /** Emitted when server is going down for maintenance */
  SERVER_MAINTENANCE: {
    message: string;
    estimatedDowntime?: number;
    startTime: Date;
  };
}

// ==================== EVENT NAME TYPE ====================

/**
 * Union type of all valid event names
 */
export type SocketEventName = keyof ISocketEvents;

/**
 * Get payload type for a specific event
 */
export type SocketEventPayload<T extends SocketEventName> = ISocketEvents[T];

// ==================== EVENT VALIDATION ====================

/**
 * List of all valid event names (for runtime validation)
 */
export const VALID_EVENTS: SocketEventName[] = [
  'MESSAGE_SENT',
  'MESSAGE_DELIVERED',
  'MESSAGE_READ',
  'MESSAGES_READ_BULK',
  'USER_ONLINE',
  'USER_OFFLINE',
  'TYPING_START',
  'TYPING_STOP',
  'NOTIFICATION_RECEIVED',
  'NOTIFICATION_COUNT_UPDATE',
  'UNREAD_COUNT_UPDATE',
  'ACK_ERROR',
  'SYSTEM_ANNOUNCEMENT',
  'SERVER_MAINTENANCE',
];

/**
 * Check if an event name is valid
 */
export function isValidEvent(event: string): event is SocketEventName {
  return VALID_EVENTS.includes(event as SocketEventName);
}
