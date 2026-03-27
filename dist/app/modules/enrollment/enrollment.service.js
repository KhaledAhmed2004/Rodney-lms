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
exports.EnrollmentService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const enrollment_model_1 = require("./enrollment.model");
const course_model_1 = require("../course/course.model");
const course_model_2 = require("../course/course.model");
const enrollInCourse = (studentId, courseId) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if course exists and is published
    const course = yield course_model_1.Course.findById(courseId);
    if (!course) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
    }
    if (course.status !== 'PUBLISHED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Course is not available for enrollment');
    }
    // Check if already enrolled
    const existing = yield enrollment_model_1.Enrollment.findOne({
        student: studentId,
        course: courseId,
    });
    if (existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Already enrolled in this course');
    }
    try {
        const result = yield enrollment_model_1.Enrollment.create({
            student: studentId,
            course: courseId,
        });
        // Increment enrollmentCount
        yield course_model_1.Course.findByIdAndUpdate(courseId, {
            $inc: { enrollmentCount: 1 },
        });
        return result;
    }
    catch (error) {
        // Race condition: concurrent double-click
        if (error.code === 11000) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Already enrolled in this course');
        }
        throw error;
    }
});
const bulkEnroll = (studentId, courseIds) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Deduplicate input
    const uniqueIds = [...new Set(courseIds)];
    // Batch: find existing enrollments
    const existing = yield enrollment_model_1.Enrollment.find({
        student: studentId,
        course: { $in: uniqueIds },
    })
        .select('course')
        .lean();
    const enrolledSet = new Set(existing.map(e => e.course.toString()));
    // Batch: find valid published courses
    const courses = yield course_model_1.Course.find({
        _id: { $in: uniqueIds },
        status: 'PUBLISHED',
    })
        .select('_id')
        .lean();
    const validSet = new Set(courses.map(c => c._id.toString()));
    // Filter to new, valid enrollments only
    const toEnroll = uniqueIds.filter(id => validSet.has(id) && !enrolledSet.has(id));
    if (toEnroll.length > 0) {
        // Bulk insert with ordered:false — skip duplicate key errors from race conditions
        try {
            yield enrollment_model_1.Enrollment.insertMany(toEnroll.map(courseId => ({ student: studentId, course: courseId })), { ordered: false });
        }
        catch (err) {
            // Only ignore duplicate key errors (race condition)
            if (err.code !== 11000 &&
                !((_a = err.writeErrors) === null || _a === void 0 ? void 0 : _a.every((e) => e.code === 11000))) {
                throw err;
            }
        }
        // Increment enrollmentCount on each enrolled course (+1 each)
        yield course_model_1.Course.updateMany({ _id: { $in: toEnroll } }, { $inc: { enrollmentCount: 1 } });
    }
    return {
        enrolledCount: toEnroll.length,
        skippedCount: uniqueIds.length - toEnroll.length,
    };
});
const getAllEnrollments = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const enrollmentQuery = new QueryBuilder_1.default(enrollment_model_1.Enrollment.find()
        .populate('student', 'name email profilePicture')
        .populate('course', 'title slug thumbnail'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield enrollmentQuery.modelQuery;
    const pagination = yield enrollmentQuery.getPaginationInfo();
    return { pagination, data };
});
const getMyEnrollments = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const enrollmentQuery = new QueryBuilder_1.default(enrollment_model_1.Enrollment.find({ student: studentId }).populate('course', 'title slug thumbnail totalLessons totalDuration'), query)
        .filter()
        .sort()
        .paginate();
    const data = yield enrollmentQuery.modelQuery;
    const pagination = yield enrollmentQuery.getPaginationInfo();
    return { pagination, data };
});
const getEnrollmentById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield enrollment_model_1.Enrollment.findById(id)
        .populate('student', 'name email profilePicture')
        .populate('course', 'title slug thumbnail totalLessons totalDuration');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Enrollment not found');
    }
    return result;
});
const updateStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const enrollment = yield enrollment_model_1.Enrollment.findById(id);
    if (!enrollment) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Enrollment not found');
    }
    const updateData = { status };
    if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
    }
    const result = yield enrollment_model_1.Enrollment.findByIdAndUpdate(id, updateData, {
        new: true,
    });
    return result;
});
const completeLesson = (enrollmentId, lessonId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const enrollment = yield enrollment_model_1.Enrollment.findById(enrollmentId);
    if (!enrollment) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Enrollment not found');
    }
    if (enrollment.student.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized');
    }
    // Check if lesson already completed
    const alreadyCompleted = enrollment.progress.completedLessons.some(l => l.toString() === lessonId);
    if (alreadyCompleted) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Lesson already completed');
    }
    // Get total lessons for the course to calculate percentage
    const totalLessons = yield course_model_2.Lesson.countDocuments({
        courseId: enrollment.course,
    });
    const newCompletedCount = enrollment.progress.completedLessons.length + 1;
    const completionPercentage = totalLessons > 0 ? Math.round((newCompletedCount / totalLessons) * 100) : 0;
    const updateData = {
        $addToSet: { 'progress.completedLessons': lessonId },
        $set: {
            'progress.lastAccessedLesson': lessonId,
            'progress.lastAccessedAt': new Date(),
            'progress.completionPercentage': completionPercentage,
        },
    };
    // Auto-complete enrollment if all lessons done
    if (completionPercentage >= 100) {
        updateData.$set['status'] = 'COMPLETED';
        updateData.$set['completedAt'] = new Date();
    }
    const result = yield enrollment_model_1.Enrollment.findByIdAndUpdate(enrollmentId, updateData, {
        new: true,
    });
    return result;
});
const getEnrolledStudents = (courseId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const enrollmentQuery = new QueryBuilder_1.default(enrollment_model_1.Enrollment.find({ course: courseId }).populate('student', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate();
    const data = yield enrollmentQuery.modelQuery;
    const pagination = yield enrollmentQuery.getPaginationInfo();
    return { pagination, data };
});
exports.EnrollmentService = {
    enrollInCourse,
    bulkEnroll,
    getAllEnrollments,
    getMyEnrollments,
    getEnrollmentById,
    updateStatus,
    completeLesson,
    getEnrolledStudents,
};
