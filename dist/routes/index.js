"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_route_1 = require("../app/modules/auth/auth.route");
const user_route_1 = require("../app/modules/user/user.route");
const chat_route_1 = require("../app/modules/chat/chat.route");
const message_route_1 = require("../app/modules/message/message.route");
const notification_route_1 = require("../app/modules/notification/notification.route");
const course_route_1 = require("../app/modules/course/course.route");
const enrollment_route_1 = require("../app/modules/enrollment/enrollment.route");
const activity_route_1 = require("../app/modules/activity/activity.route");
const legal_route_1 = require("../app/modules/legal/legal.route");
const quiz_route_1 = require("../app/modules/quiz/quiz.route");
const gradebook_route_1 = require("../app/modules/gradebook/gradebook.route");
const community_route_1 = require("../app/modules/community/community.route");
const feedback_route_1 = require("../app/modules/feedback/feedback.route");
const gamification_route_1 = require("../app/modules/gamification/gamification.route");
const dashboard_route_1 = require("../app/modules/dashboard/dashboard.route");
const analytics_route_1 = require("../app/modules/analytics/analytics.route");
const student_home_route_1 = require("../app/modules/student-home/student-home.route");
const router = express_1.default.Router();
const apiRoutes = [
    {
        path: '/users',
        route: user_route_1.UserRoutes,
    },
    {
        path: '/auth',
        route: auth_route_1.AuthRoutes,
    },
    {
        path: '/chats',
        route: chat_route_1.ChatRoutes,
    },
    {
        path: '/messages',
        route: message_route_1.MessageRoutes,
    },
    {
        path: '/notifications',
        route: notification_route_1.NotificationRoutes,
    },
    {
        path: '/courses',
        route: course_route_1.CourseRoutes,
    },
    {
        path: '/enrollments',
        route: enrollment_route_1.EnrollmentRoutes,
    },
    {
        path: '/activity',
        route: activity_route_1.ActivityRoutes,
    },
    {
        path: '/legal',
        route: legal_route_1.LegalRoutes,
    },
    {
        path: '/quizzes',
        route: quiz_route_1.QuizRoutes,
    },
    {
        path: '/gradebook',
        route: gradebook_route_1.GradebookRoutes,
    },
    {
        path: '/community',
        route: community_route_1.CommunityRoutes,
    },
    {
        path: '/feedback',
        route: feedback_route_1.FeedbackRoutes,
    },
    {
        path: '/gamification',
        route: gamification_route_1.GamificationRoutes,
    },
    {
        path: '/dashboard',
        route: dashboard_route_1.DashboardRoutes,
    },
    {
        path: '/analytics',
        route: analytics_route_1.AnalyticsRoutes,
    },
    {
        path: '/student',
        route: student_home_route_1.StudentHomeRoutes,
    },
];
apiRoutes.forEach(route => router.use(route.path, route.route));
exports.default = router;
