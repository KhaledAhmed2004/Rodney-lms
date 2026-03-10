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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const activity_model_1 = require("../activity/activity.model");
const course_model_1 = require("../course/course.model");
const getUserEngagement = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (period = 'month') {
    const startDate = getStartDate(period);
    const activeUsers = yield activity_model_1.DailyActivity.aggregate([
        { $match: { date: { $gte: startDate }, isActive: true } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                uniqueUsers: { $addToSet: '$student' },
            },
        },
        {
            $project: {
                date: '$_id',
                activeUsers: { $size: '$uniqueUsers' },
            },
        },
        { $sort: { date: 1 } },
    ]);
    return activeUsers;
});
const getCourseCompletion = () => __awaiter(void 0, void 0, void 0, function* () {
    const courses = yield course_model_1.Course.find({ status: 'PUBLISHED' }).select('title slug');
    const completionData = yield Promise.all(courses.map((course) => __awaiter(void 0, void 0, void 0, function* () {
        const total = yield enrollment_model_1.Enrollment.countDocuments({ course: course._id });
        const completed = yield enrollment_model_1.Enrollment.countDocuments({
            course: course._id,
            status: 'COMPLETED',
        });
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
            courseId: course._id,
            title: course.title,
            totalEnrollments: total,
            completedEnrollments: completed,
            completionRate: rate,
        };
    })));
    return completionData;
});
const getQuizPerformance = () => __awaiter(void 0, void 0, void 0, function* () {
    const quizStats = yield quiz_model_1.QuizAttempt.aggregate([
        { $match: { status: 'COMPLETED' } },
        {
            $group: {
                _id: '$quiz',
                avgScore: { $avg: '$percentage' },
                totalAttempts: { $sum: 1 },
                passCount: {
                    $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
                },
                avgTimeSpent: { $avg: '$timeSpent' },
            },
        },
        {
            $lookup: {
                from: 'quizzes',
                localField: '_id',
                foreignField: '_id',
                as: 'quiz',
                pipeline: [{ $project: { title: 1 } }],
            },
        },
        { $unwind: '$quiz' },
        {
            $project: {
                quizId: '$_id',
                title: '$quiz.title',
                avgScore: { $round: ['$avgScore', 1] },
                totalAttempts: 1,
                passRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$passCount', '$totalAttempts'] }, 100] },
                        1,
                    ],
                },
                avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
            },
        },
        { $sort: { avgScore: -1 } },
    ]);
    return quizStats;
});
const getCourseAnalytics = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const [enrollmentStats, quizStats, progressDistribution] = yield Promise.all([
        enrollment_model_1.Enrollment.aggregate([
            { $match: { course: courseId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]),
        quiz_model_1.QuizAttempt.aggregate([
            { $match: { course: courseId, status: 'COMPLETED' } },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$percentage' },
                    totalAttempts: { $sum: 1 },
                    passCount: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
                },
            },
        ]),
        enrollment_model_1.Enrollment.aggregate([
            { $match: { course: courseId } },
            {
                $bucket: {
                    groupBy: '$progress.completionPercentage',
                    boundaries: [0, 25, 50, 75, 100, 101],
                    default: 'other',
                    output: { count: { $sum: 1 } },
                },
            },
        ]),
    ]);
    return {
        enrollmentStats,
        quizStats: quizStats[0] || null,
        progressDistribution,
    };
});
const getStudentAnalytics = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const [enrollments, quizPerformance, activitySummary] = yield Promise.all([
        enrollment_model_1.Enrollment.find({ student: studentId })
            .populate('course', 'title slug')
            .select('status progress completedAt'),
        quiz_model_1.QuizAttempt.aggregate([
            { $match: { student: studentId, status: 'COMPLETED' } },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$percentage' },
                    totalQuizzes: { $sum: 1 },
                    passCount: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
                },
            },
        ]),
        activity_model_1.DailyActivity.aggregate([
            { $match: { student: studentId } },
            {
                $group: {
                    _id: null,
                    totalDaysActive: { $sum: 1 },
                    totalLessons: { $sum: '$lessonsCompleted' },
                    totalQuizzes: { $sum: '$quizzesTaken' },
                    totalTimeSpent: { $sum: '$timeSpent' },
                },
            },
        ]),
    ]);
    return {
        enrollments,
        quizPerformance: quizPerformance[0] || null,
        activitySummary: activitySummary[0] || null,
    };
});
function getStartDate(period) {
    const now = new Date();
    switch (period) {
        case 'week':
            now.setDate(now.getDate() - 7);
            break;
        case 'month':
            now.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            now.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            now.setFullYear(now.getFullYear() - 1);
            break;
        default:
            now.setMonth(now.getMonth() - 1);
    }
    return now;
}
exports.AnalyticsService = {
    getUserEngagement,
    getCourseCompletion,
    getQuizPerformance,
    getCourseAnalytics,
    getStudentAnalytics,
};
