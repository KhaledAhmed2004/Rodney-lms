"use strict";
/**
 * ChatFactory - Factory for creating test chat/conversations
 *
 * @example
 * const chat = await TestBuilder.chat().between(user1, user2).create();
 * const groupChat = await TestBuilder.chat().withParticipants([u1, u2, u3]).create();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatFactory = void 0;
const mongoose_1 = require("mongoose");
const chat_model_1 = require("../../../modules/chat/chat.model");
const base_factory_1 = require("./base.factory");
// ════════════════════════════════════════════════════════════
// CHAT FACTORY CLASS
// ════════════════════════════════════════════════════════════
class ChatFactory extends base_factory_1.BaseFactory {
    constructor() {
        super(chat_model_1.Chat);
    }
    // ════════════════════════════════════════════════════════════
    // DEFAULT VALUES
    // ════════════════════════════════════════════════════════════
    getDefaults() {
        return {
            participants: [],
            status: true,
        };
    }
    // ════════════════════════════════════════════════════════════
    // PARTICIPANT METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Create chat between exactly two users
     *
     * @example
     * const chat = await TestBuilder.chat()
     *   .between(buyer, seller)
     *   .create();
     */
    between(user1, user2) {
        const id1 = this.toObjectId(user1);
        const id2 = this.toObjectId(user2);
        return this.set('participants', [id1, id2]);
    }
    /**
     * Create chat with multiple participants
     *
     * @example
     * const groupChat = await TestBuilder.chat()
     *   .withParticipants([user1, user2, user3])
     *   .create();
     */
    withParticipants(users) {
        const ids = users.map((u) => this.toObjectId(u));
        return this.set('participants', ids);
    }
    /**
     * Add a participant to existing participants
     */
    addParticipant(user) {
        const current = (this.data.participants || []);
        const newId = this.toObjectId(user);
        if (!current.some((id) => id.equals(newId))) {
            return this.set('participants', [...current, newId]);
        }
        return this;
    }
    // ════════════════════════════════════════════════════════════
    // STATUS METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set chat as active
     */
    active() {
        return this.set('status', true);
    }
    /**
     * Set chat as inactive/archived
     */
    inactive() {
        return this.set('status', false);
    }
    /**
     * Alias for inactive
     */
    archived() {
        return this.inactive();
    }
    // ════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Convert user/id to ObjectId
     */
    toObjectId(user) {
        if (user instanceof mongoose_1.Types.ObjectId) {
            return user;
        }
        if (typeof user === 'string') {
            return new mongoose_1.Types.ObjectId(user);
        }
        if (typeof user._id === 'string') {
            return new mongoose_1.Types.ObjectId(user._id);
        }
        return user._id;
    }
}
exports.ChatFactory = ChatFactory;
ChatFactory.traits = new Map();
ChatFactory.states = new Map();
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════
ChatFactory.defineTrait('active', (data) => (Object.assign(Object.assign({}, data), { status: true })));
ChatFactory.defineTrait('inactive', (data) => (Object.assign(Object.assign({}, data), { status: false })));
