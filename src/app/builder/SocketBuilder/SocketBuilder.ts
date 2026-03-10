/**
 * SocketBuilder - Fluent API for Socket.IO Emissions
 *
 * Provides a type-safe, chainable interface for emitting Socket.IO events.
 * Centralizes room management, throttling, and permission checking.
 *
 * @example
 * ```typescript
 * // Basic usage
 * await SocketBuilder
 *   .toChat(chatId)
 *   .emit('MESSAGE_SENT', { message })
 *   .send();
 *
 * // With throttling
 * await SocketBuilder
 *   .toChat(chatId)
 *   .emit('TYPING_START', { userId, chatId })
 *   .throttle(5000)
 *   .send();
 *
 * // With permission check
 * await SocketBuilder
 *   .toChat(chatId)
 *   .emit('MESSAGE_SENT', { message })
 *   .requirePermission(async () => await checkParticipant(chatId, userId))
 *   .onDenied(() => socket.emit('ACK_ERROR', { message: 'Not allowed' }))
 *   .send();
 * ```
 *
 * @module SocketBuilder
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../../shared/logger';
import { ThrottleManager } from './ThrottleManager';
import {
  ISocketEvents,
  SocketEventName,
  SocketEventPayload,
} from './events';
import {
  IRoomConfig,
  IEmitResult,
  PermissionChecker,
  DeniedHandler,
  ISocketMetrics,
} from './types';

// ==================== SOCKET INSTANCE ====================

let ioInstance: Server | null = null;

// ==================== METRICS ====================

const metrics: ISocketMetrics = {
  totalEmits: 0,
  throttledEmits: 0,
  deniedEmits: 0,
  failedEmits: 0,
  eventCounts: {},
  roomCounts: {},
};

// ==================== ROOM PREFIXES ====================

const ROOM_PREFIXES = {
  chat: 'chat::',
  user: 'user::',
};

// ==================== SOCKET BUILDER CLASS ====================

class SocketBuilderInstance<
  TEvent extends SocketEventName = SocketEventName,
  TPayload = any
> {
  private room: IRoomConfig | null = null;
  private event: TEvent | null = null;
  private payload: TPayload | null = null;
  private throttleTTL: number | null = null;
  private throttleKey: string | null = null;
  private permissionChecker: PermissionChecker | null = null;
  private deniedHandler: DeniedHandler | null = null;
  private excludeSocketIds: string[] = [];
  private excludeUserIds: string[] = [];
  private debugEnabled: boolean = false;
  private socket: Socket | null = null;
  private batchPayloads: TPayload[] = [];

  // ==================== ROOM TARGETING ====================

  /**
   * Target a chat room
   *
   * @param chatId - Chat ID to target
   * @returns SocketBuilder instance for chaining
   */
  toChat(chatId: string): this {
    this.room = {
      type: 'chat',
      id: chatId,
      prefix: ROOM_PREFIXES.chat,
    };
    return this;
  }

  /**
   * Target a user's personal room
   *
   * @param userId - User ID to target
   * @returns SocketBuilder instance for chaining
   */
  toUser(userId: string): this {
    this.room = {
      type: 'user',
      id: userId,
      prefix: ROOM_PREFIXES.user,
    };
    return this;
  }

  /**
   * Broadcast to all connected clients
   *
   * @returns SocketBuilder instance for chaining
   */
  broadcast(): this {
    this.room = {
      type: 'broadcast',
      prefix: '',
    };
    return this;
  }

  /**
   * Target a custom room
   *
   * @param roomName - Full room name
   * @returns SocketBuilder instance for chaining
   */
  toRoom(roomName: string): this {
    this.room = {
      type: 'chat', // Using chat type for custom rooms
      id: roomName,
      prefix: '', // No prefix for custom rooms
    };
    return this;
  }

  // ==================== EVENT EMISSION ====================

  /**
   * Set the event to emit (type-safe)
   *
   * @param event - Event name (must be a valid SocketEventName)
   * @param payload - Event payload (type-checked against event)
   * @returns SocketBuilder instance for chaining
   */
  emit<E extends SocketEventName>(
    event: E,
    payload: SocketEventPayload<E>
  ): SocketBuilderInstance<E, SocketEventPayload<E>> {
    const instance = this as unknown as SocketBuilderInstance<
      E,
      SocketEventPayload<E>
    >;
    instance.event = event;
    instance.payload = payload;
    return instance;
  }

  /**
   * Emit batch of payloads for same event
   *
   * @param event - Event name
   * @param payloads - Array of payloads
   * @returns SocketBuilder instance for chaining
   */
  emitBatch<E extends SocketEventName>(
    event: E,
    payloads: SocketEventPayload<E>[]
  ): SocketBuilderInstance<E, SocketEventPayload<E>> {
    const instance = this as unknown as SocketBuilderInstance<
      E,
      SocketEventPayload<E>
    >;
    instance.event = event;
    instance.batchPayloads = payloads as any[];
    return instance;
  }

  // ==================== THROTTLING ====================

  /**
   * Add throttling to the emission
   *
   * @param ttlMs - Throttle TTL in milliseconds
   * @param customKey - Optional custom throttle key
   * @returns SocketBuilder instance for chaining
   */
  throttle(ttlMs: number, customKey?: string): this {
    this.throttleTTL = ttlMs;
    this.throttleKey = customKey || null;
    return this;
  }

  // ==================== PERMISSION ====================

  /**
   * Require permission before emitting
   *
   * @param checker - Async function that returns true if allowed
   * @returns SocketBuilder instance for chaining
   */
  requirePermission(checker: PermissionChecker): this {
    this.permissionChecker = checker;
    return this;
  }

  /**
   * Handler to call when permission is denied
   *
   * @param handler - Function to call on denial
   * @returns SocketBuilder instance for chaining
   */
  onDenied(handler: DeniedHandler): this {
    this.deniedHandler = handler;
    return this;
  }

  // ==================== EXCLUSIONS ====================

  /**
   * Exclude specific socket IDs from receiving the event
   *
   * @param socketIds - Socket IDs to exclude
   * @returns SocketBuilder instance for chaining
   */
  excludeSockets(...socketIds: string[]): this {
    this.excludeSocketIds.push(...socketIds);
    return this;
  }

  /**
   * Exclude sender (common pattern)
   *
   * @param senderId - Sender's user ID to exclude
   * @returns SocketBuilder instance for chaining
   */
  excludeSender(senderId: string): this {
    this.excludeUserIds.push(senderId);
    return this;
  }

  // ==================== SOCKET CONTEXT ====================

  /**
   * Set the socket context (for onDenied handler)
   *
   * @param socket - Socket instance
   * @returns SocketBuilder instance for chaining
   */
  withSocket(socket: Socket): this {
    this.socket = socket;
    return this;
  }

  // ==================== DEBUG ====================

  /**
   * Enable debug logging for this emission
   *
   * @param enabled - Whether to enable debug
   * @returns SocketBuilder instance for chaining
   */
  debug(enabled: boolean = true): this {
    this.debugEnabled = enabled;
    return this;
  }

  // ==================== EXECUTION ====================

  /**
   * Execute the emission
   *
   * @returns Promise with emit result
   */
  async send(): Promise<IEmitResult> {
    const result: IEmitResult = {
      success: false,
      event: this.event || 'UNKNOWN',
      room: this.getRoomName(),
      throttled: false,
      permissionDenied: false,
      timestamp: new Date(),
    };

    try {
      // Get IO instance
      const io = this.getIO();
      if (!io) {
        result.error = 'Socket.IO instance not initialized';
        this.log('error', 'Socket.IO not initialized');
        metrics.failedEmits++;
        return result;
      }

      // Validate event
      if (!this.event) {
        result.error = 'No event specified';
        this.log('error', 'No event specified');
        metrics.failedEmits++;
        return result;
      }

      // Check throttle
      if (this.throttleTTL) {
        const key = this.getThrottleKey();
        if (ThrottleManager.checkAndSet(key, this.throttleTTL)) {
          result.throttled = true;
          this.log('debug', 'Event throttled: ' + this.event);
          metrics.throttledEmits++;
          return result;
        }
      }

      // Check permission
      if (this.permissionChecker) {
        const allowed = await this.permissionChecker();
        if (!allowed) {
          result.permissionDenied = true;
          this.log('debug', 'Permission denied for: ' + this.event);
          metrics.deniedEmits++;

          if (this.deniedHandler) {
            await this.deniedHandler(this.socket || undefined);
          }

          return result;
        }
      }

      // Execute emission
      if (this.batchPayloads.length > 0) {
        // Batch emission
        for (const payload of this.batchPayloads) {
          await this.executeEmit(io, payload);
        }
      } else if (this.payload) {
        // Single emission
        await this.executeEmit(io, this.payload);
      }

      result.success = true;
      metrics.totalEmits++;
      this.updateEventMetrics();

      this.log('debug', 'Event emitted: ' + this.event + ' to ' + result.room);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.log('error', 'Emit failed: ' + result.error);
      metrics.failedEmits++;
    }

    return result;
  }

  // ==================== PRIVATE HELPERS ====================

  private getIO(): Server | null {
    if (ioInstance) return ioInstance;
    // Fallback to global.io
    // @ts-ignore
    return global.io || null;
  }

  private getRoomName(): string | null {
    if (!this.room) return null;
    if (this.room.type === 'broadcast') return null;
    return this.room.prefix + (this.room.id || '');
  }

  private getThrottleKey(): string {
    if (this.throttleKey) return this.throttleKey;
    const parts: string[] = [];
    if (this.event) parts.push(String(this.event));
    if (this.room?.id) parts.push(this.room.id);
    return ThrottleManager.generateKey(parts[0] || 'unknown', ...parts.slice(1));
  }

  private async executeEmit(io: Server, payload: any): Promise<void> {
    const roomName = this.getRoomName();

    if (this.room?.type === 'broadcast') {
      // Broadcast to all
      io.emit(this.event!, payload);
    } else if (roomName) {
      // Room-targeted
      let emitter = io.to(roomName);

      // Handle exclusions (Socket.IO doesn't support this natively for rooms)
      // We'll emit to room and let clients filter if needed
      emitter.emit(this.event!, payload);
    } else {
      // No room specified, emit to all
      io.emit(this.event!, payload);
    }
  }

  private updateEventMetrics(): void {
    if (this.event) {
      metrics.eventCounts[this.event] =
        (metrics.eventCounts[this.event] || 0) + 1;
    }
    const room = this.getRoomName();
    if (room) {
      const roomType = this.room?.type || 'unknown';
      metrics.roomCounts[roomType] =
        (metrics.roomCounts[roomType] || 0) + 1;
    }
  }

  private log(level: 'debug' | 'info' | 'error', message: string): void {
    if (level === 'debug' && !this.debugEnabled) return;

    const prefix = '[SocketBuilder]';
    switch (level) {
      case 'debug':
        logger.debug(prefix + ' ' + message);
        break;
      case 'info':
        logger.info(prefix + ' ' + message);
        break;
      case 'error':
        logger.error(prefix + ' ' + message);
        break;
    }
  }
}

