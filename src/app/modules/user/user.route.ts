import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { fileHandler } from '../../middlewares/fileHandler';
import { rateLimitMiddleware } from '../../middlewares/rateLimit';
import express from 'express';

const router = express.Router();

// Create a new user
router.post(
  '/',
  rateLimitMiddleware({ windowMs: 60_000, max: 20, routeName: 'create-user' }),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

// Get user own profile
router.get(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  UserController.getUserProfile
);

// Update user profile
router.patch(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  fileHandler(['profilePicture']),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateProfile
);

// Complete onboarding (student only, idempotent)
router.patch(
  '/onboarding/complete',
  auth(USER_ROLES.STUDENT),
  UserController.completeOnboarding
);

// Get all users
router.get('/', auth(USER_ROLES.SUPER_ADMIN), UserController.getAllUsers);


// Block a user
router.patch(
  '/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockUser
);

// Unblock a user
router.patch(
  '/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockUser
);

// Export users (must be before /:id to avoid route conflict)
router.get('/export', auth(USER_ROLES.SUPER_ADMIN), UserController.exportUsers);

// User management stats (must be before /:id to avoid route conflict)
router.get('/stats', auth(USER_ROLES.SUPER_ADMIN), UserController.getUserStats);

// Get a specific user by ID
router.get('/:id', auth(USER_ROLES.SUPER_ADMIN), UserController.getUserById);

// Public user details (no auth required)
router.get(
  '/:id/user',
  rateLimitMiddleware({ windowMs: 60_000, max: 60, routeName: 'public-user-details' }),
  UserController.getUserDetailsById
);

// Admin update a user
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(UserValidation.adminUpdateUserZodSchema),
  UserController.updateUserByAdmin
);

// Admin soft delete a user
router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN), UserController.deleteUser);

export const UserRoutes = router;
