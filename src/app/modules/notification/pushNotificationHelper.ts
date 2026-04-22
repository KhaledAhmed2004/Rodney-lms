import { logger } from '../../../shared/logger';
import config from '../../../config';
import admin from 'firebase-admin';

// Decode Base64 Firebase service account
const serviceAccountJson = Buffer.from(
  config.firebase_api_key_base64!, // the Base64 string from .env
  'base64'
).toString('utf8');

// Parse it as JSON
const serviceAccount: admin.ServiceAccount = JSON.parse(serviceAccountJson);

// Initialize Firebase SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Multiple users
const sendPushNotifications = async (
  values: admin.messaging.MulticastMessage
) => {
  try {
    const res = await admin.messaging().sendEachForMulticast(values);
    logger.info('Notifications batch result:', {
      successCount: res.successCount,
      failureCount: res.failureCount,
    });
    return res;
  } catch (error) {
    logger.error('FCM Multicast Error:', error);
    throw error;
  }
};

// Single user
const sendPushNotification = async (values: admin.messaging.Message) => {
  try {
    const res = await admin.messaging().send(values);
    logger.info('Notification sent successfully', res);
    return res;
  } catch (error) {
    logger.error('FCM Single Error:', error);
    throw error;
  }
};

export const pushNotificationHelper = {
  sendPushNotifications,
  sendPushNotification,
};
