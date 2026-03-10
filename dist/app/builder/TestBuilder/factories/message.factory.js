"use strict";
/**
 * MessageFactory - Factory for creating test messages
 *
 * @example
 * const msg = await TestBuilder.message()
 *   .inChat(chat)
 *   .from(user)
 *   .withText('Hello!')
 *   .create();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFactory = void 0;
const faker_1 = require("@faker-js/faker");
const mongoose_1 = require("mongoose");
const message_model_1 = require("../../../modules/message/message.model");
const base_factory_1 = require("./base.factory");
// ════════════════════════════════════════════════════════════
// MESSAGE FACTORY CLASS
// ════════════════════════════════════════════════════════════
class MessageFactory extends base_factory_1.BaseFactory {
    constructor() {
        super(message_model_1.Message);
    }
    // ════════════════════════════════════════════════════════════
    // DEFAULT VALUES
    // ════════════════════════════════════════════════════════════
    getDefaults() {
        return {
            text: faker_1.faker.lorem.sentence(),
            type: 'text',
            status: 'sent',
            attachments: [],
            deliveredTo: [],
            readBy: [],
        };
    }
    // ════════════════════════════════════════════════════════════
    // REQUIRED RELATIONS
    // ════════════════════════════════════════════════════════════
    /**
     * Set the chat this message belongs to (REQUIRED)
     *
     * @example
     * const msg = await TestBuilder.message()
     *   .inChat(chat)
     *   .from(user)
     *   .create();
     */
    inChat(chat) {
        return this.set('chatId', this.toObjectId(chat));
    }
    /**
     * Set the message sender (REQUIRED)
     *
     * @example
     * const msg = await TestBuilder.message()
     *   .inChat(chat)
     *   .from(sender)
     *   .create();
     */
    from(user) {
        return this.set('sender', this.toObjectId(user));
    }
    // ════════════════════════════════════════════════════════════
    // CONTENT METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set message text
     */
    withText(text) {
        return this.set('text', text).set('type', 'text');
    }
    /**
     * Create an image message
     */
    asImage(url) {
        const imageUrl = url || faker_1.faker.image.url();
        const attachment = {
            type: 'image',
            url: imageUrl,
            name: faker_1.faker.system.fileName({ extensionCount: 1 }),
            mime: 'image/jpeg',
            width: faker_1.faker.number.int({ min: 200, max: 1920 }),
            height: faker_1.faker.number.int({ min: 200, max: 1080 }),
        };
        return this.set('type', 'image')
            .set('text', '')
            .set('attachments', [attachment]);
    }
    /**
     * Create a video message
     */
    asVideo(url) {
        const videoUrl = url || faker_1.faker.internet.url();
        const attachment = {
            type: 'video',
            url: videoUrl,
            name: faker_1.faker.system.fileName({ extensionCount: 1 }),
            mime: 'video/mp4',
            duration: faker_1.faker.number.int({ min: 5, max: 300 }),
        };
        return this.set('type', 'media')
            .set('text', '')
            .set('attachments', [attachment]);
    }
    /**
     * Create an audio message
     */
    asAudio(url) {
        const audioUrl = url || faker_1.faker.internet.url();
        const attachment = {
            type: 'audio',
            url: audioUrl,
            name: faker_1.faker.system.fileName({ extensionCount: 1 }),
            mime: 'audio/mp3',
            duration: faker_1.faker.number.int({ min: 5, max: 180 }),
        };
        return this.set('type', 'media')
            .set('text', '')
            .set('attachments', [attachment]);
    }
    /**
     * Create a file/document message
     */
    asFile(url) {
        const fileUrl = url || faker_1.faker.internet.url();
        const attachment = {
            type: 'file',
            url: fileUrl,
            name: faker_1.faker.system.fileName(),
            mime: 'application/pdf',
            size: faker_1.faker.number.int({ min: 1024, max: 10485760 }), // 1KB - 10MB
        };
        return this.set('type', 'doc')
            .set('text', '')
            .set('attachments', [attachment]);
    }
    /**
     * Create a mixed message (text + attachments)
     */
    asMixed(text, attachments) {
        return this.set('type', 'mixed')
            .set('text', text)
            .set('attachments', attachments);
    }
    /**
     * Add an attachment to the message
     */
    withAttachment(attachment) {
        const current = (this.data.attachments || []);
        return this.set('attachments', [...current, attachment]);
    }
    // ════════════════════════════════════════════════════════════
    // STATUS METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Mark as sent
     */
    sent() {
        return this.set('status', 'sent');
    }
    /**
     * Mark as delivered to specific users
     */
    deliveredTo(users) {
        const ids = users.map((u) => this.toObjectId(u));
        return this.set('deliveredTo', ids).set('status', 'delivered');
    }
    /**
     * Mark as read by specific users
     */
    readBy(users) {
        const ids = users.map((u) => this.toObjectId(u));
        return this.set('readBy', ids).set('status', 'seen');
    }
    /**
     * Mark as edited
     */
    edited(at) {
        return this.set('editedAt', at || new Date());
    }
    // ════════════════════════════════════════════════════════════
    // REPLY METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Create a reply to another message
     * Note: This creates metadata, actual reply logic depends on your schema
     */
    replyingTo(message) {
        // Store reply reference in transient data
        this.withTransient('replyTo', this.toObjectId(message));
        return this;
    }
    // ════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Convert to ObjectId
     */
    toObjectId(obj) {
        if (obj instanceof mongoose_1.Types.ObjectId) {
            return obj;
        }
        if (typeof obj === 'string') {
            return new mongoose_1.Types.ObjectId(obj);
        }
        if (typeof obj._id === 'string') {
            return new mongoose_1.Types.ObjectId(obj._id);
        }
        return obj._id;
    }
}
exports.MessageFactory = MessageFactory;
MessageFactory.traits = new Map();
MessageFactory.states = new Map();
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════
MessageFactory.defineTrait('text', (data) => (Object.assign(Object.assign({}, data), { type: 'text' })));
MessageFactory.defineTrait('image', (data) => (Object.assign(Object.assign({}, data), { type: 'image', text: '', attachments: [
        {
            type: 'image',
            url: faker_1.faker.image.url(),
            name: 'image.jpg',
            mime: 'image/jpeg',
        },
    ] })));
MessageFactory.defineTrait('file', (data) => (Object.assign(Object.assign({}, data), { type: 'doc', text: '', attachments: [
        {
            type: 'file',
            url: faker_1.faker.internet.url(),
            name: 'document.pdf',
            mime: 'application/pdf',
        },
    ] })));
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════
MessageFactory.defineState('sent', (data) => (Object.assign(Object.assign({}, data), { status: 'sent' })));
MessageFactory.defineState('delivered', (data) => (Object.assign(Object.assign({}, data), { status: 'delivered' })));
MessageFactory.defineState('seen', (data) => (Object.assign(Object.assign({}, data), { status: 'seen' })));
