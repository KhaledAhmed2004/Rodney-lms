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
exports.GradebookController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const ExportBuilder_1 = __importDefault(require("../../builder/ExportBuilder"));
const gradebook_service_1 = require("./gradebook.service");
const getGradesByCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield gradebook_service_1.GradebookService.getGradesByCourse(req.params.courseId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grades retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getGradesByStudent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield gradebook_service_1.GradebookService.getGradesByStudent(req.params.studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Student grades retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getCourseSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield gradebook_service_1.GradebookService.getCourseSummary(req.params.courseId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grade summary retrieved successfully',
        data: result,
    });
}));
const updateGrade = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield gradebook_service_1.GradebookService.updateGrade(req.params.gradeId, userId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grade updated successfully',
        data: result,
    });
}));
const submitAssignment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield gradebook_service_1.GradebookService.submitAssignment(req.params.lessonId, userId, req.body.courseId, req.body.content, req.body.attachments);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Assignment submitted successfully',
        data: result,
    });
}));
const getAssignmentsByCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield gradebook_service_1.GradebookService.getAssignmentsByCourse(req.params.courseId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Assignments retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getMyGrades = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield gradebook_service_1.GradebookService.getMyGrades(userId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'My grades retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getAllStudentGradebook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield gradebook_service_1.GradebookService.getAllStudentGradebook(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Student gradebook retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const exportStudentGradebook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield gradebook_service_1.GradebookService.exportStudentGradebook(req.query);
    const format = req.query.format === 'xlsx' ? 'excel' : 'csv';
    const filename = `student-gradebook-${new Date().toISOString().slice(0, 10)}`;
    yield new ExportBuilder_1.default(data)
        .format(format)
        .columns([
        { key: 'studentName', header: 'Student Name', width: 20 },
        { key: 'studentEmail', header: 'Email', width: 30 },
        { key: 'courseTitle', header: 'Course', width: 30 },
        { key: 'quizScores', header: 'Quiz Scores', width: 40 },
        { key: 'overallQuizPercentage', header: 'Overall Quiz %', width: 15 },
        { key: 'completionPercentage', header: 'Completion %', width: 15 },
    ])
        .sendResponse(res, filename);
}));
exports.GradebookController = {
    getGradesByCourse,
    getGradesByStudent,
    getCourseSummary,
    updateGrade,
    submitAssignment,
    getAssignmentsByCourse,
    getMyGrades,
    getAllStudentGradebook,
    exportStudentGradebook,
};
