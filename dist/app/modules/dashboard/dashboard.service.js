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
exports.DashboardService = void 0;
const user_model_1 = require("../user/user.model");
const course_model_1 = require("../course/course.model");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const getSummary = () => __awaiter(void 0, void 0, void 0, function* () {
    const [totalUsers, totalCourses, totalEnrollments, completedEnrollments, activeStudents,] = yield Promise.all([
        user_model_1.User.countDocuments({ status: 'ACTIVE', role: 'STUDENT' }),
        course_model_1.Course.countDocuments({ status: 'PUBLISHED' }),
        enrollment_model_1.Enrollment.countDocuments(),
        enrollment_model_1.Enrollment.countDocuments({ status: 'COMPLETED' }),
        enrollment_model_1.Enrollment.distinct('student', { status: 'ACTIVE' }).then(r => r.length),
    ]);
    const completionRate = totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;
    return {
        totalUsers,
        totalCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        activeStudents,
    };
});
const getTrends = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const [enrollmentTrends, userTrends] = yield Promise.all([
        enrollment_model_1.Enrollment.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        user_model_1.User.aggregate([
            { $match: { createdAt: { $gte: startDate }, role: 'STUDENT' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
    ]);
    return { enrollmentTrends, userTrends };
});
const getRecentActivity = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 20) {
    const [recentEnrollments, recentCompletions, recentQuizAttempts] = yield Promise.all([
        enrollment_model_1.Enrollment.find()
            .populate('student', 'name profilePicture')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .limit(limit),
        enrollment_model_1.Enrollment.find({ status: 'COMPLETED' })
            .populate('student', 'name profilePicture')
            .populate('course', 'title')
            .sort({ completedAt: -1 })
            .limit(limit),
        quiz_model_1.QuizAttempt.find({ status: 'COMPLETED' })
            .populate('student', 'name profilePicture')
            .populate('quiz', 'title')
            .sort({ completedAt: -1 })
            .limit(limit),
    ]);
    return { recentEnrollments, recentCompletions, recentQuizAttempts };
});
exports.DashboardService = { getSummary, getTrends, getRecentActivity };
