"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const activity_controller_1 = require("./activity.controller");
const router = express_1.default.Router();
// Student routes
router.get('/calendar', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), activity_controller_1.ActivityController.getCalendar);
router.get('/streak', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), activity_controller_1.ActivityController.getStreak);
// Admin routes
router.get('/admin/overview', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), activity_controller_1.ActivityController.getAdminOverview);
exports.ActivityRoutes = router;
