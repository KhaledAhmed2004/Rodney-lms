/**
 * ChatFactory - Factory for creating test chat/conversations
 *
 * @example
 * const chat = await TestBuilder.chat().between(user1, user2).create();
 * const groupChat = await TestBuilder.chat().withParticipants([u1, u2, u3]).create();
 */

import { faker } from '@faker-js/faker';
import { Types, Document } from 'mongoose';
import { Chat } from '../../../modules/chat/chat.model';
import { IChat } from '../../../modules/chat/chat.interface';
import { BaseFactory } from './base.factory';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export type ChatDocument = Document & IChat;

export interface ChatParticipant {
  _id: Types.ObjectId | string;
}

// ════════════════════════════════════════════════════════════
// CHAT FACTORY CLASS
// ════════════════════════════════════════════════════════════

export class ChatFactory extends BaseFactory<ChatDocument, IChat> {
  protected static traits = new Map();
  protected static states = new Map();

  constructor() {
    super(Chat);
  }

  // ════════════════════════════════════════════════════════════
  // DEFAULT VALUES
  // ════════════════════════════════════════════════════════════

  protected getDefaults(): Partial<IChat> {
    return {
      participants: [] as any,
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
  between(user1: ChatParticipant, user2: ChatParticipant): this {
    const id1 = this.toObjectId(user1);
    const id2 = this.toObjectId(user2);

    return this.set('participants', [id1, id2] as any);
  }

  /**
   * Create chat with multiple participants
   *
   * @example
   * const groupChat = await TestBuilder.chat()
   *   .withParticipants([user1, user2, user3])
   *   .create();
   */
  withParticipants(users: ChatParticipant[]): this {
    const ids = users.map((u) => this.toObjectId(u));
    return this.set('participants', ids as any);
  }

  /**
   * Add a participant to existing participants
   */
  addParticipant(user: ChatParticipant): this {
    const current = (this.data.participants || []) as Types.ObjectId[];
    const newId = this.toObjectId(user);

    if (!current.some((id) => id.equals(newId))) {
      return this.set('participants', [...current, newId] as any);
    }

    return this;
  }

  // ════════════════════════════════════════════════════════════
  // STATUS METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set chat as active
   */
  active(): this {
    return this.set('status', true);
  }

  /**
   * Set chat as inactive/archived
   */
  inactive(): this {
    return this.set('status', false);
  }

  /**
   * Alias for inactive
   */
  archived(): this {
    return this.inactive();
  }

  // ════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Convert user/id to ObjectId
   */
  private toObjectId(user: ChatParticipant | Types.ObjectId | string): Types.ObjectId {
    if (user instanceof Types.ObjectId) {
      return user;
    }

    if (typeof user === 'string') {
      return new Types.ObjectId(user);
    }

    if (typeof user._id === 'string') {
      return new Types.ObjectId(user._id);
    }

    return user._id as Types.ObjectId;
  }
}

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════

ChatFactory.defineTrait<IChat>('active', (data) => ({
  ...data,
  status: true,
}));

ChatFactory.defineTrait<IChat>('inactive', (data) => ({
  ...data,
  status: false,
}));
