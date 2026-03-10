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
exports.GamificationHelper = void 0;
const gamification_interface_1 = require("../modules/gamification/gamification.interface");
const gamification_model_1 = require("../modules/gamification/gamification.model");
const user_model_1 = require("../modules/user/user.model");
const enrollment_model_1 = require("../modules/enrollment/enrollment.model");
const quiz_model_1 = require("../modules/quiz/quiz.model");
const POINTS_MAP = {
    [gamification_interface_1.POINTS_REASON.LESSON_COMPLETE]: 10,
    [gamification_interface_1.POINTS_REASON.QUIZ_PASS]: 25,
    [gamification_interface_1.POINTS_REASON.QUIZ_PERFECT]: 50,
    [gamification_interface_1.POINTS_REASON.COURSE_COMPLETE]: 100,
    [gamification_interface_1.POINTS_REASON.FIRST_ENROLLMENT]: 5,
    [gamification_interface_1.POINTS_REASON.STREAK_BONUS]: 15,
    [gamification_interface_1.POINTS_REASON.COMMUNITY_POST]: 5,
};
const awardPoints = (studentId, reason, referenceId, referenceType, customPoints) => __awaiter(void 0, void 0, void 0, function* () {
    const points = customPoints || POINTS_MAP[reason] || 0;
    if (points === 0)
        return;
    const descriptions = {
        [gamification_interface_1.POINTS_REASON.LESSON_COMPLETE]: 'Completed a lesson',
        [gamification_interface_1.POINTS_REASON.QUIZ_PASS]: 'Passed a quiz',
        [gamification_interface_1.POINTS_REASON.QUIZ_PERFECT]: 'Perfect score on quiz',
        [gamification_interface_1.POINTS_REASON.COURSE_COMPLETE]: 'Completed a course',
        [gamification_interface_1.POINTS_REASON.FIRST_ENROLLMENT]: 'Enrolled in first course',
        [gamification_interface_1.POINTS_REASON.STREAK_BONUS]: 'Streak milestone bonus',
        [gamification_interface_1.POINTS_REASON.COMMUNITY_POST]: 'Posted in community',
    };
    yield gamification_model_1.PointsLedger.create({
        student: studentId,
        points,
        reason,
        referenceId,
        referenceType,
        description: descriptions[reason] || reason,
    });
    yield user_model_1.User.findByIdAndUpdate(studentId, { $inc: { totalPoints: points } });
});
const checkAndAwardBadges = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const activeBadges = yield gamification_model_1.Badge.find({ isActive: true });
    for (const badge of activeBadges) {
        // Skip if already earned
        const alreadyEarned = yield gamification_model_1.StudentBadge.findOne({
            student: studentId,
            badge: badge._id,
        });
        if (alreadyEarned)
            continue;
        let earned = false;
        const { type, threshold } = badge.criteria;
        switch (type) {
            case gamification_interface_1.BADGE_CRITERIA.POINTS_THRESHOLD: {
                const totalResult = yield gamification_model_1.PointsLedger.aggregate([
                    { $match: { student: studentId } },
                    { $group: { _id: null, total: { $sum: '$points' } } },
                ]);
                const total = ((_a = totalResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
                earned = total >= threshold;
                break;
            }
            case gamification_interface_1.BADGE_CRITERIA.COURSES_COMPLETED: {
                const count = yield enrollment_model_1.Enrollment.countDocuments({
                    student: studentId,
                    status: 'COMPLETED',
                });
                earned = count >= threshold;
                break;
            }
            case gamification_interface_1.BADGE_CRITERIA.QUIZZES_PASSED: {
                const count = yield quiz_model_1.QuizAttempt.countDocuments({
                    student: studentId,
                    passed: true,
                    status: 'COMPLETED',
                });
                earned = count >= threshold;
                break;
            }
            case gamification_interface_1.BADGE_CRITERIA.PERFECT_QUIZ: {
                const count = yield quiz_model_1.QuizAttempt.countDocuments({
                    student: studentId,
                    percentage: 100,
                    status: 'COMPLETED',
                });
                earned = count >= threshold;
                break;
            }
            case gamification_interface_1.BADGE_CRITERIA.STREAK_DAYS: {
                const user = yield user_model_1.User.findById(studentId).select('streak');
                const longest = ((_b = user === null || user === void 0 ? void 0 : user.streak) === null || _b === void 0 ? void 0 : _b.longest) || 0;
                earned = longest >= threshold;
                break;
            }
            default:
                break;
        }
        if (earned) {
            yield gamification_model_1.StudentBadge.create({
                student: studentId,
                badge: badge._id,
            });
        }
    }
});
exports.GamificationHelper = { awardPoints, checkAndAwardBadges };
