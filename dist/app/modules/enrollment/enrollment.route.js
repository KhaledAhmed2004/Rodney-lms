"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const enrollment_controller_1 = require("./enrollment.controller");
const enrollment_validation_1 = require("./enrollment.validation");
const router = express_1.default.Router();
// Student routes
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(enrollment_validation_1.EnrollmentValidation.enrollInCourse), enrollment_controller_1.EnrollmentController.enrollInCourse);
router.post('/bulk', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(enrollment_validation_1.EnrollmentValidation.bulkEnroll), enrollment_controller_1.EnrollmentController.bulkEnroll);
router.get('/my-courses', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), enrollment_controller_1.EnrollmentController.getMyEnrollments);
// Admin routes
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), enrollment_controller_1.EnrollmentController.getAllEnrollments);
router.get('/course/:courseId/students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), enrollment_controller_1.EnrollmentController.getEnrolledStudents);
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), enrollment_controller_1.EnrollmentController.getEnrollmentById);
router.patch('/:id/status', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(enrollment_validation_1.EnrollmentValidation.updateStatus), enrollment_controller_1.EnrollmentController.updateStatus);
// Lesson completion
router.post('/:enrollmentId/lessons/:lessonId/complete', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(enrollment_validation_1.EnrollmentValidation.completeLesson), enrollment_controller_1.EnrollmentController.completeLesson);
exports.EnrollmentRoutes = router;
