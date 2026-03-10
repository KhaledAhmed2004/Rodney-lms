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
exports.FeedbackService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const enrollmentHelper_1 = require("../../helpers/enrollmentHelper");
const feedback_model_1 = require("./feedback.model");
const course_model_1 = require("../course/course.model");
const createFeedback = (studentId, courseId, rating, review) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify enrollment
    const enrollment = yield enrollmentHelper_1.EnrollmentHelper.verifyEnrollment(studentId, courseId);
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
    return feedback;
});
const getPublishedByCourse = (courseId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find({ course: courseId, isPublished: true }).populate('student', 'name profilePicture'), query)
        .sort()
        .paginate();
    const data = yield feedbackQuery.modelQuery;
    const pagination = yield feedbackQuery.getPaginationInfo();
    return { pagination, data };
});
const getAllFeedback = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find()
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
const togglePublish = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield feedback_model_1.Feedback.findById(id);
    if (!feedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Feedback not found');
    }
    const result = yield feedback_model_1.Feedback.findByIdAndUpdate(id, { isPublished: !feedback.isPublished }, { new: true });
    // Recalculate course rating (only published reviews count)
    yield recalculateCourseRating(feedback.course.toString());
    return result;
});
const respondToFeedback = (id, adminResponse) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield feedback_model_1.Feedback.findById(id);
    if (!feedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Feedback not found');
    }
    const result = yield feedback_model_1.Feedback.findByIdAndUpdate(id, { adminResponse, respondedAt: new Date() }, { new: true });
    return result;
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
    const feedbackQuery = new QueryBuilder_1.default(feedback_model_1.Feedback.find({ student: studentId }).populate('course', 'title slug thumbnail'), query)
        .sort()
        .paginate();
    const data = yield feedbackQuery.modelQuery;
    const pagination = yield feedbackQuery.getPaginationInfo();
    return { pagination, data };
});
// Helper: recalculate course rating from published feedback
const recalculateCourseRating = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield feedback_model_1.Feedback.aggregate([
        { $match: { course: courseId, isPublished: true } },
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
    getPublishedByCourse,
    getAllFeedback,
    togglePublish,
    respondToFeedback,
    deleteFeedback,
    getMyReviews,
};
