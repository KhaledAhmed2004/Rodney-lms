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
import * as templates from '../../../../shared/pdfTemplates';

// ==================== INTERFACES ====================

export interface IPdfJobPayload {
  /** Template name (e.g., 'invoice', 'receipt', 'report') */
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
  format?: any; // Using any for compatibility with PaperFormat
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Page margins */
  margins?: {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
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
  let builder: PDFBuilder;

  // Use template or start with fresh builder
  if (payload.template) {
    switch (payload.template.toLowerCase()) {
      case 'invoice':
        builder = templates.invoiceTemplate(payload.data as any);
        break;
      case 'receipt':
        builder = templates.receiptTemplate(payload.data as any);
        break;
      case 'report':
        builder = templates.reportTemplate(payload.data as any);
        break;
      case 'quotation':
        builder = templates.quotationTemplate(payload.data as any);
        break;
      case 'order-confirmation':
        builder = templates.orderConfirmationTemplate(payload.data as any);
        break;
      case 'payslip':
        builder = templates.payslipTemplate(payload.data as any);
        break;
      case 'certificate':
        builder = templates.certificateTemplate(payload.data as any);
        break;
      default:
        // Fallback to simple document or generic builder
        builder = new PDFBuilder();
        if (payload.html) {
          builder.addHTML(payload.html);
        }
    }
  } else if (payload.html) {
    builder = new PDFBuilder();
    builder.addHTML(payload.html);
  } else {
    throw new Error('PDF job requires either template or html content');
  }

  // Override format and orientation if provided
  if (payload.format) {
    builder.setPageSize(payload.format);
  }
  if (payload.orientation) {
    builder.setOrientation(payload.orientation);
  }

  // Set margins if provided
  if (payload.margins) {
    const margins: any = {};
    if (payload.margins.top) margins.top = Number(payload.margins.top);
    if (payload.margins.right) margins.right = Number(payload.margins.right);
    if (payload.margins.bottom) margins.bottom = Number(payload.margins.bottom);
    if (payload.margins.left) margins.left = Number(payload.margins.left);
    builder.setMargins(margins);
  }

  // Generate PDF
  const buffer = await builder.toBuffer();

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
