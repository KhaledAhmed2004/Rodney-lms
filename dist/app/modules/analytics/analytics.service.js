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
exports.AnalyticsService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const activity_model_1 = require("../activity/activity.model");
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
const getCourseCompletion = (period) => __awaiter(void 0, void 0, void 0, function* () {
    const matchStage = {};
    if (period) {
        matchStage.createdAt = { $gte: getStartDate(period) };
    }
    const pipeline = [
        ...(Object.keys(matchStage).length > 0
            ? [{ $match: matchStage }]
            : []),
        {
            $group: {
                _id: '$course',
                totalEnrollments: { $sum: 1 },
                completedEnrollments: {
                    $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
                },
            },
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: '_id',
                as: 'course',
                pipeline: [
                    { $match: { status: 'PUBLISHED' } },
                    { $project: { title: 1 } },
                ],
            },
        },
        { $unwind: '$course' },
        {
            $project: {
                courseId: '$_id',
                title: '$course.title',
                totalEnrollments: 1,
                completedEnrollments: 1,
                completionRate: {
                    $round: [
                        {
                            $multiply: [
                                { $divide: ['$completedEnrollments', '$totalEnrollments'] },
                                100,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
        { $sort: { completionRate: -1 } },
    ];
    return enrollment_model_1.Enrollment.aggregate(pipeline);
});
const getQuizPerformance = (period) => __awaiter(void 0, void 0, void 0, function* () {
    const matchConditions = { status: 'COMPLETED' };
    if (period) {
        matchConditions.createdAt = { $gte: getStartDate(period) };
    }
    const quizStats = yield quiz_model_1.QuizAttempt.aggregate([
        { $match: matchConditions },
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
    const [enrollmentStats, progressDistribution] = yield Promise.all([
        enrollment_model_1.Enrollment.aggregate([
            { $match: { course: courseId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
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
const getExportData = (type, period) => __awaiter(void 0, void 0, void 0, function* () {
    switch (type) {
        case 'courses':
            return getCourseCompletion(period);
        case 'quizzes':
            return getQuizPerformance(period);
        case 'engagement':
            return getUserEngagement(period);
        default:
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid export type');
    }
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
    getExportData,
};
