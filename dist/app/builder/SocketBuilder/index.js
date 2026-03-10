"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEvent = exports.VALID_EVENTS = exports.ThrottleManager = exports.default = exports.SocketBuilder = void 0;
// Main builder
var SocketBuilder_1 = require("./SocketBuilder");
Object.defineProperty(exports, "SocketBuilder", { enumerable: true, get: function () { return SocketBuilder_1.SocketBuilder; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(SocketBuilder_1).default; } });
// Throttle manager
var ThrottleManager_1 = require("./ThrottleManager");
Object.defineProperty(exports, "ThrottleManager", { enumerable: true, get: function () { return ThrottleManager_1.ThrottleManager; } });
// Events
var events_1 = require("./events");
Object.defineProperty(exports, "VALID_EVENTS", { enumerable: true, get: function () { return events_1.VALID_EVENTS; } });
Object.defineProperty(exports, "isValidEvent", { enumerable: true, get: function () { return events_1.isValidEvent; } });
