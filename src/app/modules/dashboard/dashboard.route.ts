import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get(
  '/summary',
  auth(USER_ROLES.SUPER_ADMIN),
  DashboardController.getSummary,
);
router.get(
  '/trends',
  auth(USER_ROLES.SUPER_ADMIN),
  DashboardController.getTrends,
);
router.get(
  '/recent-activity',
  auth(USER_ROLES.SUPER_ADMIN),
  DashboardController.getRecentActivity,
);

export const DashboardRoutes = router;
