import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';
const router = express.Router();

// ==================== USER NOTIFICATIONS ====================

// Fetch notifications + unread count
router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  NotificationController.getNotificationFromDB
);

// Mark all notifications as read (fixed path BEFORE param path)
router.patch(
  '/read-all',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  NotificationController.readAllNotifications
);

// Mark a notification as read
router.patch(
  '/:id/read',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  NotificationController.readNotification
);

// ==================== ADMIN NOTIFICATIONS ====================

// Fetch admin notifications + unread count
router.get(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminNotificationFromDB
);

// Mark all admin notifications as read (fixed path BEFORE param path)
router.patch(
  '/admin/read-all',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminMarkAllNotificationsAsRead
);

// Mark a single admin notification as read
router.patch(
  '/admin/:id/read',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminMarkNotificationAsRead
);

export const NotificationRoutes = router;
