/**
 * Notification Handler - Pre-built handler for notification jobs
 *
 * Integrates with NotificationBuilder to send multi-channel notifications.
 *
 * @example
 * ```typescript
 * // Dispatch notification job
 * await new JobBuilder()
 *   .name('notification')
 *   .payload({
 *     userId: '123',
 *     template: 'orderShipped',
 *     channels: ['push', 'email', 'database'],
 *     variables: { orderId: 'ORD-123' },
 *   })
 *   .dispatch();
 * ```
 *
 * @module JobBuilder/handlers/notification
 */

import { NotificationBuilder } from '../../NotificationBuilder';
import { IJob, INotificationResult } from '../types';

// ==================== INTERFACES ====================

export interface INotificationJobPayload {
  /** User ID to notify */
  userId?: string;
  /** Multiple user IDs */
  userIds?: string[];
  /** Target role (notify all users with this role) */
  role?: string;
  /** Template name */
  template?: string;
  /** Template variables */
  variables?: Record<string, any>;
  /** Custom title (if not using template) */
  title?: string;
  /** Custom text (if not using template) */
  text?: string;
  /** Notification type */
  type?: string;
  /** Channels to send through */
  channels?: ('push' | 'socket' | 'email' | 'database')[];
  /** Reference ID (links to related entity) */
  referenceId?: string;
  /** Additional data */
  data?: Record<string, any>;
}

export interface INotificationJobResult {
  success: boolean;
  sent: {
    push: number;
    socket: number;
    email: number;
    database: number;
  };
  failed: {
    push: string[];
    socket: string[];
    email: string[];
    database: string[];
  };
  timestamp: Date;
}

// ==================== HANDLER ====================

/**
 * Notification job handler
 *
 * Sends notifications using NotificationBuilder.
 */
export async function notificationHandler(
  payload: INotificationJobPayload,
  job: IJob
): Promise<INotificationJobResult> {
  const builder = new NotificationBuilder();

  // Set recipients
  if (payload.userId) {
    builder.to(payload.userId);
  } else if (payload.userIds && payload.userIds.length > 0) {
    builder.toMany(payload.userIds);
  } else if (payload.role) {
    builder.toRole(payload.role);
  } else {
    throw new Error('Notification job requires userId, userIds, or role');
  }

  // Set content
  if (payload.template) {
    builder.useTemplate(payload.template, payload.variables);
  } else {
    if (payload.title) {
      builder.setTitle(payload.title);
    }
    if (payload.text) {
      builder.setText(payload.text);
    }
    if (payload.type) {
      builder.setType(payload.type as any);
    }
  }

  // Set reference and data
  if (payload.referenceId) {
    builder.setReference(payload.referenceId);
  }
  if (payload.data) {
    builder.setData(payload.data);
  }

  // Set channels
  if (payload.channels && payload.channels.length > 0) {
    for (const channel of payload.channels) {
      switch (channel) {
        case 'push':
          builder.viaPush();
          break;
        case 'socket':
          builder.viaSocket();
          break;
        case 'email':
          builder.viaEmail();
          break;
        case 'database':
          builder.viaDatabase();
          break;
      }
    }
  } else {
    // Default to all channels
    builder.viaAll();
  }

  // Send notification
  const result = await builder.send();

  return {
    success: result.success,
    sent: result.sent,
    failed: result.failed,
    timestamp: new Date(),
  };
}

export default notificationHandler;
