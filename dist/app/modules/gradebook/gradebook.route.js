"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const gradebook_controller_1 = require("./gradebook.controller");
const router = express_1.default.Router();
// Student routes
router.get('/my-grades', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), gradebook_controller_1.GradebookController.getMyGrades);
// Admin routes (fixed paths before shorter paths)
router.get('/students/summary', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.getGradebookSummary);
router.get('/students/export', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.exportStudentGradebook);
router.get('/students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gradebook_controller_1.GradebookController.getAllStudentGradebook);
exports.GradebookRoutes = router;
