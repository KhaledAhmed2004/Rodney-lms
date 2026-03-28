"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.FeedbackService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const AggregationBuilder_1 = __importStar(require("../../builder/AggregationBuilder"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const enrollmentHelper_1 = require("../../helpers/enrollmentHelper");
const feedback_model_1 = require("./feedback.model");
const course_model_1 = require("../course/course.model");
const createFeedback = (studentId, courseId, rating, review) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify enrollment — allow ACTIVE + COMPLETED (students can review after finishing)
    const enrollment = yield enrollmentHelper_1.EnrollmentHelper.verifyEnrollment(studentId, courseId, ['ACTIVE', 'COMPLETED']);
    // Check if already reviewed
    const existing = yield feedback_model_1.Feedback.findOne({
        student: studentId,
        course: courseId,
    });
    if (existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'You have already reviewed this course');
    }
    const feedback = yield feedback_model_1.Feedback.create({
        student: studentId,
        course: courseId,
        enrollment: enrollment._id,
        rating,
        review,
    });
    // Update course average rating
    yield recalculateCourseRating(courseId);
    // Re-fetch — .create() bypasses select:false, raw result e __v/updatedAt leak hoy
    return feedback_model_1.Feedback.findById(feedback._id).select('rating review createdAt');
});
const getByCourse = (courseId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find({ course: courseId })
        .select('-enrollment -updatedAt -__v')
        .populate('student', 'name profilePicture'), query)
        .sort()
        .paginate();
    const data = yield feedbackQuery.modelQuery;
    const pagination = yield feedbackQuery.getPaginationInfo();
    return { pagination, data };
});
const getAllFeedback = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find()
        .select('-enrollment -updatedAt -__v')
        .populate('student', 'name email profilePicture')
        .populate('course', 'title slug'), query)
        .search(['review'])
        .filter()
        .sort()
        .paginate();
    const data = yield feedbackQuery.modelQuery;
    const pagination = yield feedbackQuery.getPaginationInfo();
    return { pagination, data };
});
const getById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield feedback_model_1.Feedback.findById(id)
        .select('-enrollment -updatedAt -__v')
        .populate('student', 'name email profilePicture')
        .populate('course', 'title slug');
    if (!feedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Feedback not found');
    }
    return feedback;
});
const respondToFeedback = (id, adminResponse) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield feedback_model_1.Feedback.findById(id);
    if (!feedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Feedback not found');
    }
    const respondedAt = new Date();
    yield feedback_model_1.Feedback.updateOne({ _id: id }, { adminResponse, respondedAt });
    return { _id: feedback._id, adminResponse, respondedAt };
});
const deleteFeedback = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield feedback_model_1.Feedback.findById(id);
    if (!feedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Feedback not found');
    }
    const courseId = feedback.course.toString();
    yield feedback_model_1.Feedback.findByIdAndDelete(id);
    yield recalculateCourseRating(courseId);
});
const getMyReviews = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find({ student: studentId })
        .select('-student -enrollment -updatedAt -__v')
        .populate('course', 'title slug thumbnail'), query)
        .sort()
        .paginate();
    const data = yield feedbackQuery.modelQuery;
    const pagination = yield feedbackQuery.getPaginationInfo();
    return { pagination, data };
});
const getSummary = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [reviewGrowth, currentAvgResult, previousAvgResult, pendingCount, distributionResult,] = yield Promise.all([
        // 1. Total reviews + growth (reuses dashboard pattern)
        (0, AggregationBuilder_1.calculateGrowthDynamic)(feedback_model_1.Feedback),
        // 2. Current overall average rating
        new AggregationBuilder_1.default(feedback_model_1.Feedback)
            .group({ _id: null, avg: { $avg: '$rating' } })
            .execute(),
        // 3. Previous month overall average (for delta comparison)
        new AggregationBuilder_1.default(feedback_model_1.Feedback)
            .match({ createdAt: { $lt: startOfThisMonth } })
            .group({ _id: null, avg: { $avg: '$rating' } })
            .execute(),
        // 4. Pending responses (no admin reply yet)
        feedback_model_1.Feedback.countDocuments({ adminResponse: null }),
        // 5. Rating distribution (1-5 stars)
        new AggregationBuilder_1.default(feedback_model_1.Feedback)
            .group({ _id: '$rating', count: { $sum: 1 } })
            .sort({ _id: -1 })
            .execute(),
    ]);
    const currentAvg = (_b = (_a = currentAvgResult[0]) === null || _a === void 0 ? void 0 : _a.avg) !== null && _b !== void 0 ? _b : 0;
    const hasPreviousData = previousAvgResult.length > 0;
    const previousAvg = hasPreviousData ? previousAvgResult[0].avg : 0;
    const ratingDelta = hasPreviousData
        ? Math.round((currentAvg - previousAvg) * 10) / 10
        : 0;
    return {
        comparisonPeriod: 'month',
        totalReviews: {
            value: reviewGrowth.total,
            growth: reviewGrowth.growth,
            growthType: reviewGrowth.growthType,
        },
        averageRating: {
            value: Math.round(currentAvg * 10) / 10,
            growth: Math.abs(ratingDelta),
            growthType: ratingDelta > 0
                ? 'increase'
                : ratingDelta < 0
                    ? 'decrease'
                    : 'no_change',
        },
        pendingResponses: pendingCount,
        ratingDistribution: [5, 4, 3, 2, 1].map(r => {
            var _a, _b;
            return ({
                rating: r,
                count: (_b = (_a = distributionResult.find((d) => d._id === r)) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0,
            });
        }),
    };
});
// Helper: recalculate course average rating from all feedback
const recalculateCourseRating = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield feedback_model_1.Feedback.aggregate([
        { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                ratingsCount: { $sum: 1 },
            },
        },
    ]);
    const stats = result[0] || { averageRating: 0, ratingsCount: 0 };
    yield course_model_1.Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(stats.averageRating * 10) / 10,
        ratingsCount: stats.ratingsCount,
    });
});
exports.FeedbackService = {
    createFeedback,
    getByCourse,
    getAllFeedback,
    getById,
    getSummary,
    respondToFeedback,
    deleteFeedback,
    getMyReviews,
};
