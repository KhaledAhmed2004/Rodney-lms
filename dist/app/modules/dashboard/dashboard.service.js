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
exports.DashboardService = void 0;
const user_model_1 = require("../user/user.model");
const course_model_1 = require("../course/course.model");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const AggregationBuilder_1 = __importDefault(require("../../builder/AggregationBuilder"));
const getSummary = () => __awaiter(void 0, void 0, void 0, function* () {
    const endOfLastMonth = new Date();
    endOfLastMonth.setDate(0);
    endOfLastMonth.setHours(23, 59, 59, 999);
    const [studentGrowth, courseGrowth, activeEnrollmentGrowth, activeStudentIds, totalEnrollments, completedEnrollments, prevTotalEnrollments, prevCompletedEnrollments,] = yield Promise.all([
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            period: 'month',
            filter: { role: 'STUDENT', status: 'ACTIVE' },
        }),
        new AggregationBuilder_1.default(course_model_1.Course).calculateGrowth({
            period: 'month',
            filter: { status: 'PUBLISHED' },
        }),
        new AggregationBuilder_1.default(enrollment_model_1.Enrollment).calculateGrowth({
            period: 'month',
            filter: { status: 'ACTIVE' },
        }),
        enrollment_model_1.Enrollment.distinct('student', { status: 'ACTIVE' }),
        enrollment_model_1.Enrollment.countDocuments(),
        enrollment_model_1.Enrollment.countDocuments({ status: 'COMPLETED' }),
        enrollment_model_1.Enrollment.countDocuments({ createdAt: { $lte: endOfLastMonth } }),
        enrollment_model_1.Enrollment.countDocuments({
            status: 'COMPLETED',
            completedAt: { $lte: endOfLastMonth },
        }),
    ]);
    // Completion rate + growth
    const completionRate = totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;
    const prevRate = prevTotalEnrollments > 0
        ? Math.round((prevCompletedEnrollments / prevTotalEnrollments) * 100)
        : 0;
    const rateDiff = completionRate - prevRate;
    const rateGrowthType = rateDiff > 0 ? 'increase' : rateDiff < 0 ? 'decrease' : 'no_change';
    const comparisonPeriod = 'month';
    return {
        comparisonPeriod,
        totalStudents: {
            value: studentGrowth.total,
            growth: studentGrowth.growth,
            growthType: studentGrowth.growthType,
        },
        activeStudents: {
            value: activeStudentIds.length,
            growth: activeEnrollmentGrowth.growth,
            growthType: activeEnrollmentGrowth.growthType,
        },
        totalCourses: {
            value: courseGrowth.total,
            growth: courseGrowth.growth,
            growthType: courseGrowth.growthType,
        },
        completionRate: {
            value: completionRate,
            growth: Math.abs(rateDiff),
            growthType: rateGrowthType,
        },
    };
});
const getTrends = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (months = 6) {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - months);
    const [enrollmentTrends, completionTrends] = yield Promise.all([
        new AggregationBuilder_1.default(enrollment_model_1.Enrollment).getTimeTrends({
            timeUnit: 'month',
            startDate,
        }),
        new AggregationBuilder_1.default(enrollment_model_1.Enrollment).getTimeTrends({
            timeUnit: 'month',
            dateField: 'completedAt',
            startDate,
            filter: { status: 'COMPLETED' },
        }),
    ]);
    return { enrollmentTrends, completionTrends };
});
const getRecentActivity = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 20, type) {
    const queries = [];
    const includeTypes = type
        ? [type]
        : ['ENROLLMENT', 'COMPLETION', 'QUIZ_ATTEMPT'];
    if (includeTypes.includes('ENROLLMENT')) {
        queries.push(enrollment_model_1.Enrollment.find()
            .populate('student', 'name')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .then(items => items.map((item) => {
            var _a, _b;
            return ({
                _id: item._id,
                type: 'ENROLLMENT',
                title: `${((_a = item.student) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'} enrolled in ${((_b = item.course) === null || _b === void 0 ? void 0 : _b.title) || 'Unknown'}`,
                timestamp: item.createdAt,
            });
        })));
    }
    if (includeTypes.includes('COMPLETION')) {
        queries.push(enrollment_model_1.Enrollment.find({ status: 'COMPLETED' })
            .populate('student', 'name')
            .populate('course', 'title')
            .sort({ completedAt: -1 })
            .limit(limit)
            .lean()
            .then(items => items.map((item) => {
            var _a, _b;
            return ({
                _id: item._id,
                type: 'COMPLETION',
                title: `${((_a = item.student) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'} completed ${((_b = item.course) === null || _b === void 0 ? void 0 : _b.title) || 'Unknown'}`,
                timestamp: item.completedAt,
            });
        })));
    }
    if (includeTypes.includes('QUIZ_ATTEMPT')) {
        queries.push(quiz_model_1.QuizAttempt.find({ status: 'COMPLETED' })
            .populate('student', 'name')
            .populate('quiz', 'title')
            .sort({ completedAt: -1 })
            .limit(limit)
            .lean()
            .then(items => items.map((item) => {
            var _a, _b;
            return ({
                _id: item._id,
                type: 'QUIZ_ATTEMPT',
                title: `${((_a = item.student) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'} attempted ${((_b = item.quiz) === null || _b === void 0 ? void 0 : _b.title) || 'Unknown'}`,
                timestamp: item.completedAt,
            });
        })));
    }
    const results = yield Promise.all(queries);
    const merged = results.flat();
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return merged.slice(0, limit);
});
exports.DashboardService = { getSummary, getTrends, getRecentActivity };
