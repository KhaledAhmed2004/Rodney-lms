/**
 * TestBuilder - Main orchestrator for test utilities
 *
 * @description
 * Central entry point for all testing utilities.
 * Provides:
 * - MongoDB Memory Server management
 * - Factory access for test data
 * - HTTP request helpers
 * - Socket.IO testing helpers
 * - JWT token helpers
 *
 * @example
 * ```typescript
 * import { TestBuilder } from '@/app/builder/TestBuilder';
 *
 * beforeAll(() => TestBuilder.setup());
 * afterAll(() => TestBuilder.teardown());
 * beforeEach(() => TestBuilder.cleanup());
 *
 * // Create test data
 * const user = await TestBuilder.user().verified().create();
 * const { user, token } = await TestBuilder.user().createWithToken();
 *
 * // HTTP requests
 * const res = await TestBuilder.request(app)
 *   .auth(token)
 *   .get('/api/v1/users')
 *   .expect(200);
 *
 * // Socket.IO testing
 * const socket = await TestBuilder.socket(serverUrl, token).connect();
 * const event = await socket.waitFor('MESSAGE_SENT', 5000);
 * ```
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Express } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';

// Factories
import { UserFactory } from './factories/user.factory';
import { ChatFactory } from './factories/chat.factory';
import { MessageFactory } from './factories/message.factory';
import { NotificationFactory } from './factories/notification.factory';
import { BaseFactory } from './factories/base.factory';

// Helpers
import { AuthHelper } from './helpers/authHelper';
import { RequestHelper } from './helpers/requestHelper';
import { SocketHelper, SocketOptions } from './helpers/socketHelper';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export interface SetupOptions {
  /**
   * Enable Socket.IO server for real-time testing
   */
  withSocket?: boolean;

  /**
   * Express app instance (required if withSocket is true)
   */
  app?: Express;

  /**
   * Custom port for Socket.IO server (default: 0 for random)
   */
  socketPort?: number;

  /**
   * Custom MongoDB URI (skips memory server if provided)
   */
  mongoUri?: string;

  /**
   * MongoDB connection options
   */
  mongoOptions?: mongoose.ConnectOptions;
}

export interface SetupResult {
  /**
   * MongoDB URI
   */
  mongoUri: string;

  /**
   * Socket.IO server URL (if enabled)
   */
  socketUrl?: string;
}

// ════════════════════════════════════════════════════════════
// TESTBUILDER CLASS
// ════════════════════════════════════════════════════════════

export class TestBuilder {
  // MongoDB Memory Server instance
  private static mongoServer: MongoMemoryServer | null = null;

  // Socket.IO server instances
  private static httpServer: HttpServer | null = null;
  private static ioServer: IOServer | null = null;
  private static socketUrl: string | null = null;

  // Setup state
  private static isSetup: boolean = false;

  // ════════════════════════════════════════════════════════════
  // SETUP & TEARDOWN
  // ════════════════════════════════════════════════════════════

  /**
   * Setup test environment
   * - Creates MongoDB Memory Server
   * - Connects mongoose
   * - Optionally starts Socket.IO server
   *
   * Call this in `beforeAll()`
   *
   * @example
   * beforeAll(async () => {
   *   await TestBuilder.setup();
   * });
   *
   * // With Socket.IO
   * beforeAll(async () => {
   *   const { socketUrl } = await TestBuilder.setup({ withSocket: true, app });
   * });
   */
  static async setup(options: SetupOptions = {}): Promise<SetupResult> {
    if (this.isSetup) {
      console.warn('TestBuilder.setup() called multiple times. Skipping...');
      return {
        mongoUri: this.mongoServer?.getUri() || '',
        socketUrl: this.socketUrl || undefined,
      };
    }

    let mongoUri: string;

    // Use provided URI or create memory server
    if (options.mongoUri) {
      mongoUri = options.mongoUri;
    } else {
      // Create MongoDB Memory Server
      this.mongoServer = await MongoMemoryServer.create();
      mongoUri = this.mongoServer.getUri();
    }

    // Connect mongoose
    await mongoose.connect(mongoUri, {
      ...options.mongoOptions,
    });

    // Setup Socket.IO server if requested
    if (options.withSocket && options.app) {
      this.httpServer = createServer(options.app);
      this.ioServer = new IOServer(this.httpServer);

      // Start server on specified port or random
      await new Promise<void>((resolve) => {
        this.httpServer!.listen(options.socketPort || 0, () => {
          const address = this.httpServer!.address();
          const port = typeof address === 'object' ? address?.port : 0;
          this.socketUrl = `http://localhost:${port}`;
          resolve();
        });
      });
    }

    this.isSetup = true;

    return {
      mongoUri,
      socketUrl: this.socketUrl || undefined,
    };
  }

