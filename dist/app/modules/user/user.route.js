"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
const fileHandler_1 = require("../../middlewares/fileHandler");
const rateLimit_1 = require("../../middlewares/rateLimit");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Create a new user
router.post('/', (0, rateLimit_1.rateLimitMiddleware)({ windowMs: 60000, max: 20, routeName: 'create-user' }), (0, validateRequest_1.default)(user_validation_1.UserValidation.createUserZodSchema), user_controller_1.UserController.createUser);
// Get user own profile
router.get('/profile', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getUserProfile);
// Update user profile
router.patch('/profile', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)(['profilePicture']), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateUserZodSchema), user_controller_1.UserController.updateProfile);
// Complete onboarding (student only, idempotent)
router.patch('/onboarding/complete', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), user_controller_1.UserController.completeOnboarding);
// Get all users
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getAllUsers);
// Block a user
router.patch('/:id/block', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.blockUser);
// Unblock a user
router.patch('/:id/unblock', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.unblockUser);
// Export users (must be before /:id to avoid route conflict)
router.get('/export', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.exportUsers);
// User management stats (must be before /:id to avoid route conflict)
router.get('/stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getUserStats);
// Get a specific user by ID
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getUserById);
// Public user details (no auth required)
router.get('/:id/user', (0, rateLimit_1.rateLimitMiddleware)({ windowMs: 60000, max: 60, routeName: 'public-user-details' }), user_controller_1.UserController.getUserDetailsById);
// Admin update a user
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(user_validation_1.UserValidation.adminUpdateUserZodSchema), user_controller_1.UserController.updateUserByAdmin);
// Admin soft delete a user
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.deleteUser);
exports.UserRoutes = router;
