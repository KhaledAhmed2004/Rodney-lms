"use strict";
/**
 * SocketHelper - Socket.IO testing utilities
 *
 * @example
 * const socket = await TestBuilder.socket(serverUrl, token).connect();
 * socket.joinRoom(`chat::${chatId}`);
 * const event = await socket.waitFor('MESSAGE_SENT', 5000);
 * socket.disconnect();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketHelper = void 0;
const socket_io_client_1 = require("socket.io-client");
// ════════════════════════════════════════════════════════════
// SOCKET HELPER CLASS
// ════════════════════════════════════════════════════════════
class SocketHelper {
    constructor(serverUrl, token, options) {
        this.socket = null;
        this.receivedEvents = [];
        this.eventListeners = new Map();
        this.serverUrl = serverUrl;
        this.token = token || null;
        this.options = Object.assign({ timeout: 5000, transports: ['websocket'], reconnection: false }, options);
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
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Socket connection timeout after ${this.options.timeout}ms`));
                }, this.options.timeout);
                // Build auth object
                const auth = Object.assign({}, this.options.auth);
                if (this.token) {
                    auth.token = this.token;
                }
                // Create socket connection
                this.socket = (0, socket_io_client_1.io)(this.serverUrl, {
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
        });
    }
    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.clearEvents();
    }
    /**
     * Check if socket is connected
     */
    isConnected() {
        var _a;
        return ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.connected) || false;
    }
    /**
     * Get socket ID
     */
    getId() {
        var _a;
        return (_a = this.socket) === null || _a === void 0 ? void 0 : _a.id;
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
    joinRoom(roomId) {
        this.emit('join-room', { roomId });
        return this;
    }
    /**
     * Leave a room
     */
    leaveRoom(roomId) {
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
    emit(event, data) {
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
    emitWithAck(event, data, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket not connected. Call connect() first.'));
                    return;
                }
                const timer = setTimeout(() => {
                    reject(new Error(`Acknowledgment timeout for event: ${event}`));
                }, timeout || this.options.timeout);
                this.socket.emit(event, data, (response) => {
                    clearTimeout(timer);
                    resolve(response);
                });
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
    on(event, callback) {
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
    off(event, callback) {
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
        }
        else {
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
    waitFor(event, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket not connected. Call connect() first.'));
                    return;
                }
                const timer = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timeout waiting for event: ${event}`));
                }, timeout || this.options.timeout);
                const handler = (data) => {
                    clearTimeout(timer);
                    cleanup();
                    resolve(data);
                };
                const cleanup = () => {
                    var _a;
                    (_a = this.socket) === null || _a === void 0 ? void 0 : _a.off(event, handler);
                };
                this.socket.on(event, handler);
            });
        });
    }
    /**
     * Wait for multiple events
     *
     * @example
     * const events = await socket.waitForMany(['MESSAGE_SENT', 'USER_TYPING'], 2, 5000);
     */
    waitForMany(events, count, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket not connected. Call connect() first.'));
                    return;
                }
                const received = [];
                const handlers = new Map();
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
                    var _a;
                    for (const [event, handler] of handlers) {
                        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.off(event, handler);
                    }
                };
                for (const event of events) {
                    const handler = (data) => {
                        received.push(data);
                        checkComplete();
                    };
                    handlers.set(event, handler);
                    this.socket.on(event, handler);
                }
            });
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
    hasReceived(event) {
        return this.receivedEvents.some((e) => e.name === event);
    }
    /**
     * Get all received events
     */
    getAllEvents() {
        return [...this.receivedEvents];
    }
    /**
     * Get events of a specific type
     *
     * @example
     * const messages = socket.getEventsOfType('MESSAGE_SENT');
     * expect(messages.length).toBe(3);
     */
    getEventsOfType(event) {
        return this.receivedEvents.filter((e) => e.name === event);
    }
    /**
     * Get the last event of a specific type
     */
    getLastEvent(event) {
        if (event) {
            const events = this.getEventsOfType(event);
            return events[events.length - 1];
        }
        return this.receivedEvents[this.receivedEvents.length - 1];
    }
    /**
     * Get count of events
     */
    getEventCount(event) {
        if (event) {
            return this.getEventsOfType(event).length;
        }
        return this.receivedEvents.length;
    }
    /**
     * Clear event history
     */
    clearEvents() {
        this.receivedEvents = [];
    }
    // ════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Setup global event capture for history
     */
    setupEventCapture() {
        if (!this.socket)
            return;
        // Capture all events
        this.socket.onAny((event, data) => {
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
    getSocket() {
        return this.socket;
    }
}
exports.SocketHelper = SocketHelper;
