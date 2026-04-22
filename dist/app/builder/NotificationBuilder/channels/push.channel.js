"use strict";
/**
 * Push Channel - Firebase Cloud Messaging
 *
 * Sends push notifications via Firebase FCM to user devices.
 * Uses the existing pushNotificationHelper internally.
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
exports.sendPush = void 0;
const pushNotificationHelper_1 = require("../../../modules/notification/pushNotificationHelper");
/**
 * Send push notifications to users via Firebase FCM
 */
const sendPush = (users, content) => __awaiter(void 0, void 0, void 0, function* () {
    const result = { sent: 0, failed: [] };
    // Collect all valid device tokens
    const tokensWithUsers = [];
    for (const user of users) {
        if (user.deviceTokens && Array.isArray(user.deviceTokens) && user.deviceTokens.length > 0) {
            for (const token of user.deviceTokens) {
                tokensWithUsers.push({ token, userId: user._id.toString() });
            }
        }
    }
    if (tokensWithUsers.length === 0) {
        // No device tokens, mark all as "sent" (nothing to send)
        return { sent: users.length, failed: [] };
    }
    // Build FCM message
    const tokens = tokensWithUsers.map(t => t.token);
    // Payload Optimization: High priority and platform-specific configs
    const message = {
        notification: {
            title: content.title,
            body: content.body,
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'default',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1,
                },
            },
        },
        tokens,
    };
    // Add optional fields
    if (content.icon) {
        // Top-level notification doesn't support 'icon', move to android config
        if (!message.android.notification)
            message.android.notification = {};
        message.android.notification.icon = content.icon;
    }
    if (content.image) {
        message.notification.image = content.image;
    }
    if (content.data) {
        message.data = content.data;
    }
    try {
        // Use existing helper
        const res = yield pushNotificationHelper_1.pushNotificationHelper.sendPushNotifications(message);
        // Track detailed results
        if (res && res.responses) {
            res.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const token = tokens[idx];
                    const user = tokensWithUsers.find(t => t.token === token);
                    console.error(`FCM Delivery Failed for User ${user === null || user === void 0 ? void 0 : user.userId}:`, resp.error);
                    if (user === null || user === void 0 ? void 0 : user.userId)
                        result.failed.push(user.userId);
                }
            });
        }
        // Count successful users (not just tokens)
        const failedUserIds = new Set(result.failed);
        const usersWithTokens = new Set(tokensWithUsers.map(t => t.userId));
        result.sent = Array.from(usersWithTokens).filter(id => !failedUserIds.has(id)).length;
        // Users without tokens are also considered "sent" (nothing to send)
        const usersWithoutTokens = users.filter(u => !u.deviceTokens || u.deviceTokens.length === 0);
        result.sent += usersWithoutTokens.length;
    }
    catch (error) {
        console.error('Push notification critical error:', error);
        // Mark users with tokens as failed
        const usersWithTokens = new Set(tokensWithUsers.map(t => t.userId));
        result.failed = Array.from(usersWithTokens);
        // Users without tokens are still "sent" (nothing to send)
        const usersWithoutTokens = users.filter(u => !u.deviceTokens || u.deviceTokens.length === 0);
        result.sent = usersWithoutTokens.length;
    }
    return result;
});
exports.sendPush = sendPush;
exports.default = exports.sendPush;
