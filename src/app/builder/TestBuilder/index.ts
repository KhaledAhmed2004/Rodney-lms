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

export { TestBuilder } from './TestBuilder';

// Export factories for direct use if needed
export { UserFactory } from './factories/user.factory';
export { ChatFactory } from './factories/chat.factory';
export { MessageFactory } from './factories/message.factory';
export { NotificationFactory } from './factories/notification.factory';

// Export helpers
export { AuthHelper } from './helpers/authHelper';
export { RequestHelper } from './helpers/requestHelper';
export { SocketHelper } from './helpers/socketHelper';

// Export base factory for extension
export { BaseFactory } from './factories/base.factory';

// Export types from factories
export type { FactoryOptions, TraitDefinition, StateDefinition } from './factories/base.factory';
export type { UserDocument, UserWithToken } from './factories/user.factory';
export type { ChatDocument, ChatParticipant } from './factories/chat.factory';
export type { MessageDocument, MessageSender, MessageChat } from './factories/message.factory';
export type { NotificationDocument, NotificationReceiver } from './factories/notification.factory';

// Export types from helpers
export type { TokenUser, TokenPayload } from './helpers/authHelper';
export type { RequestOptions } from './helpers/requestHelper';
export type { SocketEvent, SocketOptions } from './helpers/socketHelper';