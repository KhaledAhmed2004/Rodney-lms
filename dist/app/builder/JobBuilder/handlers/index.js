"use strict";
/**
 * Pre-built Job Handlers
 *
 * These handlers integrate JobBuilder with other builders.
 * They are automatically registered when JobBuilder module is imported.
 *
 * @module JobBuilder/handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfHandler = exports.notificationHandler = exports.emailHandler = void 0;
exports.registerBuiltInHandlers = registerBuiltInHandlers;
const JobBuilder_1 = require("../JobBuilder");
const email_handler_1 = require("./email.handler");
const notification_handler_1 = require("./notification.handler");
const pdf_handler_1 = require("./pdf.handler");
// ==================== HANDLER REGISTRATION ====================
/**
 * Register all pre-built handlers
 *
 * Call this to register email, notification, and pdf handlers.
 */
function registerBuiltInHandlers() {
    // Email handler
    JobBuilder_1.JobBuilder.registerHandler('email', email_handler_1.emailHandler);
    // Notification handler
    JobBuilder_1.JobBuilder.registerHandler('notification', notification_handler_1.notificationHandler);
    // PDF handler
    JobBuilder_1.JobBuilder.registerHandler('pdf', pdf_handler_1.pdfHandler);
}
// ==================== EXPORTS ====================
var email_handler_2 = require("./email.handler");
Object.defineProperty(exports, "emailHandler", { enumerable: true, get: function () { return email_handler_2.emailHandler; } });
var notification_handler_2 = require("./notification.handler");
Object.defineProperty(exports, "notificationHandler", { enumerable: true, get: function () { return notification_handler_2.notificationHandler; } });
var pdf_handler_2 = require("./pdf.handler");
Object.defineProperty(exports, "pdfHandler", { enumerable: true, get: function () { return pdf_handler_2.pdfHandler; } });
exports.default = {
    registerBuiltInHandlers,
    emailHandler: email_handler_1.emailHandler,
    notificationHandler: notification_handler_1.notificationHandler,
    pdfHandler: pdf_handler_1.pdfHandler,
};
