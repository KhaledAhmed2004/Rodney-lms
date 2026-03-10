/**
 * SocketBuilder Module Exports
 *
 * Central export for SocketBuilder utilities.
 *
 * @example
 * ```typescript
 * import {
 *   SocketBuilder,
 *   ThrottleManager,
 *   ISocketEvents,
 *   SocketEventName,
 * } from '@/app/builder/SocketBuilder';
 *
 * // Emit a message
 * await SocketBuilder
 *   .toChat(chatId)
 *   .emit('MESSAGE_SENT', { message })
 *   .send();
 * ```
 *
 * @module SocketBuilder
 */

// Main builder
export { SocketBuilder, default } from './SocketBuilder';

// Throttle manager
export { ThrottleManager } from './ThrottleManager';

// Events
export {
  ISocketEvents,
  IMessagePayload,
  INotificationPayload,
  SocketEventName,
  SocketEventPayload,
  VALID_EVENTS,
  isValidEvent,
} from './events';

// Types
export type {
  RoomType,
  IRoomConfig,
  IThrottleOptions,
  PermissionChecker,
  DeniedHandler,
  IPermissionConfig,
  IEmitOptions,
  IEmitResult,
  IBatchEmitOptions,
  ISocketConfig,
  IBuilderState,
  ISocketInstance,
  ISocketMetrics,
} from './types';
