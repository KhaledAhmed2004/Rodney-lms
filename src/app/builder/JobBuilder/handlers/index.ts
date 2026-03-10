/**
 * Pre-built Job Handlers
 *
 * These handlers integrate JobBuilder with other builders.
 * They are automatically registered when JobBuilder module is imported.
 *
 * @module JobBuilder/handlers
 */

import { JobBuilder } from '../JobBuilder';
import { emailHandler } from './email.handler';
import { notificationHandler } from './notification.handler';
import { pdfHandler } from './pdf.handler';

// ==================== HANDLER REGISTRATION ====================

/**
 * Register all pre-built handlers
 *
 * Call this to register email, notification, and pdf handlers.
 */
export function registerBuiltInHandlers(): void {
  // Email handler
  JobBuilder.registerHandler('email', emailHandler);

  // Notification handler
  JobBuilder.registerHandler('notification', notificationHandler);

  // PDF handler
  JobBuilder.registerHandler('pdf', pdfHandler);
}

// ==================== EXPORTS ====================

export { emailHandler } from './email.handler';
export { notificationHandler } from './notification.handler';
export { pdfHandler } from './pdf.handler';

export type { IEmailJobPayload, IEmailJobResult } from './email.handler';
export type { INotificationJobPayload, INotificationJobResult } from './notification.handler';
export type { IPdfJobPayload, IPdfJobResult } from './pdf.handler';

export default {
  registerBuiltInHandlers,
  emailHandler,
  notificationHandler,
  pdfHandler,
};
