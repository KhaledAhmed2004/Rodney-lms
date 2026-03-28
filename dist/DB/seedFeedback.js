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
exports.seedFeedback = void 0;
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../config"));
const feedback_model_1 = require("../app/modules/feedback/feedback.model");
const enrollment_model_1 = require("../app/modules/enrollment/enrollment.model");
const course_model_1 = require("../app/modules/course/course.model");
const logger_1 = require("../shared/logger");
const DEMO_REVIEWS = [
    {
        rating: 5,
        review: 'Excellent course! The projects were very practical and the instructor explained complex concepts simply. Highly recommend for beginners.',
        adminResponse: null,
        respondedAt: null,
    },
    {
        rating: 4,
        review: 'Great course overall. Loved the hands-on sections. Would appreciate more real-world project examples.',
        adminResponse: 'Thank you! We are adding 3 new project modules next month. Stay tuned!',
        respondedAt: new Date('2026-03-24T14:30:00Z'),
    },
    {
        rating: 2,
        review: 'Course content is outdated. Some lessons use deprecated methods. Needs a major update.',
        adminResponse: null,
        respondedAt: null,
    },
    {
        rating: 1,
        review: 'Very disappointed. The quizzes do not match the lesson content at all. Felt like I wasted my time.',
        adminResponse: 'We are sorry to hear that. We have flagged this with the content team and will review all quizzes. Thank you for the feedback.',
        respondedAt: new Date('2026-03-19T10:00:00Z'),
    },
    {
        rating: 3,
        review: 'Decent course. Good for intermediate learners but the pace is too fast for some sections. Closures chapter needs better examples.',
        adminResponse: null,
        respondedAt: null,
    },
];
const seedFeedback = () => __awaiter(void 0, void 0, void 0, function* () {
    // Only seed in development
    if (config_1.default.node_env !== 'development')
        return;
    // Skip if feedback already exists
    const existingCount = yield feedback_model_1.Feedback.countDocuments();
    if (existingCount > 0)
        return;
    // Find enrollments with student + course (need real IDs)
    const enrollments = yield enrollment_model_1.Enrollment.find({
        status: { $in: ['ACTIVE', 'COMPLETED'] },
    })
        .limit(5)
        .lean();
    if (enrollments.length === 0) {
        logger_1.logger.warn('⚠️ No enrollments found — skipping feedback seed (enroll students first)');
        return;
    }
    // Create feedback for each enrollment (up to 5)
    const feedbackData = enrollments.map((enrollment, i) => {
        const demo = DEMO_REVIEWS[i % DEMO_REVIEWS.length];
        return Object.assign({ student: enrollment.student, course: enrollment.course, enrollment: enrollment._id, rating: demo.rating, review: demo.review }, (demo.adminResponse && {
            adminResponse: demo.adminResponse,
            respondedAt: demo.respondedAt,
        }));
    });
    yield feedback_model_1.Feedback.insertMany(feedbackData);
    // Recalculate course ratings for affected courses
    const courseIds = [
        ...new Set(feedbackData.map(f => f.course.toString())),
    ];
    for (const courseId of courseIds) {
        const stats = yield feedback_model_1.Feedback.aggregate([
            { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    ratingsCount: { $sum: 1 },
                },
            },
        ]);
        if (stats[0]) {
            yield course_model_1.Course.findByIdAndUpdate(courseId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                ratingsCount: stats[0].ratingsCount,
            });
        }
    }
    logger_1.logger.info(`📝 ${feedbackData.length} demo feedback entries seeded (${courseIds.length} course ratings updated)`);
});
exports.seedFeedback = seedFeedback;
