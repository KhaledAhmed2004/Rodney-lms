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
exports.StudentHomeService = void 0;
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const activity_model_1 = require("../activity/activity.model");
const gamification_model_1 = require("../gamification/gamification.model");
const gamification_model_2 = require("../gamification/gamification.model");
const user_model_1 = require("../user/user.model");
const getHome = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const [user, enrolledCourses, recentBadges, totalPointsResult, todayActivity,] = yield Promise.all([
        user_model_1.User.findById(studentId).select('streak totalPoints'),
        enrollment_model_1.Enrollment.find({
            student: studentId,
            status: { $in: ['ACTIVE', 'COMPLETED'] },
        })
            .populate('course', 'title slug thumbnail totalLessons')
            .sort({ 'progress.lastAccessedAt': -1 })
            .limit(10),
        gamification_model_1.StudentBadge.find({ student: studentId })
            .populate('badge', 'name icon')
            .sort({ earnedAt: -1 })
            .limit(5),
        gamification_model_2.PointsLedger.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: null, total: { $sum: '$points' } } },
        ]),
        (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return activity_model_1.DailyActivity.findOne({ student: studentId, date: today });
        })(),
    ]);
    return {
        points: ((_a = totalPointsResult[0]) === null || _a === void 0 ? void 0 : _a.total) || (user === null || user === void 0 ? void 0 : user.totalPoints) || 0,
        streak: {
            current: ((_b = user === null || user === void 0 ? void 0 : user.streak) === null || _b === void 0 ? void 0 : _b.current) || 0,
            longest: ((_c = user === null || user === void 0 ? void 0 : user.streak) === null || _c === void 0 ? void 0 : _c.longest) || 0,
        },
        enrolledCourses: enrolledCourses.map((e) => ({
            enrollmentId: e._id,
            courseId: e.course._id,
            title: e.course.title,
            slug: e.course.slug,
            thumbnail: e.course.thumbnail,
            totalLessons: e.course.totalLessons,
            completionPercentage: e.progress.completionPercentage,
            status: e.status,
        })),
        recentBadges: recentBadges.map((sb) => ({
            name: sb.badge.name,
            icon: sb.badge.icon,
            earnedAt: sb.earnedAt,
        })),
        todayActive: !!todayActivity,
    };
});
const getProgress = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const [user, enrollments, quizResults, totalPointsResult] = yield Promise.all([
        user_model_1.User.findById(studentId).select('streak totalPoints'),
        enrollment_model_1.Enrollment.find({ student: studentId })
            .populate('course', 'title slug')
            .select('course status progress'),
        quiz_model_1.QuizAttempt.find({ student: studentId, status: 'COMPLETED' })
            .populate('quiz', 'title')
            .sort({ completedAt: -1 })
            .limit(20),
        gamification_model_2.PointsLedger.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: null, total: { $sum: '$points' } } },
        ]),
    ]);
    // Calculate overall progress
    const totalCourses = enrollments.length;
    const overallPercentage = totalCourses > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + e.progress.completionPercentage, 0) / totalCourses)
        : 0;
    return {
        overallPercentage,
        points: ((_a = totalPointsResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        streak: {
            current: ((_b = user === null || user === void 0 ? void 0 : user.streak) === null || _b === void 0 ? void 0 : _b.current) || 0,
            longest: ((_c = user === null || user === void 0 ? void 0 : user.streak) === null || _c === void 0 ? void 0 : _c.longest) || 0,
        },
        progressByTopics: enrollments.map((e) => ({
            courseId: e.course._id,
            title: e.course.title,
            slug: e.course.slug,
            completionPercentage: e.progress.completionPercentage,
            status: e.status,
            completedLessons: e.progress.completedLessons.length,
        })),
        quizResults: quizResults.map((a) => ({
            quizId: a.quiz._id,
            quizTitle: a.quiz.title,
            score: a.score,
            maxScore: a.maxScore,
            percentage: a.percentage,
            passed: a.passed,
            completedAt: a.completedAt,
        })),
    };
});
exports.StudentHomeService = { getHome, getProgress };
