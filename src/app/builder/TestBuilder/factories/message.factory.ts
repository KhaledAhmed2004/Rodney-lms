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

import { faker } from '@faker-js/faker';
import { Types, Document } from 'mongoose';
import { Message } from '../../../modules/message/message.model';
import { IMessage, IMessageAttachment, AttachmentType } from '../../../modules/message/message.interface';
import { BaseFactory } from './base.factory';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export type MessageDocument = Document & IMessage;

export interface MessageSender {
  _id: Types.ObjectId | string;
}

export interface MessageChat {
  _id: Types.ObjectId | string;
}

// ════════════════════════════════════════════════════════════
// MESSAGE FACTORY CLASS
// ════════════════════════════════════════════════════════════

export class MessageFactory extends BaseFactory<MessageDocument, IMessage> {
  protected static traits = new Map();
  protected static states = new Map();

  constructor() {
    super(Message);
  }

  // ════════════════════════════════════════════════════════════
  // DEFAULT VALUES
  // ════════════════════════════════════════════════════════════

  protected getDefaults(): Partial<IMessage> {
    return {
      text: faker.lorem.sentence(),
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
  inChat(chat: MessageChat | Types.ObjectId | string): this {
    return this.set('chatId', this.toObjectId(chat) as any);
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
  from(user: MessageSender | Types.ObjectId | string): this {
    return this.set('sender', this.toObjectId(user) as any);
  }

  // ════════════════════════════════════════════════════════════
  // CONTENT METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set message text
   */
  withText(text: string): this {
    return this.set('text', text).set('type', 'text');
  }

  /**
   * Create an image message
   */
  asImage(url?: string): this {
    const imageUrl = url || faker.image.url();
    const attachment: IMessageAttachment = {
      type: 'image',
      url: imageUrl,
      name: faker.system.fileName({ extensionCount: 1 }),
      mime: 'image/jpeg',
      width: faker.number.int({ min: 200, max: 1920 }),
      height: faker.number.int({ min: 200, max: 1080 }),
    };

    return this.set('type', 'image')
      .set('text', '')
      .set('attachments', [attachment] as any);
  }

  /**
   * Create a video message
   */
  asVideo(url?: string): this {
    const videoUrl = url || faker.internet.url();
    const attachment: IMessageAttachment = {
      type: 'video',
      url: videoUrl,
      name: faker.system.fileName({ extensionCount: 1 }),
      mime: 'video/mp4',
      duration: faker.number.int({ min: 5, max: 300 }),
    };

    return this.set('type', 'media')
      .set('text', '')
      .set('attachments', [attachment] as any);
  }

  /**
   * Create an audio message
   */
  asAudio(url?: string): this {
    const audioUrl = url || faker.internet.url();
    const attachment: IMessageAttachment = {
      type: 'audio',
      url: audioUrl,
      name: faker.system.fileName({ extensionCount: 1 }),
      mime: 'audio/mp3',
      duration: faker.number.int({ min: 5, max: 180 }),
    };

    return this.set('type', 'media')
      .set('text', '')
      .set('attachments', [attachment] as any);
  }

  /**
   * Create a file/document message
   */
  asFile(url?: string): this {
    const fileUrl = url || faker.internet.url();
    const attachment: IMessageAttachment = {
      type: 'file',
      url: fileUrl,
      name: faker.system.fileName(),
      mime: 'application/pdf',
      size: faker.number.int({ min: 1024, max: 10485760 }), // 1KB - 10MB
    };

    return this.set('type', 'doc')
      .set('text', '')
      .set('attachments', [attachment] as any);
  }

  /**
   * Create a mixed message (text + attachments)
   */
  asMixed(text: string, attachments: IMessageAttachment[]): this {
    return this.set('type', 'mixed')
      .set('text', text)
      .set('attachments', attachments as any);
  }

  /**
   * Add an attachment to the message
   */
  withAttachment(attachment: IMessageAttachment): this {
    const current = (this.data.attachments || []) as IMessageAttachment[];
    return this.set('attachments', [...current, attachment] as any);
  }

  // ════════════════════════════════════════════════════════════
  // STATUS METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Mark as sent
   */
  sent(): this {
    return this.set('status', 'sent');
  }

  /**
   * Mark as delivered to specific users
   */
  deliveredTo(users: (MessageSender | Types.ObjectId | string)[]): this {
    const ids = users.map((u) => this.toObjectId(u));
    return this.set('deliveredTo', ids as any).set('status', 'delivered');
  }

  /**
   * Mark as read by specific users
   */
  readBy(users: (MessageSender | Types.ObjectId | string)[]): this {
    const ids = users.map((u) => this.toObjectId(u));
    return this.set('readBy', ids as any).set('status', 'seen');
  }

  /**
   * Mark as edited
   */
  edited(at?: Date): this {
    return this.set('editedAt', at || new Date());
  }

  // ════════════════════════════════════════════════════════════
  // REPLY METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Create a reply to another message
   * Note: This creates metadata, actual reply logic depends on your schema
   */
  replyingTo(message: MessageDocument | { _id: Types.ObjectId | string }): this {
    // Store reply reference in transient data
    this.withTransient('replyTo', this.toObjectId(message as any));
    return this;
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

MessageFactory.defineTrait<IMessage>('text', (data) => ({
  ...data,
  type: 'text',
}));

MessageFactory.defineTrait<IMessage>('image', (data) => ({
  ...data,
  type: 'image',
  text: '',
  attachments: [
    {
      type: 'image' as AttachmentType,
      url: faker.image.url(),
      name: 'image.jpg',
      mime: 'image/jpeg',
    },
  ],
}));

MessageFactory.defineTrait<IMessage>('file', (data) => ({
  ...data,
  type: 'doc',
  text: '',
  attachments: [
    {
      type: 'file' as AttachmentType,
      url: faker.internet.url(),
      name: 'document.pdf',
      mime: 'application/pdf',
    },
  ],
}));

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════

MessageFactory.defineState<IMessage>('sent', (data) => ({
  ...data,
  status: 'sent',
}));

MessageFactory.defineState<IMessage>('delivered', (data) => ({
  ...data,
  status: 'delivered',
}));

MessageFactory.defineState<IMessage>('seen', (data) => ({
  ...data,
  status: 'seen',
}));
