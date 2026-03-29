import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { GamificationController } from './gamification.controller';
import { GamificationValidation } from './gamification.validation';

const router = express.Router();

// Student routes
router.get(
  '/leaderboard',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  GamificationController.getLeaderboard,
);

router.get(
  '/my-points',
  auth(USER_ROLES.STUDENT),
  GamificationController.getMyPoints,
);

router.get(
  '/my-badges',
  auth(USER_ROLES.STUDENT),
  GamificationController.getMyBadges,
);

router.get(
  '/my-summary',
  auth(USER_ROLES.STUDENT),
  GamificationController.getMySummary,
);

// Badge routes (shared)
router.get(
  '/badges',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  GamificationController.getAllBadges,
);

// Single badge (detail view for edit)
router.get(
  '/badges/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  GamificationController.getBadgeById,
);

// Admin routes
router.patch(
  '/badges/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'icon', maxCount: 1 }]),
  validateRequest(GamificationValidation.updateBadge),
  GamificationController.updateBadge,
);

router.get(
  '/admin/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  GamificationController.getAdminStats,
);

export const GamificationRoutes = router;
