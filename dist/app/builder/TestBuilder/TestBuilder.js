"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestBuilder = void 0;
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
// Factories
const user_factory_1 = require("./factories/user.factory");
const chat_factory_1 = require("./factories/chat.factory");
const message_factory_1 = require("./factories/message.factory");
const notification_factory_1 = require("./factories/notification.factory");
const base_factory_1 = require("./factories/base.factory");
// Helpers
const authHelper_1 = require("./helpers/authHelper");
const requestHelper_1 = require("./helpers/requestHelper");
const socketHelper_1 = require("./helpers/socketHelper");
// ════════════════════════════════════════════════════════════
// TESTBUILDER CLASS
// ════════════════════════════════════════════════════════════
class TestBuilder {
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
    static setup() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            var _a;
            if (this.isSetup) {
                console.warn('TestBuilder.setup() called multiple times. Skipping...');
                return {
                    mongoUri: ((_a = this.mongoServer) === null || _a === void 0 ? void 0 : _a.getUri()) || '',
                    socketUrl: this.socketUrl || undefined,
                };
            }
            let mongoUri;
            // Use provided URI or create memory server
            if (options.mongoUri) {
                mongoUri = options.mongoUri;
            }
            else {
                // Create MongoDB Memory Server
                this.mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
                mongoUri = this.mongoServer.getUri();
            }
            // Connect mongoose
            yield mongoose_1.default.connect(mongoUri, Object.assign({}, options.mongoOptions));
            // Setup Socket.IO server if requested
            if (options.withSocket && options.app) {
                this.httpServer = (0, http_1.createServer)(options.app);
                this.ioServer = new socket_io_1.Server(this.httpServer);
                // Start server on specified port or random
                yield new Promise((resolve) => {
                    this.httpServer.listen(options.socketPort || 0, () => {
                        const address = this.httpServer.address();
                        const port = typeof address === 'object' ? address === null || address === void 0 ? void 0 : address.port : 0;
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
        });
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
    static teardown() {
        return __awaiter(this, void 0, void 0, function* () {
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
            if (mongoose_1.default.connection.readyState !== 0) {
                yield mongoose_1.default.disconnect();
            }
            // Stop MongoDB Memory Server
            if (this.mongoServer) {
                yield this.mongoServer.stop();
                this.mongoServer = null;
            }
            // Reset sequences
            base_factory_1.BaseFactory.resetSequences();
            this.isSetup = false;
        });
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
    static cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.default.connection.db) {
                throw new Error('Database not connected. Call TestBuilder.setup() first.');
            }
            const collections = yield mongoose_1.default.connection.db.collections();
            for (const collection of collections) {
                yield collection.deleteMany({});
            }
            // Reset sequence counters for consistent tests
            base_factory_1.BaseFactory.resetSequences();
        });
    }
    /**
     * Drop a specific collection
     *
     * @param collectionName - Name of collection to drop
     */
    static dropCollection(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.default.connection.db) {
                throw new Error('Database not connected. Call TestBuilder.setup() first.');
            }
            try {
                yield mongoose_1.default.connection.db.dropCollection(collectionName);
            }
            catch (error) {
                // Ignore if collection doesn't exist
                if (error.code !== 26) {
                    throw error;
                }
            }
        });
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
    static user() {
        return new user_factory_1.UserFactory();
    }
    /**
     * Get Chat factory
     *
     * @example
     * const chat = await TestBuilder.chat()
     *   .between(user1, user2)
     *   .create();
     */
    static chat() {
        return new chat_factory_1.ChatFactory();
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
    static message() {
        return new message_factory_1.MessageFactory();
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
    static notification() {
        return new notification_factory_1.NotificationFactory();
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
    static request(app) {
        return new requestHelper_1.RequestHelper(app);
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
    static socket(serverUrl, token, options) {
        return new socketHelper_1.SocketHelper(serverUrl, token, options);
    }
    /**
     * Direct access to AuthHelper for token operations
     *
     * @example
     * const token = TestBuilder.auth.generateToken(user);
     * const expiredToken = TestBuilder.auth.generateExpiredToken(user);
     */
    static get auth() {
        return authHelper_1.AuthHelper;
    }
    // ════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Get current MongoDB URI
     */
    static getMongoUri() {
        var _a;
        return ((_a = this.mongoServer) === null || _a === void 0 ? void 0 : _a.getUri()) || null;
    }
    /**
     * Get Socket.IO server URL
     */
    static getSocketUrl() {
        return this.socketUrl;
    }
    /**
     * Get Socket.IO server instance
     */
    static getIOServer() {
        return this.ioServer;
    }
    /**
     * Check if TestBuilder is set up
     */
    static isReady() {
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
    static waitFor(condition_1) {
        return __awaiter(this, arguments, void 0, function* (condition, timeout = 5000, interval = 100) {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                const result = yield condition();
                if (result) {
                    return;
                }
                yield new Promise((resolve) => setTimeout(resolve, interval));
            }
            throw new Error(`Condition not met within ${timeout}ms`);
        });
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
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Generate a random ObjectId
     */
    static randomId() {
        return new mongoose_1.default.Types.ObjectId();
    }
    /**
     * Create a mock file buffer for upload testing
     *
     * @param size - Size in bytes (default: 1024)
     * @param fill - Fill character (default: 'a')
     */
    static mockFile(size = 1024, fill = 'a') {
        return Buffer.alloc(size, fill);
    }
}
exports.TestBuilder = TestBuilder;
// MongoDB Memory Server instance
TestBuilder.mongoServer = null;
// Socket.IO server instances
TestBuilder.httpServer = null;
TestBuilder.ioServer = null;
TestBuilder.socketUrl = null;
// Setup state
TestBuilder.isSetup = false;
