/**
 * SocketBuilder Types
 *
 * Type definitions for the SocketBuilder module.
 *
 * @module SocketBuilder/types
 */

import { Server, Socket } from 'socket.io';

// ==================== ROOM TYPES ====================

export type RoomType = 'chat' | 'user' | 'broadcast';

export interface IRoomConfig {
  type: RoomType;
  id?: string;
  prefix: string;
}

// ==================== THROTTLE TYPES ====================

export interface IThrottleOptions {
  /** TTL in milliseconds */
  ttl: number;
  /** Unique key for throttling (auto-generated if not provided) */
  key?: string;
}

// ==================== PERMISSION TYPES ====================

export type PermissionChecker = () => Promise<boolean> | boolean;
export type DeniedHandler = (socket?: Socket) => void | Promise<void>;

export interface IPermissionConfig {
  checker: PermissionChecker;
  onDenied?: DeniedHandler;
}

// ==================== EMIT TYPES ====================

export interface IEmitOptions {
  /** Exclude specific socket IDs from receiving the event */
  excludeSocketIds?: string[];
  /** Exclude specific user IDs from receiving the event */
  excludeUserIds?: string[];
  /** Enable debug logging for this emission */
  debug?: boolean;
}

export interface IEmitResult {
  success: boolean;
  event: string;
  room: string | null;
  throttled: boolean;
  permissionDenied: boolean;
  timestamp: Date;
  error?: string;
}

// ==================== BATCH EMIT TYPES ====================

export interface IBatchEmitOptions extends IEmitOptions {
  /** Delay between batch items in milliseconds */
  batchDelay?: number;
}

// ==================== SOCKET CONFIG ====================

export interface ISocketConfig {
  /** Default throttle TTL in milliseconds */
  defaultThrottleTTL: number;
  /** Enable debug logging globally */
  enableDebug: boolean;
  /** Enable metrics recording */
  enableMetrics: boolean;
  /** Room prefixes */
  roomPrefixes: {
    chat: string;
    user: string;
  };
}

// ==================== BUILDER STATE ====================

export interface IBuilderState<TEvent extends string, TPayload> {
  room: IRoomConfig | null;
  event: TEvent | null;
  payload: TPayload | null;
  throttle: IThrottleOptions | null;
  permission: IPermissionConfig | null;
  excludeSocketIds: string[];
  excludeUserIds: string[];
  debug: boolean;
  socket: Socket | null;
  batchPayloads: TPayload[];
}

// ==================== SOCKET INSTANCE ====================

export interface ISocketInstance {
  io: Server | null;
  initialized: boolean;
}

// ==================== METRICS ====================

export interface ISocketMetrics {
  totalEmits: number;
  throttledEmits: number;
  deniedEmits: number;
  failedEmits: number;
  eventCounts: Record<string, number>;
  roomCounts: Record<string, number>;
}
