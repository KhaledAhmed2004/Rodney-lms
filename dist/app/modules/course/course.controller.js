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
exports.CourseController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const course_service_1 = require("./course.service");
// ==================== COURSE ====================
const getCourseOptions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield course_service_1.CourseService.getCourseOptions();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course options retrieved successfully',
        data: result,
    });
}));
const createCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield course_service_1.CourseService.createCourse(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Course created successfully',
        data: result,
    });
}));
const getAllCourses = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield course_service_1.CourseService.getAllCourses(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Courses retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const browseCourses = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield course_service_1.CourseService.browseCourses(userId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Courses retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getAdminCourses = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield course_service_1.CourseService.getAdminCourses(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Courses retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getStudentCourseDetail = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { identifier } = req.params;
    const userId = req.user.id;
    const result = yield course_service_1.CourseService.getStudentCourseDetail(identifier, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course detail retrieved successfully',
        data: result,
    });
}));
const getCourseByIdentifier = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { identifier } = req.params;
    const result = yield course_service_1.CourseService.getCourseByIdentifier(identifier);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course retrieved successfully',
        data: result,
    });
}));
const updateCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.params;
    const result = yield course_service_1.CourseService.updateCourse(courseId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course updated successfully',
        data: result,
    });
}));
const deleteCourse = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.params;
    yield course_service_1.CourseService.deleteCourse(courseId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course deleted successfully',
    });
}));
// ==================== MODULE ====================
const addModule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.params;
    const result = yield course_service_1.CourseService.addModule(courseId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Module added successfully',
        data: result,
    });
}));
const updateModule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId } = req.params;
    const result = yield course_service_1.CourseService.updateModule(courseId, moduleId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Module updated successfully',
        data: result,
    });
}));
const reorderModules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.params;
    const result = yield course_service_1.CourseService.reorderModules(courseId, req.body.moduleOrder);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Modules reordered successfully',
        data: result,
    });
}));
const deleteModule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId } = req.params;
    yield course_service_1.CourseService.deleteModule(courseId, moduleId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Module deleted successfully',
    });
}));
// ==================== LESSON ====================
const createLesson = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId } = req.params;
    const result = yield course_service_1.CourseService.createLesson(courseId, moduleId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Lesson created successfully',
        data: result,
    });
}));
const getLessonsByModule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId } = req.params;
    const result = yield course_service_1.CourseService.getLessonsByModule(courseId, moduleId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lessons retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getLessonById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, lessonId } = req.params;
    const result = yield course_service_1.CourseService.getLessonById(courseId, lessonId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lesson retrieved successfully',
        data: result,
    });
}));
const updateLesson = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId, lessonId } = req.params;
    const result = yield course_service_1.CourseService.updateLesson(courseId, moduleId, lessonId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lesson updated successfully',
        data: result,
    });
}));
const reorderLessons = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId } = req.params;
    const result = yield course_service_1.CourseService.reorderLessons(courseId, moduleId, req.body.lessonOrder);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lessons reordered successfully',
        data: result,
    });
}));
const deleteLesson = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, moduleId, lessonId } = req.params;
    yield course_service_1.CourseService.deleteLesson(courseId, moduleId, lessonId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Lesson deleted successfully',
    });
}));
const toggleLessonVisibility = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, lessonId } = req.params;
    const result = yield course_service_1.CourseService.toggleLessonVisibility(courseId, lessonId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `Lesson is now ${(result === null || result === void 0 ? void 0 : result.isVisible) ? 'visible' : 'hidden'}`,
        data: result,
    });
}));
exports.CourseController = {
    getCourseOptions,
    createCourse,
    getAllCourses,
    browseCourses,
    getStudentCourseDetail,
    getAdminCourses,
    getCourseByIdentifier,
    updateCourse,
    deleteCourse,
    addModule,
    updateModule,
    reorderModules,
    deleteModule,
    createLesson,
    getLessonsByModule,
    getLessonById,
    updateLesson,
    reorderLessons,
    deleteLesson,
    toggleLessonVisibility,
};
