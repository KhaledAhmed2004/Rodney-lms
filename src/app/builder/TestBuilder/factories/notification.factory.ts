/**
 * NotificationFactory - Factory for creating test notifications
 *
 * @example
 * const notification = await TestBuilder.notification()
 *   .forUser(user)
 *   .withTitle('New message!')
 *   .create();
 */

import { faker } from '@faker-js/faker';
import { Types, Document } from 'mongoose';
import { Notification } from '../../../modules/notification/notification.model';
import { INotification, NotificationType } from '../../../modules/notification/notification.interface';
import { BaseFactory } from './base.factory';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export type NotificationDocument = Document & INotification;

export interface NotificationReceiver {
  _id: Types.ObjectId | string;
}

// ════════════════════════════════════════════════════════════
// NOTIFICATION FACTORY CLASS
// ════════════════════════════════════════════════════════════

export class NotificationFactory extends BaseFactory<NotificationDocument, INotification> {
  protected static traits = new Map();
  protected static states = new Map();

  constructor() {
    super(Notification);
  }

  // ════════════════════════════════════════════════════════════
  // DEFAULT VALUES
  // ════════════════════════════════════════════════════════════

  protected getDefaults(): Partial<INotification> {
    return {
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      text: faker.lorem.sentence(),
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
  forUser(user: NotificationReceiver | Types.ObjectId | string): this {
    return this.set('receiver', this.toObjectId(user) as any);
  }

  /**
   * Alias for forUser
   */
  to(user: NotificationReceiver | Types.ObjectId | string): this {
    return this.forUser(user);
  }

  /**
   * Set reference ID (e.g., related bid, task, etc.)
   */
  withReference(reference: { _id: Types.ObjectId | string } | Types.ObjectId | string): this {
    return this.set('referenceId', this.toObjectId(reference) as any);
  }

  // ════════════════════════════════════════════════════════════
  // CONTENT METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set notification title
   */
  withTitle(title: string): this {
    return this.set('title', title);
  }

  /**
   * Set notification text/body
   */
  withText(text: string): this {
    return this.set('text', text);
  }

  /**
   * Set both title and text
   */
  withContent(title: string, text: string): this {
    return this.withTitle(title).withText(text);
  }

  // ════════════════════════════════════════════════════════════
  // TYPE METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set notification type
   */
  ofType(type: NotificationType): this {
    return this.set('type', type);
  }

  /**
   * Admin notification
   */
  asAdmin(): this {
    return this.set('type', 'ADMIN');
  }

  /**
   * Bid-related notification
   */
  asBid(): this {
    return this.set('type', 'BID');
  }

  /**
   * Bid accepted notification
   */
  asBidAccepted(): this {
    return this.set('type', 'BID_ACCEPTED')
      .withTitle('Bid Accepted!')
      .withText('Your bid has been accepted');
  }

  /**
   * Booking notification
   */
  asBooking(): this {
    return this.set('type', 'BOOKING');
  }

  /**
   * Task-related notification
   */
  asTask(): this {
    return this.set('type', 'TASK');
  }

  /**
   * System notification
   */
  asSystem(): this {
    return this.set('type', 'SYSTEM');
  }

  /**
   * Delivery submitted notification
   */
  asDeliverySubmitted(): this {
    return this.set('type', 'DELIVERY_SUBMITTED')
      .withTitle('Delivery Submitted')
      .withText('A delivery has been submitted for your task');
  }

  /**
   * Payment pending notification
   */
  asPaymentPending(): this {
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
  read(): this {
    return this.set('isRead', true);
  }

  /**
   * Mark as unread
   */
  unread(): this {
    return this.set('isRead', false);
  }

  // ════════════════════════════════════════════════════════════
  // COMPOSITE METHODS (Common Scenarios)
  // ════════════════════════════════════════════════════════════

  /**
   * Create a new message notification
   */
  newMessage(senderName?: string): this {
    const name = senderName || faker.person.fullName();
    return this.asSystem()
      .withTitle('New Message')
      .withText(`You have a new message from ${name}`);
  }

  /**
   * Create a bid notification
   */
  newBid(amount?: number): this {
    const bidAmount = amount || faker.number.int({ min: 1000, max: 50000 });
    return this.asBid()
      .withTitle('New Bid Received')
      .withText(`Someone placed a bid of $${bidAmount / 100} on your task`);
  }

  /**
   * Create a payment received notification
   */
  paymentReceived(amount?: number): this {
    const paymentAmount = amount || faker.number.int({ min: 1000, max: 50000 });
    return this.asSystem()
      .withTitle('Payment Received')
      .withText(`You received a payment of $${paymentAmount / 100}`);
  }

  /**
   * Create a task completed notification
   */
  taskCompleted(): this {
    return this.asTask()
      .withTitle('Task Completed')
      .withText('Your task has been marked as completed');
  }

  /**
   * Create a welcome notification for new users
   */
  welcome(): this {
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
  private toObjectId(obj: { _id: Types.ObjectId | string } | Types.ObjectId | string): Types.ObjectId {
    if (obj instanceof Types.ObjectId) {
      return obj;
    }

    if (typeof obj === 'string') {
      return new Types.ObjectId(obj);
    }

    if (typeof obj._id === 'string') {
      return new Types.ObjectId(obj._id);
    }

    return obj._id as Types.ObjectId;
  }
}

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════

NotificationFactory.defineTrait<INotification>('read', (data) => ({
  ...data,
  isRead: true,
}));

NotificationFactory.defineTrait<INotification>('unread', (data) => ({
  ...data,
  isRead: false,
}));

NotificationFactory.defineTrait<INotification>('system', (data) => ({
  ...data,
  type: 'SYSTEM' as NotificationType,
}));

NotificationFactory.defineTrait<INotification>('bid', (data) => ({
  ...data,
  type: 'BID' as NotificationType,
}));

NotificationFactory.defineTrait<INotification>('task', (data) => ({
  ...data,
  type: 'TASK' as NotificationType,
}));

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════

NotificationFactory.defineState<INotification>('read', (data) => ({
  ...data,
  isRead: true,
}));

NotificationFactory.defineState<INotification>('unread', (data) => ({
  ...data,
  isRead: false,
}));
