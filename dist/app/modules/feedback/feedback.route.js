"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const feedback_controller_1 = require("./feedback.controller");
const feedback_validation_1 = require("./feedback.validation");
const router = express_1.default.Router();
// Student routes
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(feedback_validation_1.FeedbackValidation.createFeedback), feedback_controller_1.FeedbackController.createFeedback);
router.get('/my-reviews', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), feedback_controller_1.FeedbackController.getMyReviews);
// Public
router.get('/course/:courseId', feedback_controller_1.FeedbackController.getPublishedByCourse);
// Admin routes
router.get('/admin/all', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), feedback_controller_1.FeedbackController.getAllFeedback);
router.patch('/:id/publish', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), feedback_controller_1.FeedbackController.togglePublish);
router.patch('/:id/respond', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(feedback_validation_1.FeedbackValidation.respondToFeedback), feedback_controller_1.FeedbackController.respondToFeedback);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), feedback_controller_1.FeedbackController.deleteFeedback);
exports.FeedbackRoutes = router;
