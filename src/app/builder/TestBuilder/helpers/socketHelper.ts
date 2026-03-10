/**
 * SocketHelper - Socket.IO testing utilities
 *
 * @example
 * const socket = await TestBuilder.socket(serverUrl, token).connect();
 * socket.joinRoom(`chat::${chatId}`);
 * const event = await socket.waitFor('MESSAGE_SENT', 5000);
 * socket.disconnect();
 */

import { io, Socket } from 'socket.io-client';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export interface SocketEvent {
  name: string;
  data: any;
  timestamp: Date;
}

export interface SocketOptions {
  /**
   * Connection timeout in milliseconds (default: 5000)
   */
  timeout?: number;

  /**
   * Transport methods (default: ['websocket'])
   */
  transports?: ('websocket' | 'polling')[];

  /**
   * Additional auth data
   */
  auth?: Record<string, any>;

  /**
   * Whether to auto-reconnect (default: false for tests)
   */
  reconnection?: boolean;
}

// ════════════════════════════════════════════════════════════
// SOCKET HELPER CLASS
// ════════════════════════════════════════════════════════════

export class SocketHelper {
  private serverUrl: string;
  private token: string | null;
  private socket: Socket | null = null;
  private options: SocketOptions;
  private receivedEvents: SocketEvent[] = [];
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(serverUrl: string, token?: string, options?: SocketOptions) {
    this.serverUrl = serverUrl;
    this.token = token || null;
    this.options = {
      timeout: 5000,
      transports: ['websocket'],
      reconnection: false,
      ...options,
    };
  }

  // ════════════════════════════════════════════════════════════
  // CONNECTION METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Connect to the Socket.IO server
   *
   * @returns Promise that resolves when connected
   *
   * @example
   * const socket = await TestBuilder.socket(serverUrl, token).connect();
   */
  async connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Socket connection timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      // Build auth object
      const auth: Record<string, any> = {
        ...this.options.auth,
      };

      if (this.token) {
        auth.token = this.token;
      }

      // Create socket connection
      this.socket = io(this.serverUrl, {
        auth,
        transports: this.options.transports,
        reconnection: this.options.reconnection,
        forceNew: true, // Create new connection for each test
      });

      // Handle successful connection
      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.setupEventCapture();
        resolve(this);
      });

      // Handle connection error
      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${error.message}`));
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.clearEvents();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getId(): string | undefined {
    return this.socket?.id;
  }

  // ════════════════════════════════════════════════════════════
  // ROOM METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Join a room
   *
   * @example
   * socket.joinRoom(`chat::${chatId}`);
   */
  joinRoom(roomId: string): this {
    this.emit('join-room', { roomId });
    return this;
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): this {
    this.emit('leave-room', { roomId });
    return this;
  }

  // ════════════════════════════════════════════════════════════
  // EMIT METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Emit an event
   *
   * @example
   * socket.emit('typing', { chatId: '123' });
   */
  emit(event: string, data?: any): this {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }
    this.socket.emit(event, data);
    return this;
  }

  /**
   * Emit and wait for acknowledgment
   *
   * @example
   * const ack = await socket.emitWithAck('send-message', { text: 'Hello' });
   */
  async emitWithAck<T = any>(event: string, data?: any, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected. Call connect() first.'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Acknowledgment timeout for event: ${event}`));
      }, timeout || this.options.timeout);

      this.socket.emit(event, data, (response: T) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // EVENT LISTENING METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Listen for an event (adds to receivedEvents)
   *
   * @example
   * socket.on('MESSAGE_SENT', (data) => {
   *   console.log('Received:', data);
   * });
   */
  on(event: string, callback: (data: any) => void): this {
    if (!this.socket) {
      throw new Error('Socket not connected. Call connect() first.');
    }

    // Store listener
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);

    // Register with socket
    this.socket.on(event, callback);
    return this;
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): this {
    if (!this.socket) {
      return this;
    }

    if (callback) {
      this.socket.off(event, callback);

      // Remove from stored listeners
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this.eventListeners.set(event, listeners);
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.eventListeners.delete(event);
    }

    return this;
  }

  /**
   * Wait for a specific event with timeout
   *
   * @param event - Event name to wait for
   * @param timeout - Timeout in milliseconds (default: 5000)
   *
   * @example
   * const messageData = await socket.waitFor('MESSAGE_SENT', 5000);
   * expect(messageData.text).toBe('Hello!');
   */
  async waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected. Call connect() first.'));
        return;
      }

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout || this.options.timeout);

      const handler = (data: T) => {
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      const cleanup = () => {
        this.socket?.off(event, handler);
      };

      this.socket.on(event, handler);
    });
  }

  /**
   * Wait for multiple events
   *
   * @example
   * const events = await socket.waitForMany(['MESSAGE_SENT', 'USER_TYPING'], 2, 5000);
   */
  async waitForMany<T = any>(events: string[], count: number, timeout?: number): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected. Call connect() first.'));
        return;
      }

      const received: T[] = [];
      const handlers: Map<string, (data: any) => void> = new Map();

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for ${count} events. Received: ${received.length}`));
      }, timeout || this.options.timeout);

      const checkComplete = () => {
        if (received.length >= count) {
          clearTimeout(timer);
          cleanup();
          resolve(received);
        }
      };

      const cleanup = () => {
        for (const [event, handler] of handlers) {
          this.socket?.off(event, handler);
        }
      };

      for (const event of events) {
        const handler = (data: T) => {
          received.push(data);
          checkComplete();
        };
        handlers.set(event, handler);
        this.socket.on(event, handler);
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // EVENT HISTORY METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Check if an event was received
   *
   * @example
   * expect(socket.hasReceived('MESSAGE_SENT')).toBe(true);
   */
  hasReceived(event: string): boolean {
    return this.receivedEvents.some((e) => e.name === event);
  }

  /**
   * Get all received events
   */
  getAllEvents(): SocketEvent[] {
    return [...this.receivedEvents];
  }

  /**
   * Get events of a specific type
   *
   * @example
   * const messages = socket.getEventsOfType('MESSAGE_SENT');
   * expect(messages.length).toBe(3);
   */
  getEventsOfType(event: string): SocketEvent[] {
    return this.receivedEvents.filter((e) => e.name === event);
  }

  /**
   * Get the last event of a specific type
   */
  getLastEvent(event?: string): SocketEvent | undefined {
    if (event) {
      const events = this.getEventsOfType(event);
      return events[events.length - 1];
    }
    return this.receivedEvents[this.receivedEvents.length - 1];
  }

  /**
   * Get count of events
   */
  getEventCount(event?: string): number {
    if (event) {
      return this.getEventsOfType(event).length;
    }
    return this.receivedEvents.length;
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.receivedEvents = [];
  }

  // ════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Setup global event capture for history
   */
  private setupEventCapture(): void {
    if (!this.socket) return;

    // Capture all events
    this.socket.onAny((event: string, data: any) => {
      this.receivedEvents.push({
        name: event,
        data,
        timestamp: new Date(),
      });
    });
  }

  /**
   * Get underlying socket instance (for advanced use)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}
