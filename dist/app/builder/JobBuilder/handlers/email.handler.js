"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailHandler = emailHandler;
const EmailBuilder_1 = require("../../EmailBuilder");
// ==================== HANDLER ====================
/**
 * Email job handler
 *
 * Sends emails using EmailBuilder.
 */
function emailHandler(payload, job) {
    return __awaiter(this, void 0, void 0, function* () {
        const builder = new EmailBuilder_1.EmailBuilder();
        // Set theme if provided
        if (payload.theme) {
            builder.setTheme(payload.theme);
        }
        // Use template or custom content
        if (payload.template) {
            builder.useTemplate(payload.template, payload.variables);
        }
        else if (payload.html) {
            if (payload.subject) {
                builder.setSubject(payload.subject);
            }
            builder.addHtml(payload.html);
        }
        else {
            throw new Error('Email job requires either template or html content');
        }
        // Send the email
        yield builder.send(payload.to, {
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
    });
}
exports.default = emailHandler;
