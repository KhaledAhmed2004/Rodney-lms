"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const community_controller_1 = require("./community.controller");
const community_validation_1 = require("./community.validation");
const router = express_1.default.Router();
// Admin
router.get('/admin/flagged', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.getFlaggedPosts);
// Posts
router.post('/posts', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)(['image']), (0, validateRequest_1.default)(community_validation_1.CommunityValidation.createPost), community_controller_1.CommunityController.createPost);
router.get('/posts', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.getAllPosts);
router.get('/posts/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.getPostById);
router.delete('/posts/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.deletePost);
// Likes
router.post('/posts/:id/like', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.toggleLike);
// Replies
router.post('/posts/:id/replies', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(community_validation_1.CommunityValidation.createReply), community_controller_1.CommunityController.createReply);
router.delete('/replies/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), community_controller_1.CommunityController.deleteReply);
exports.CommunityRoutes = router;