  /**
   * Teardown test environment
   * - Disconnects mongoose
   * - Stops MongoDB Memory Server
   * - Closes Socket.IO server
   *
   * Call this in `afterAll()`
   *
   * @example
   * afterAll(async () => {
   *   await TestBuilder.teardown();
   * });
   */
  static async teardown(): Promise<void> {
    // Close Socket.IO server
    if (this.ioServer) {
      this.ioServer.close();
      this.ioServer = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    this.socketUrl = null;

    // Disconnect mongoose
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Stop MongoDB Memory Server
    if (this.mongoServer) {
      await this.mongoServer.stop();
      this.mongoServer = null;
    }

    // Reset sequences
    BaseFactory.resetSequences();

    this.isSetup = false;
  }

  /**
   * Clean up all collections
   * Preserves database connection but removes all data
   *
   * Call this in `beforeEach()` for test isolation
   *
   * @example
   * beforeEach(async () => {
   *   await TestBuilder.cleanup();
   * });
   */
  static async cleanup(): Promise<void> {
    if (!mongoose.connection.db) {
      throw new Error('Database not connected. Call TestBuilder.setup() first.');
    }

    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
    }

    // Reset sequence counters for consistent tests
    BaseFactory.resetSequences();
  }

  /**
   * Drop a specific collection
   *
   * @param collectionName - Name of collection to drop
   */
  static async dropCollection(collectionName: string): Promise<void> {
    if (!mongoose.connection.db) {
      throw new Error('Database not connected. Call TestBuilder.setup() first.');
    }

    try {
      await mongoose.connection.db.dropCollection(collectionName);
    } catch (error: any) {
      // Ignore if collection doesn't exist
      if (error.code !== 26) {
        throw error;
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // FACTORY ACCESS
  // ════════════════════════════════════════════════════════════

  /**
   * Get User factory
   *
   * @example
   * const user = await TestBuilder.user().create();
   * const admin = await TestBuilder.user().asAdmin().create();
   * const { user, token } = await TestBuilder.user().createWithToken();
   */
  static user(): UserFactory {
    return new UserFactory();
  }

  /**
   * Get Chat factory
   *
   * @example
   * const chat = await TestBuilder.chat()
   *   .between(user1, user2)
   *   .create();
   */
  static chat(): ChatFactory {
    return new ChatFactory();
  }

  /**
   * Get Message factory
   *
   * @example
   * const message = await TestBuilder.message()
   *   .inChat(chat)
   *   .from(user)
   *   .withText('Hello!')
   *   .create();
   */
  static message(): MessageFactory {
    return new MessageFactory();
  }

  /**
   * Get Notification factory
   *
   * @example
   * const notification = await TestBuilder.notification()
   *   .forUser(user)
   *   .asSystem()
   *   .create();
   */
  static notification(): NotificationFactory {
    return new NotificationFactory();
  }

  // ════════════════════════════════════════════════════════════
  // HELPER ACCESS
  // ════════════════════════════════════════════════════════════

  /**
   * Get HTTP request helper
   *
   * @param app - Express application instance
   *
   * @example
   * const res = await TestBuilder.request(app)
   *   .auth(token)
   *   .get('/api/v1/users')
   *   .expect(200);
   */
  static request(app: Express): RequestHelper {
    return new RequestHelper(app);
  }

  /**
   * Get Socket.IO helper
   *
   * @param serverUrl - Socket.IO server URL
   * @param token - JWT token for authentication (optional)
   * @param options - Socket connection options
   *
   * @example
   * const socket = await TestBuilder.socket(serverUrl, token).connect();
   * socket.joinRoom(`chat::${chat._id}`);
   * const event = await socket.waitFor('MESSAGE_SENT', 5000);
   * socket.disconnect();
   */
  static socket(serverUrl: string, token?: string, options?: SocketOptions): SocketHelper {
    return new SocketHelper(serverUrl, token, options);
  }

  /**
   * Direct access to AuthHelper for token operations
   *
   * @example
   * const token = TestBuilder.auth.generateToken(user);
   * const expiredToken = TestBuilder.auth.generateExpiredToken(user);
   */
  static get auth(): typeof AuthHelper {
    return AuthHelper;
  }

  // ════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Get current MongoDB URI
   */
  static getMongoUri(): string | null {
    return this.mongoServer?.getUri() || null;
  }

  /**
   * Get Socket.IO server URL
   */
  static getSocketUrl(): string | null {
    return this.socketUrl;
  }

  /**
   * Get Socket.IO server instance
   */
  static getIOServer(): IOServer | null {
    return this.ioServer;
  }

  /**
   * Check if TestBuilder is set up
   */
  static isReady(): boolean {
    return this.isSetup;
  }

  /**
   * Wait for a condition to be true
   * Useful for async operations
   *
   * @param condition - Function that returns boolean
   * @param timeout - Maximum wait time in milliseconds
   * @param interval - Check interval in milliseconds
   *
   * @example
   * await TestBuilder.waitFor(() => socket.hasReceived('EVENT'), 5000);
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Sleep for specified milliseconds
   * Useful for waiting for async operations
   *
   * @param ms - Milliseconds to sleep
   *
   * @example
   * await TestBuilder.sleep(100);
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random ObjectId
   */
  static randomId(): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId();
  }

  /**
   * Create a mock file buffer for upload testing
   *
   * @param size - Size in bytes (default: 1024)
   * @param fill - Fill character (default: 'a')
   */
  static mockFile(size: number = 1024, fill: string = 'a'): Buffer {
    return Buffer.alloc(size, fill);
  }
}
