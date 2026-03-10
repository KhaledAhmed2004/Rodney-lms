/**
 * Email Handler - Pre-built handler for email jobs
 *
 * Integrates with EmailBuilder to send emails in background.
 *
 * @example
 * ```typescript
 * // Dispatch email job
 * await new JobBuilder()
 *   .name('email')
 *   .payload({
 *     to: 'user@example.com',
 *     template: 'welcome',
 *     variables: { name: 'John' },
 *   })
 *   .dispatch();
 * ```
 *
 * @module JobBuilder/handlers/email
 */

import { EmailBuilder } from '../../EmailBuilder';
import { IJob } from '../types';

// ==================== INTERFACES ====================

export interface IEmailJobPayload {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email template name (optional if using custom subject/html) */
  template?: string;
  /** Template variables */
  variables?: Record<string, any>;
  /** Custom email subject (overrides template) */
  subject?: string;
  /** Custom HTML content (overrides template) */
  html?: string;
  /** Theme name */
  theme?: string;
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
  /** Reply-to address */
  replyTo?: string;
}

export interface IEmailJobResult {
  sent: boolean;
  to: string | string[];
  template?: string;
  timestamp: Date;
}

// ==================== HANDLER ====================

/**
 * Email job handler
 *
 * Sends emails using EmailBuilder.
 */
export async function emailHandler(
  payload: IEmailJobPayload,
  job: IJob
): Promise<IEmailJobResult> {
  const builder = new EmailBuilder();

  // Set theme if provided
  if (payload.theme) {
    builder.setTheme(payload.theme);
  }

  // Use template or custom content
  if (payload.template) {
    builder.useTemplate(payload.template, payload.variables);
  } else if (payload.html) {
    if (payload.subject) {
      builder.setSubject(payload.subject);
    }
    builder.addHtml(payload.html);
  } else {
    throw new Error('Email job requires either template or html content');
  }

  // Send the email
  await builder.send(payload.to, {
    cc: payload.cc,
    bcc: payload.bcc,
    replyTo: payload.replyTo,
  });

  return {
    sent: true,
    to: payload.to,
    template: payload.template,
    timestamp: new Date(),
  };
}

export default emailHandler;
