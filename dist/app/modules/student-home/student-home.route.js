"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentHomeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const student_home_controller_1 = require("./student-home.controller");
const router = express_1.default.Router();
router.get('/home', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), student_home_controller_1.StudentHomeController.getHome);
router.get('/progress', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), student_home_controller_1.StudentHomeController.getProgress);
exports.StudentHomeRoutes = router;
