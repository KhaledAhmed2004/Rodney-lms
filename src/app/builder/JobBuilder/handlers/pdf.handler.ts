/**
 * PDF Handler - Pre-built handler for PDF generation jobs
 *
 * Integrates with PDFBuilder to generate PDFs in background.
 *
 * @example
 * ```typescript
 * // Dispatch PDF job
 * await new JobBuilder()
 *   .name('pdf')
 *   .payload({
 *     template: 'invoice',
 *     data: { orderId: 'ORD-123', items: [...] },
 *     filename: 'invoice-ORD-123.pdf',
 *   })
 *   .dispatch();
 * ```
 *
 * @module JobBuilder/handlers/pdf
 */

import PDFBuilder from '../../PDFBuilder';
import { IJob } from '../types';

// ==================== INTERFACES ====================

export interface IPdfJobPayload {
  /** Template name or HTML content */
  template?: string;
  /** Custom HTML content (if not using template) */
  html?: string;
  /** Data to pass to template */
  data?: Record<string, any>;
  /** Output filename */
  filename?: string;
  /** Save path (relative to public/uploads) */
  saveTo?: string;
  /** Page format */
  format?: 'A4' | 'Letter' | 'Legal';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Page margins */
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Return base64 instead of buffer */
  returnBase64?: boolean;
}

export interface IPdfJobResult {
  generated: boolean;
  filename?: string;
  savedTo?: string;
  size?: number;
  base64?: string;
  timestamp: Date;
}

// ==================== HANDLER ====================

/**
 * PDF job handler
 *
 * Generates PDFs using PDFBuilder.
 */
export async function pdfHandler(
  payload: IPdfJobPayload,
  job: IJob
): Promise<IPdfJobResult> {
  const builder = new PDFBuilder();

  // Set format and orientation
  if (payload.format) {
    builder.setFormat(payload.format);
  }
  if (payload.orientation) {
    builder.setOrientation(payload.orientation);
  }

  // Set margins if provided
  if (payload.margins) {
    builder.setMargins(payload.margins);
  }

  // Use template or custom HTML
  if (payload.template) {
    builder.useTemplate(payload.template, payload.data);
  } else if (payload.html) {
    builder.setHtml(payload.html);
    if (payload.data) {
      builder.setVariables(payload.data);
    }
  } else {
    throw new Error('PDF job requires either template or html content');
  }

  // Generate PDF
  const buffer = await builder.build();

  const result: IPdfJobResult = {
    generated: true,
    size: buffer.length,
    timestamp: new Date(),
  };

  // Save to file if path provided
  if (payload.saveTo) {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    const fullPath = path.join(
      process.cwd(),
      'public',
      'uploads',
      payload.saveTo
    );

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    result.savedTo = payload.saveTo;
    result.filename = path.basename(fullPath);
  }

  // Return base64 if requested
  if (payload.returnBase64) {
    result.base64 = buffer.toString('base64');
  }

  return result;
}

export default pdfHandler;
