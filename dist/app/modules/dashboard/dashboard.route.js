"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const dashboard_controller_1 = require("./dashboard.controller");
const router = express_1.default.Router();
router.get('/summary', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), dashboard_controller_1.DashboardController.getSummary);
router.get('/trends', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), dashboard_controller_1.DashboardController.getTrends);
router.get('/recent-activity', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), dashboard_controller_1.DashboardController.getRecentActivity);
exports.DashboardRoutes = router;
