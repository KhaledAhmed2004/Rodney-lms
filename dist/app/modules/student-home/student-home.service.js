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
const mongoose_1 = require("mongoose");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const quiz_model_1 = require("../quiz/quiz.model");
const gamification_model_1 = require("../gamification/gamification.model");
const user_model_1 = require("../user/user.model");
const getHome = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const [user, enrolledCourses, recentBadges, quizStats] = yield Promise.all([
        user_model_1.User.findById(studentId).select('name streak totalPoints'),
        enrollment_model_1.Enrollment.find({
            student: studentId,
            status: { $in: ['ACTIVE', 'COMPLETED'] },
        })
            .populate('course', 'title slug thumbnail')
            .sort({ 'progress.lastAccessedAt': -1 })
            .limit(10),
        gamification_model_1.StudentBadge.find({ student: studentId })
            .populate('badge', 'name icon')
            .sort({ earnedAt: -1 })
            .limit(5),
        quiz_model_1.QuizAttempt.aggregate([
            { $match: { student: new mongoose_1.Types.ObjectId(studentId), status: 'COMPLETED' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    passed: { $sum: { $cond: ['$passed', 1, 0] } },
                },
            },
        ]),
    ]);
    // Filter out enrollments where course was deleted
    const validEnrolledCourses = enrolledCourses.filter((e) => e.course);
    const validRecentBadges = recentBadges.filter((sb) => sb.badge);
    // Calculate course progress (average completion across all courses)
    const totalCourses = validEnrolledCourses.length;
    const courseProgress = totalCourses > 0
        ? Math.round(validEnrolledCourses.reduce((sum, e) => sum + (e.progress.completionPercentage || 0), 0) / totalCourses)
        : 0;
    // Calculate quiz progress
    const quizTotal = ((_a = quizStats[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const quizPassed = ((_b = quizStats[0]) === null || _b === void 0 ? void 0 : _b.passed) || 0;
    const quizPercentage = quizTotal > 0 ? Math.round((quizPassed / quizTotal) * 100) : 0;
    return {
        name: (user === null || user === void 0 ? void 0 : user.name) || '',
        points: (user === null || user === void 0 ? void 0 : user.totalPoints) || 0,
        streak: {
            current: ((_c = user === null || user === void 0 ? void 0 : user.streak) === null || _c === void 0 ? void 0 : _c.current) || 0,
            longest: ((_d = user === null || user === void 0 ? void 0 : user.streak) === null || _d === void 0 ? void 0 : _d.longest) || 0,
        },
        yourProgress: {
            courseProgress,
            quizProgress: quizPercentage,
        },
        enrolledCourses: validEnrolledCourses.map((e) => ({
            title: e.course.title,
            slug: e.course.slug,
            thumbnail: e.course.thumbnail,
            completionPercentage: e.progress.completionPercentage || 0,
        })),
        recentBadges: validRecentBadges.map((sb) => ({
            name: sb.badge.name,
            icon: sb.badge.icon,
            earnedAt: sb.earnedAt,
        })),
    };
});
const getProgress = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const [user, enrollments] = yield Promise.all([
        user_model_1.User.findById(studentId).select('streak totalPoints'),
        enrollment_model_1.Enrollment.find({
            student: studentId,
            status: { $in: ['ACTIVE', 'COMPLETED'] },
        })
            .populate('course', 'title slug')
            .select('course progress'),
    ]);
    const validEnrollments = enrollments.filter((e) => e.course);
    const totalCourses = validEnrollments.length;
    const overallPercentage = totalCourses > 0
        ? Math.round(validEnrollments.reduce((sum, e) => sum + (e.progress.completionPercentage || 0), 0) / totalCourses)
        : 0;
    return {
        overallPercentage,
        points: (user === null || user === void 0 ? void 0 : user.totalPoints) || 0,
        streak: {
            current: ((_a = user === null || user === void 0 ? void 0 : user.streak) === null || _a === void 0 ? void 0 : _a.current) || 0,
            longest: ((_b = user === null || user === void 0 ? void 0 : user.streak) === null || _b === void 0 ? void 0 : _b.longest) || 0,
        },
        courses: validEnrollments.map((e) => ({
            title: e.course.title,
            slug: e.course.slug,
            completionPercentage: e.progress.completionPercentage || 0,
        })),
    };
});
exports.StudentHomeService = { getHome, getProgress };
