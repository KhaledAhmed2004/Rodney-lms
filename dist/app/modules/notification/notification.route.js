"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const notification_controller_1 = require("./notification.controller");
const notification_validation_1 = require("./notification.validation");
const router = express_1.default.Router();
// ==================== USER NOTIFICATIONS ====================
// Fetch notifications + unread count
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.getNotificationFromDB);
// Mark all notifications as read (fixed path BEFORE param path)
router.patch('/read-all', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.readAllNotifications);
// Mark a notification as read
router.patch('/:id/read', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.readNotification);
// ==================== ADMIN NOTIFICATIONS ====================
// Fetch admin notifications + unread count
router.get('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.adminNotificationFromDB);
// Sent notification history
router.get('/admin/sent', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.getSentHistory);
// Send notification to students
router.post('/admin/send', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(notification_validation_1.NotificationValidation.sendNotification), notification_controller_1.NotificationController.sendNotification);
// Mark all admin notifications as read (fixed path BEFORE param path)
router.patch('/admin/read-all', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.adminMarkAllNotificationsAsRead);
// Mark a single admin notification as read
router.patch('/admin/:id/read', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), notification_controller_1.NotificationController.adminMarkNotificationAsRead);
exports.NotificationRoutes = router;
