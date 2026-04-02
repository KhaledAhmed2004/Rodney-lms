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
const course_model_1 = require("../course/course.model");
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
                _id: 0,
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
                _id: 0,
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
const getQuizPerformance = (courseId_1, period_1, ...args_1) => __awaiter(void 0, [courseId_1, period_1, ...args_1], void 0, function* (courseId, period, page = 1, limit = 10) {
    var _a, _b, _c, _d, _e;
    // Validate course exists
    const courseExists = yield course_model_1.Course.exists({ _id: courseId });
    if (!courseExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
    }
    // Find quiz IDs for this course
    const quizIds = yield quiz_model_1.Quiz.find({ course: courseId }).distinct('_id');
    if (quizIds.length === 0) {
        return { data: [], pagination: { page, limit, total: 0, totalPage: 0 } };
    }
    const matchConditions = {
        status: 'COMPLETED',
        quiz: { $in: quizIds },
    };
    if (period) {
        matchConditions.createdAt = { $gte: getStartDate(period) };
    }
    const skip = (page - 1) * limit;
    const pipeline = [
        { $match: matchConditions },
        {
            $group: {
                _id: '$quiz',
                avgScore: { $avg: '$percentage' },
                totalAttempts: { $sum: 1 },
                passCount: {
                    $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
                },
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
                _id: 0,
                title: '$quiz.title',
                avgScore: { $round: ['$avgScore', 1] },
                totalAttempts: 1,
                passRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$passCount', '$totalAttempts'] }, 100] },
                        1,
                    ],
                },
            },
        },
        { $sort: { avgScore: -1 } },
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: limit }],
                total: [{ $count: 'count' }],
            },
        },
    ];
    const result = yield quiz_model_1.QuizAttempt.aggregate(pipeline);
    const data = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    const total = (_e = (_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.total[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
    };
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
const getEngagementHeatmap = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (period = 'quarter') {
    const startDate = getStartDate(period);
    // End of today in UTC — consistent with MongoDB $dateToString (UTC) and toISOString (UTC)
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    // Get active days from DB
    const dailyData = yield activity_model_1.DailyActivity.aggregate([
        { $match: { date: { $gte: startDate }, isActive: true } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                uniqueUsers: { $addToSet: '$student' },
            },
        },
        {
            $project: {
                _id: 0,
                date: '$_id',
                activeUsers: { $size: '$uniqueUsers' },
            },
        },
    ]);
    // Build lookup map: date string → activeUsers
    const activityMap = new Map();
    for (const d of dailyData) {
        activityMap.set(d.date, d.activeUsers);
    }
    // Generate ALL days in the period (gap-fill zeros)
    const allDays = [];
    const cursor = new Date(startDate);
    while (cursor <= today) {
        const dateStr = cursor.toISOString().slice(0, 10);
        allDays.push({
            date: dateStr,
            activeUsers: activityMap.get(dateStr) || 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    // Calculate intensity (0-4) based on quartiles
    const counts = allDays
        .map(d => d.activeUsers)
        .filter(c => c > 0)
        .sort((a, b) => a - b);
    const getPercentile = (arr, p) => {
        if (arr.length === 0)
            return 0;
        return arr[Math.max(0, Math.ceil(arr.length * p) - 1)];
    };
    const p25 = getPercentile(counts, 0.25);
    const p50 = getPercentile(counts, 0.5);
    const p75 = getPercentile(counts, 0.75);
    return allDays.map(d => {
        let intensity = 0;
        if (d.activeUsers > 0) {
            if (d.activeUsers <= p25)
                intensity = 1;
            else if (d.activeUsers <= p50)
                intensity = 2;
            else if (d.activeUsers <= p75)
                intensity = 3;
            else
                intensity = 4;
        }
        return {
            date: d.date,
            activeUsers: d.activeUsers,
            intensity,
        };
    });
});
const getExportData = (type, period, course) => __awaiter(void 0, void 0, void 0, function* () {
    switch (type) {
        case 'courses':
            return getCourseCompletion(period);
        case 'quizzes': {
            if (!course)
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Course ID is required for quiz export');
            const result = yield getQuizPerformance(course, period, 1, 1000);
            return result.data;
        }
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
    getCourseCompletion,
    getQuizPerformance,
    getCourseAnalytics,
    getEngagementHeatmap,
    getExportData,
};
