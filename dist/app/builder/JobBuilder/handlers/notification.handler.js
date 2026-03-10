"use strict";
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
exports.notificationHandler = notificationHandler;
const NotificationBuilder_1 = require("../../NotificationBuilder");
// ==================== HANDLER ====================
/**
 * Notification job handler
 *
 * Sends notifications using NotificationBuilder.
 */
function notificationHandler(payload, job) {
    return __awaiter(this, void 0, void 0, function* () {
        const builder = new NotificationBuilder_1.NotificationBuilder();
        // Set recipients
        if (payload.userId) {
            builder.to(payload.userId);
        }
        else if (payload.userIds && payload.userIds.length > 0) {
            builder.toMany(payload.userIds);
        }
        else if (payload.role) {
            builder.toRole(payload.role);
        }
        else {
            throw new Error('Notification job requires userId, userIds, or role');
        }
        // Set content
        if (payload.template) {
            builder.useTemplate(payload.template, payload.variables);
        }
        else {
            if (payload.title) {
                builder.setTitle(payload.title);
            }
            if (payload.text) {
                builder.setText(payload.text);
            }
            if (payload.type) {
                builder.setType(payload.type);
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
        }
        else {
            // Default to all channels
            builder.viaAll();
        }
        // Send notification
        const result = yield builder.send();
        return {
            success: result.success,
            sent: result.sent,
            failed: result.failed,
            timestamp: new Date(),
        };
    });
}
exports.default = notificationHandler;
