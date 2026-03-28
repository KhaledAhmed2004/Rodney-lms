"use strict";
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
exports.NotificationService = exports.markAllNotificationsAsRead = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const NotificationBuilder_1 = __importDefault(require("../../builder/NotificationBuilder/NotificationBuilder"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const course_model_1 = require("../course/course.model");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const notification_model_1 = require("./notification.model");
const sentNotification_model_1 = require("./sentNotification.model");
// get notifications
const getNotificationFromDB = (user, query) => __awaiter(void 0, void 0, void 0, function* () {
    // 1️⃣ Initialize QueryBuilder for user's notifications
    const notificationQuery = new QueryBuilder_1.default(notification_model_1.Notification.find({ receiver: user.id }), query)
        .search(['title', 'text'])
        .filter()
        .dateFilter()
        .sort()
        .paginate()
        .fields();
    // 2️⃣ Execute the query and get filtered & paginated results
    const { data, pagination } = yield notificationQuery.getFilteredResults();
    // 3️⃣ Count unread notifications separately
    const unreadCount = yield notification_model_1.Notification.countDocuments({
        receiver: user.id,
        isRead: false,
    });
    // 4️⃣ Return structured response
    return {
        data,
        pagination,
        unreadCount,
    };
});
const markNotificationAsReadIntoDB = (notificationId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notification_model_1.Notification.findOneAndUpdate({ _id: notificationId, receiver: userId }, { isRead: true }, { new: true });
    if (!notification) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Notification not found');
    }
    return notification;
});
const markAllNotificationsAsRead = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.updateMany({ receiver: userId, isRead: false }, // only unread notifications
    { isRead: true });
    return {
        modifiedCount: result.modifiedCount, // number of notifications updated
        message: 'All notifications marked as read',
    };
});
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Fetch admin notifications with query, pagination, unread count
const adminNotificationFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const notificationQuery = new QueryBuilder_1.default(notification_model_1.Notification.find({ type: 'ADMIN' }), query)
        .search(['title', 'text'])
        .filter()
        .dateFilter()
        .sort()
        .paginate()
        .fields();
    const { data, pagination } = yield notificationQuery.getFilteredResults();
    const unreadCount = yield notification_model_1.Notification.countDocuments({
        type: 'ADMIN',
        isRead: false,
    });
    return {
        data,
        pagination,
        unreadCount,
    };
});
// Mark a single admin notification as read
const adminMarkNotificationAsReadIntoDB = (notificationId) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notification_model_1.Notification.findOneAndUpdate({ _id: notificationId, type: 'ADMIN' }, { isRead: true }, { new: true });
    if (!notification) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Admin notification not found');
    }
    return notification;
});
// Mark all admin notifications as read
const adminMarkAllNotificationsAsRead = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.updateMany({ type: 'ADMIN', isRead: false }, { isRead: true });
    return {
        modifiedCount: result.modifiedCount,
        message: 'All admin notifications marked as read',
    };
});
// Send notification via NotificationBuilder + save sent record
const sendAdminNotification = (title, text, audience, courseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const builder = new NotificationBuilder_1.default()
        .setTitle(title)
        .setText(text)
        .setType('ADMIN')
        .viaDatabase()
        .viaSocket()
        .viaPush();
    let courseTitle;
    if (audience === 'all') {
        builder.toRole('STUDENT');
    }
    else {
        if (!courseId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'courseId is required when audience is course');
        }
        const [enrollments, course] = yield Promise.all([
            enrollment_model_1.Enrollment.find({
                course: courseId,
                status: { $in: ['ACTIVE', 'COMPLETED'] },
            })
                .select('student')
                .lean(),
            course_model_1.Course.findById(courseId).select('title').lean(),
        ]);
        if (!course) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
        }
        if (enrollments.length === 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No students enrolled in this course');
        }
        courseTitle = course.title;
        const studentIds = enrollments.map(e => String(e.student));
        builder.toMany(studentIds);
    }
    const result = yield builder.sendNow();
    const sent = result === null || result === void 0 ? void 0 : result.sent;
    const recipientCount = typeof sent === 'number' ? sent : (_b = (_a = sent === null || sent === void 0 ? void 0 : sent.database) !== null && _a !== void 0 ? _a : sent === null || sent === void 0 ? void 0 : sent.socket) !== null && _b !== void 0 ? _b : 0;
    // Save sent record for history (flat — no ObjectId refs, no populate needed)
    yield sentNotification_model_1.SentNotification.create(Object.assign(Object.assign({ title,
        text,
        audience }, (courseTitle && { courseTitle })), { recipientCount }));
    return { recipientCount };
});
// Get sent notification history
const getSentHistory = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const sentQuery = new QueryBuilder_1.default(sentNotification_model_1.SentNotification.find().select('-updatedAt -__v'), query)
        .search(['title', 'text'])
        .filter()
        .sort()
        .paginate();
    const data = yield sentQuery.modelQuery;
    const pagination = yield sentQuery.getPaginationInfo();
    return { pagination, data };
});
exports.NotificationService = {
    adminNotificationFromDB,
    getNotificationFromDB,
    markNotificationAsReadIntoDB,
    adminMarkNotificationAsReadIntoDB,
    markAllNotificationsAsRead: exports.markAllNotificationsAsRead,
    adminMarkAllNotificationsAsRead,
    sendAdminNotification,
    getSentHistory,
};
