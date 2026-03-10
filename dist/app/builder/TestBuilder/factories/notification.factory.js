"use strict";
/**
 * NotificationFactory - Factory for creating test notifications
 *
 * @example
 * const notification = await TestBuilder.notification()
 *   .forUser(user)
 *   .withTitle('New message!')
 *   .create();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationFactory = void 0;
const faker_1 = require("@faker-js/faker");
const mongoose_1 = require("mongoose");
const notification_model_1 = require("../../../modules/notification/notification.model");
const base_factory_1 = require("./base.factory");
// ════════════════════════════════════════════════════════════
// NOTIFICATION FACTORY CLASS
// ════════════════════════════════════════════════════════════
class NotificationFactory extends base_factory_1.BaseFactory {
    constructor() {
        super(notification_model_1.Notification);
    }
    // ════════════════════════════════════════════════════════════
    // DEFAULT VALUES
    // ════════════════════════════════════════════════════════════
    getDefaults() {
        return {
            title: faker_1.faker.lorem.sentence({ min: 3, max: 6 }),
            text: faker_1.faker.lorem.sentence(),
            isRead: false,
            type: 'SYSTEM',
        };
    }
    // ════════════════════════════════════════════════════════════
    // REQUIRED RELATIONS
    // ════════════════════════════════════════════════════════════
    /**
     * Set the notification receiver (REQUIRED)
     */
    forUser(user) {
        return this.set('receiver', this.toObjectId(user));
    }
    /**
     * Alias for forUser
     */
    to(user) {
        return this.forUser(user);
    }
    /**
     * Set reference ID (e.g., related bid, task, etc.)
     */
    withReference(reference) {
        return this.set('referenceId', this.toObjectId(reference));
    }
    // ════════════════════════════════════════════════════════════
    // CONTENT METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set notification title
     */
    withTitle(title) {
        return this.set('title', title);
    }
    /**
     * Set notification text/body
     */
    withText(text) {
        return this.set('text', text);
    }
    /**
     * Set both title and text
     */
    withContent(title, text) {
        return this.withTitle(title).withText(text);
    }
    // ════════════════════════════════════════════════════════════
    // TYPE METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set notification type
     */
    ofType(type) {
        return this.set('type', type);
    }
    /**
     * Admin notification
     */
    asAdmin() {
        return this.set('type', 'ADMIN');
    }
    /**
     * Bid-related notification
     */
    asBid() {
        return this.set('type', 'BID');
    }
    /**
     * Bid accepted notification
     */
    asBidAccepted() {
        return this.set('type', 'BID_ACCEPTED')
            .withTitle('Bid Accepted!')
            .withText('Your bid has been accepted');
    }
    /**
     * Booking notification
     */
    asBooking() {
        return this.set('type', 'BOOKING');
    }
    /**
     * Task-related notification
     */
    asTask() {
        return this.set('type', 'TASK');
    }
    /**
     * System notification
     */
    asSystem() {
        return this.set('type', 'SYSTEM');
    }
    /**
     * Delivery submitted notification
     */
    asDeliverySubmitted() {
        return this.set('type', 'DELIVERY_SUBMITTED')
            .withTitle('Delivery Submitted')
            .withText('A delivery has been submitted for your task');
    }
    /**
     * Payment pending notification
     */
    asPaymentPending() {
        return this.set('type', 'PAYMENT_PENDING')
            .withTitle('Payment Pending')
            .withText('Your payment is being processed');
    }
    // ════════════════════════════════════════════════════════════
    // STATUS METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Mark as read
     */
    read() {
        return this.set('isRead', true);
    }
    /**
     * Mark as unread
     */
    unread() {
        return this.set('isRead', false);
    }
    // ════════════════════════════════════════════════════════════
    // COMPOSITE METHODS (Common Scenarios)
    // ════════════════════════════════════════════════════════════
    /**
     * Create a new message notification
     */
    newMessage(senderName) {
        const name = senderName || faker_1.faker.person.fullName();
        return this.asSystem()
            .withTitle('New Message')
            .withText(`You have a new message from ${name}`);
    }
    /**
     * Create a bid notification
     */
    newBid(amount) {
        const bidAmount = amount || faker_1.faker.number.int({ min: 1000, max: 50000 });
        return this.asBid()
            .withTitle('New Bid Received')
            .withText(`Someone placed a bid of $${bidAmount / 100} on your task`);
    }
    /**
     * Create a payment received notification
     */
    paymentReceived(amount) {
        const paymentAmount = amount || faker_1.faker.number.int({ min: 1000, max: 50000 });
        return this.asSystem()
            .withTitle('Payment Received')
            .withText(`You received a payment of $${paymentAmount / 100}`);
    }
    /**
     * Create a task completed notification
     */
    taskCompleted() {
        return this.asTask()
            .withTitle('Task Completed')
            .withText('Your task has been marked as completed');
    }
    /**
     * Create a welcome notification for new users
     */
    welcome() {
        return this.asSystem()
            .withTitle('Welcome!')
            .withText('Welcome to our platform. Start exploring tasks now!');
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
exports.NotificationFactory = NotificationFactory;
NotificationFactory.traits = new Map();
NotificationFactory.states = new Map();
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════
NotificationFactory.defineTrait('read', (data) => (Object.assign(Object.assign({}, data), { isRead: true })));
NotificationFactory.defineTrait('unread', (data) => (Object.assign(Object.assign({}, data), { isRead: false })));
NotificationFactory.defineTrait('system', (data) => (Object.assign(Object.assign({}, data), { type: 'SYSTEM' })));
NotificationFactory.defineTrait('bid', (data) => (Object.assign(Object.assign({}, data), { type: 'BID' })));
NotificationFactory.defineTrait('task', (data) => (Object.assign(Object.assign({}, data), { type: 'TASK' })));
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════
NotificationFactory.defineState('read', (data) => (Object.assign(Object.assign({}, data), { isRead: true })));
NotificationFactory.defineState('unread', (data) => (Object.assign(Object.assign({}, data), { isRead: false })));
