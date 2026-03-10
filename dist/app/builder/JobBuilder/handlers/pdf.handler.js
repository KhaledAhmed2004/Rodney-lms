"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfHandler = pdfHandler;
const PDFBuilder_1 = __importDefault(require("../../PDFBuilder"));
// ==================== HANDLER ====================
/**
 * PDF job handler
 *
 * Generates PDFs using PDFBuilder.
 */
function pdfHandler(payload, job) {
    return __awaiter(this, void 0, void 0, function* () {
        const builder = new PDFBuilder_1.default();
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
        }
        else if (payload.html) {
            builder.setHtml(payload.html);
            if (payload.data) {
                builder.setVariables(payload.data);
            }
        }
        else {
            throw new Error('PDF job requires either template or html content');
        }
        // Generate PDF
        const buffer = yield builder.build();
        const result = {
            generated: true,
            size: buffer.length,
            timestamp: new Date(),
        };
        // Save to file if path provided
        if (payload.saveTo) {
            const fs = yield Promise.resolve().then(() => __importStar(require('fs'))).then(m => m.promises);
            const path = yield Promise.resolve().then(() => __importStar(require('path')));
            const fullPath = path.join(process.cwd(), 'public', 'uploads', payload.saveTo);
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            yield fs.mkdir(dir, { recursive: true });
            // Write file
            yield fs.writeFile(fullPath, buffer);
            result.savedTo = payload.saveTo;
            result.filename = path.basename(fullPath);
        }
        // Return base64 if requested
        if (payload.returnBase64) {
            result.base64 = buffer.toString('base64');
        }
        return result;
    });
}
exports.default = pdfHandler;
