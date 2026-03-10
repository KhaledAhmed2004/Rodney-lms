"use strict";
/**
 * TestBuilder - Complete Testing Utility for Factory Pattern Testing
 *
 * @module TestBuilder
 * @description
 * Provides a comprehensive testing solution with:
 * - MongoDB Memory Server integration
 * - Factory-based test data generation
 * - JWT token helpers
 * - HTTP request helpers (Supertest wrapper)
 * - Socket.IO testing helpers
 *
 * @example
 * ```typescript
 * import { TestBuilder } from '@/app/builder/TestBuilder';
 *
 * beforeAll(() => TestBuilder.setup());
 * afterAll(() => TestBuilder.teardown());
 * beforeEach(() => TestBuilder.cleanup());
 *
 * const user = await TestBuilder.user().verified().create();
 * const { user, token } = await TestBuilder.user().createWithToken();
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFactory = exports.SocketHelper = exports.RequestHelper = exports.AuthHelper = exports.NotificationFactory = exports.MessageFactory = exports.ChatFactory = exports.UserFactory = exports.TestBuilder = void 0;
var TestBuilder_1 = require("./TestBuilder");
Object.defineProperty(exports, "TestBuilder", { enumerable: true, get: function () { return TestBuilder_1.TestBuilder; } });
// Export factories for direct use if needed
var user_factory_1 = require("./factories/user.factory");
Object.defineProperty(exports, "UserFactory", { enumerable: true, get: function () { return user_factory_1.UserFactory; } });
var chat_factory_1 = require("./factories/chat.factory");
Object.defineProperty(exports, "ChatFactory", { enumerable: true, get: function () { return chat_factory_1.ChatFactory; } });
var message_factory_1 = require("./factories/message.factory");
Object.defineProperty(exports, "MessageFactory", { enumerable: true, get: function () { return message_factory_1.MessageFactory; } });
var notification_factory_1 = require("./factories/notification.factory");
Object.defineProperty(exports, "NotificationFactory", { enumerable: true, get: function () { return notification_factory_1.NotificationFactory; } });
// Export helpers
var authHelper_1 = require("./helpers/authHelper");
Object.defineProperty(exports, "AuthHelper", { enumerable: true, get: function () { return authHelper_1.AuthHelper; } });
var requestHelper_1 = require("./helpers/requestHelper");
Object.defineProperty(exports, "RequestHelper", { enumerable: true, get: function () { return requestHelper_1.RequestHelper; } });
var socketHelper_1 = require("./helpers/socketHelper");
Object.defineProperty(exports, "SocketHelper", { enumerable: true, get: function () { return socketHelper_1.SocketHelper; } });
// Export base factory for extension
var base_factory_1 = require("./factories/base.factory");
Object.defineProperty(exports, "BaseFactory", { enumerable: true, get: function () { return base_factory_1.BaseFactory; } });
