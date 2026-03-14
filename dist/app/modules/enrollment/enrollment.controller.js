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
exports.EnrollmentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const enrollment_service_1 = require("./enrollment.service");
const enrollInCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield enrollment_service_1.EnrollmentService.enrollInCourse(userId, req.body.courseId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Enrolled successfully',
        data: result,
    });
}));
const bulkEnroll = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield enrollment_service_1.EnrollmentService.bulkEnroll(userId, req.body.courseIds);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: `Enrolled in ${result.enrolledCount} course(s) successfully`,
        data: result,
    });
}));
const getAllEnrollments = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield enrollment_service_1.EnrollmentService.getAllEnrollments(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Enrollments retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getMyEnrollments = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield enrollment_service_1.EnrollmentService.getMyEnrollments(userId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'My enrollments retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getEnrollmentById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield enrollment_service_1.EnrollmentService.getEnrollmentById(req.params.id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Enrollment retrieved successfully',
        data: result,
    });
}));
const updateStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield enrollment_service_1.EnrollmentService.updateStatus(req.params.id, req.body.status);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Enrollment status updated successfully',
        data: result,
    });
}));
const completeLesson = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { enrollmentId, lessonId } = req.params;
    const result = yield enrollment_service_1.EnrollmentService.completeLesson(enrollmentId, lessonId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lesson completed successfully',
        data: result,
    });
}));
const getEnrolledStudents = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield enrollment_service_1.EnrollmentService.getEnrolledStudents(req.params.courseId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Enrolled students retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
exports.EnrollmentController = {
    enrollInCourse,
    bulkEnroll,
    getAllEnrollments,
    getMyEnrollments,
    getEnrollmentById,
    updateStatus,
    completeLesson,
    getEnrolledStudents,
};
