"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const quiz_controller_1 = require("./quiz.controller");
const quiz_validation_1 = require("./quiz.validation");
const router = express_1.default.Router();
// ==================== STUDENT ROUTES ====================
router.get('/my-attempts', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), quiz_controller_1.QuizController.getMyAttempts);
router.get('/:id/student-view', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), quiz_controller_1.QuizController.getStudentView);
router.post('/:id/attempts', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(quiz_validation_1.QuizValidation.startAttempt), quiz_controller_1.QuizController.startAttempt);
router.patch('/attempts/:attemptId/submit', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(quiz_validation_1.QuizValidation.submitAttempt), quiz_controller_1.QuizController.submitAttempt);
router.get('/attempts/:attemptId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), quiz_controller_1.QuizController.getAttemptById);
// ==================== ADMIN ROUTES ====================
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(quiz_validation_1.QuizValidation.createQuiz), quiz_controller_1.QuizController.createQuiz);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), quiz_controller_1.QuizController.getAllQuizzes);
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), quiz_controller_1.QuizController.getQuizById);
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(quiz_validation_1.QuizValidation.updateQuiz), quiz_controller_1.QuizController.updateQuiz);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), quiz_controller_1.QuizController.deleteQuiz);
// Attempts (admin view)
router.get('/:id/attempts', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), quiz_controller_1.QuizController.getQuizAttempts);
exports.QuizRoutes = router;