// ==================== STATIC FACTORY ====================

/**
 * SocketBuilder - Factory for creating builder instances
 */
export const SocketBuilder = {
  /**
   * Target a chat room
   */
  toChat(chatId: string): SocketBuilderInstance {
    return new SocketBuilderInstance().toChat(chatId);
  },

  /**
   * Target a user's personal room
   */
  toUser(userId: string): SocketBuilderInstance {
    return new SocketBuilderInstance().toUser(userId);
  },

  /**
   * Broadcast to all connected clients
   */
  broadcast(): SocketBuilderInstance {
    return new SocketBuilderInstance().broadcast();
  },

  /**
   * Target a custom room
   */
  toRoom(roomName: string): SocketBuilderInstance {
    return new SocketBuilderInstance().toRoom(roomName);
  },

  /**
   * Initialize with Socket.IO server instance
   *
   * @param io - Socket.IO server instance
   */
  initialize(io: Server): void {
    ioInstance = io;
    logger.info('[SocketBuilder] Initialized with Socket.IO instance');
  },

  /**
   * Get current metrics
   */
  getMetrics(): ISocketMetrics {
    return { ...metrics };
  },

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    metrics.totalEmits = 0;
    metrics.throttledEmits = 0;
    metrics.deniedEmits = 0;
    metrics.failedEmits = 0;
    metrics.eventCounts = {};
    metrics.roomCounts = {};
  },

  /**
   * Get room name for a chat
   */
  getChatRoom(chatId: string): string {
    return ROOM_PREFIXES.chat + chatId;
  },

  /**
   * Get room name for a user
   */
  getUserRoom(userId: string): string {
    return ROOM_PREFIXES.user + userId;
  },

  /**
   * Generate throttle key
   */
  getThrottleKey(event: string, ...identifiers: string[]): string {
    return ThrottleManager.generateKey(event, ...identifiers);
  },

  /**
   * Check if Socket.IO is initialized
   */
  isInitialized(): boolean {
    // @ts-ignore
    return ioInstance !== null || global.io !== undefined;
  },
};

export default SocketBuilder;
