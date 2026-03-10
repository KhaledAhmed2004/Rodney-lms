"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_EVENTS = void 0;
exports.isValidEvent = isValidEvent;
// ==================== EVENT VALIDATION ====================
/**
 * List of all valid event names (for runtime validation)
 */
exports.VALID_EVENTS = [
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
function isValidEvent(event) {
    return exports.VALID_EVENTS.includes(event);
}
