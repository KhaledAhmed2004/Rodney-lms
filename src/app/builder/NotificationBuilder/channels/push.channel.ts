/**
 * Push Channel - Firebase Cloud Messaging
 *
 * Sends push notifications via Firebase FCM to user devices.
 * Uses the existing pushNotificationHelper internally.
 */

import { pushNotificationHelper } from '../../../modules/notification/pushNotificationHelper';

interface IUser {
  _id: any;
  deviceTokens?: string[];
}

interface PushContent {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
}

interface PushResult {
  sent: number;
  failed: string[];
}

/**
 * Send push notifications to users via Firebase FCM
 */
export const sendPush = async (
  users: IUser[],
  content: PushContent
): Promise<PushResult> => {
  const result: PushResult = { sent: 0, failed: [] };

  // Collect all valid device tokens
  const tokensWithUsers: { token: string; userId: string }[] = [];

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
  const message: any = {
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
    if (!message.android.notification) message.android.notification = {};
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
    const res = await pushNotificationHelper.sendPushNotifications(message);

    // Track detailed results
    if (res && res.responses) {
      res.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const token = tokens[idx];
          const user = tokensWithUsers.find(t => t.token === token);
          console.error(`FCM Delivery Failed for User ${user?.userId}:`, resp.error);
          if (user?.userId) result.failed.push(user.userId);
        }
      });
    }

    // Count successful users (not just tokens)
    const failedUserIds = new Set(result.failed);
    const usersWithTokens = new Set(tokensWithUsers.map(t => t.userId));
    result.sent = Array.from(usersWithTokens).filter(id => !failedUserIds.has(id)).length;

    // Users without tokens are also considered "sent" (nothing to send)
    const usersWithoutTokens = users.filter(
      u => !u.deviceTokens || u.deviceTokens.length === 0
    );
    result.sent += usersWithoutTokens.length;

  } catch (error) {
    console.error('Push notification critical error:', error);
    // Mark users with tokens as failed
    const usersWithTokens = new Set(tokensWithUsers.map(t => t.userId));
    result.failed = Array.from(usersWithTokens);

    // Users without tokens are still "sent" (nothing to send)
    const usersWithoutTokens = users.filter(
      u => !u.deviceTokens || u.deviceTokens.length === 0
    );
    result.sent = usersWithoutTokens.length;
  }

  return result;
};

export default sendPush;
