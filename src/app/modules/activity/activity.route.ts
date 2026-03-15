import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ActivityController } from './activity.controller';
import { ActivityValidation } from './activity.validation';

const router = express.Router();

// Student routes
router.get(
  '/calendar',
  auth(USER_ROLES.STUDENT),
  validateRequest(ActivityValidation.getCalendar),
  ActivityController.getCalendar,
);

router.get('/streak', auth(USER_ROLES.STUDENT), ActivityController.getStreak);

// Admin routes
router.get(
  '/admin/overview',
  auth(USER_ROLES.SUPER_ADMIN),
  ActivityController.getAdminOverview,
);

export const ActivityRoutes = router;
