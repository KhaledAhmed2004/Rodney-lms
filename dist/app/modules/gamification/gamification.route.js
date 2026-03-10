"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const gamification_controller_1 = require("./gamification.controller");
const gamification_validation_1 = require("./gamification.validation");
const router = express_1.default.Router();
// Student routes
router.get('/leaderboard', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), gamification_controller_1.GamificationController.getLeaderboard);
router.get('/my-points', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), gamification_controller_1.GamificationController.getMyPoints);
router.get('/my-badges', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), gamification_controller_1.GamificationController.getMyBadges);
router.get('/my-summary', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), gamification_controller_1.GamificationController.getMySummary);
// Badge routes (shared)
router.get('/badges', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), gamification_controller_1.GamificationController.getAllBadges);
// Admin routes
router.post('/badges', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)(['icon']), (0, validateRequest_1.default)(gamification_validation_1.GamificationValidation.createBadge), gamification_controller_1.GamificationController.createBadge);
router.patch('/badges/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)(['icon']), (0, validateRequest_1.default)(gamification_validation_1.GamificationValidation.updateBadge), gamification_controller_1.GamificationController.updateBadge);
router.delete('/badges/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gamification_controller_1.GamificationController.deleteBadge);
router.post('/points/adjust', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(gamification_validation_1.GamificationValidation.adjustPoints), gamification_controller_1.GamificationController.adjustPoints);
router.get('/admin/stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), gamification_controller_1.GamificationController.getAdminStats);
exports.GamificationRoutes = router;
