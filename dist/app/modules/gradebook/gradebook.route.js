"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const gradebook_controller_1 = require("./gradebook.controller");
const gradebook_validation_1 = require("./gradebook.validation");
const router = express_1.default.Router();
// Student routes
router.get('/my-grades', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), gradebook_controller_1.GradebookController.getMyGrades);
router.post('/assignments/:lessonId/submit', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(gradebook_validation_1.GradebookValidation.submitAssignment), gradebook_controller_1.GradebookController.submitAssignment);
// Admin routes (fixed paths before shorter paths)
router.get('/students/summary', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.getGradebookSummary);
router.get('/students/export', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.exportStudentGradebook);
router.get('/students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.getAllStudentGradebook);
exports.GradebookRoutes = router;
