"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const course_controller_1 = require("./course.controller");
const course_validation_1 = require("./course.validation");
const router = express_1.default.Router();
// Create course
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)([{ name: 'thumbnail', maxCount: 1 }]), (0, validateRequest_1.default)(course_validation_1.CourseValidation.createCourseZodSchema), course_controller_1.CourseController.createCourse);
// Get all published courses (public)
router.get('/', course_controller_1.CourseController.getAllCourses);
// Get all courses for admin (all statuses)
router.get('/manage', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.getAdminCourses);
// Browse courses with enrollment status (student)
router.get('/browse', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), course_controller_1.CourseController.browseCourses);
// Get course detail for student (with enrollment + curriculum)
router.get('/:identifier/student-detail', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), course_controller_1.CourseController.getStudentCourseDetail);
// Get course by ID or slug (public)
router.get('/:identifier', course_controller_1.CourseController.getCourseByIdentifier);
// Update course (admin only)
router.patch('/:courseId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)([{ name: 'thumbnail', maxCount: 1 }]), (0, validateRequest_1.default)(course_validation_1.CourseValidation.updateCourseZodSchema), course_controller_1.CourseController.updateCourse);
// Delete course (admin only)
router.delete('/:courseId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.deleteCourse);
// ==================== MODULE ROUTES ====================
// Add module
router.post('/:courseId/modules', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(course_validation_1.CourseValidation.addModuleZodSchema), course_controller_1.CourseController.addModule);
// Reorder modules (MUST be before /:moduleId)
router.patch('/:courseId/modules/reorder', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(course_validation_1.CourseValidation.reorderModulesZodSchema), course_controller_1.CourseController.reorderModules);
// Update module
router.patch('/:courseId/modules/:moduleId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(course_validation_1.CourseValidation.updateModuleZodSchema), course_controller_1.CourseController.updateModule);
// Delete module
router.delete('/:courseId/modules/:moduleId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.deleteModule);
// ==================== LESSON ROUTES ====================
// Create lesson
router.post('/:courseId/modules/:moduleId/lessons', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)({
    maxFileSizeMB: 500,
    maxFilesTotal: 6,
    enforceAllowedFields: ['contentFile', 'attachments'],
    perFieldMaxCount: { contentFile: 1, attachments: 5 },
}), (0, validateRequest_1.default)(course_validation_1.CourseValidation.createLessonZodSchema), course_controller_1.CourseController.createLesson);
// Reorder lessons (MUST be before /:lessonId)
router.patch('/:courseId/modules/:moduleId/lessons/reorder', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(course_validation_1.CourseValidation.reorderLessonsZodSchema), course_controller_1.CourseController.reorderLessons);
// Get lessons by module (public)
router.get('/:courseId/modules/:moduleId/lessons', course_controller_1.CourseController.getLessonsByModule);
// Get single lesson (authenticated)
router.get('/:courseId/lessons/:lessonId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.getLessonById);
// Update lesson
router.patch('/:courseId/modules/:moduleId/lessons/:lessonId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)({
    maxFileSizeMB: 500,
    maxFilesTotal: 6,
    enforceAllowedFields: ['contentFile', 'attachments'],
    perFieldMaxCount: { contentFile: 1, attachments: 5 },
}), (0, validateRequest_1.default)(course_validation_1.CourseValidation.updateLessonZodSchema), course_controller_1.CourseController.updateLesson);
// Delete lesson
router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.deleteLesson);
// Toggle lesson visibility
router.patch('/:courseId/lessons/:lessonId/visibility', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), course_controller_1.CourseController.toggleLessonVisibility);
exports.CourseRoutes = router;
