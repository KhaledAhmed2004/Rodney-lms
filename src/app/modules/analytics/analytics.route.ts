import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsValidation } from './analytics.validation';

const router = express.Router();

router.get(
  '/course-completion',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AnalyticsValidation.periodQuerySchema),
  AnalyticsController.getCourseCompletion,
);
router.get(
  '/engagement-heatmap',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AnalyticsValidation.periodQuerySchema),
  AnalyticsController.getEngagementHeatmap,
);
router.get(
  '/export',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AnalyticsValidation.exportQuerySchema),
  AnalyticsController.exportAnalytics,
);
router.get(
  '/courses/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AnalyticsValidation.courseIdParamSchema),
  AnalyticsController.getCourseAnalytics,
);
router.get(
  '/courses/:courseId/quizzes',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AnalyticsValidation.courseQuizQuerySchema),
  AnalyticsController.getQuizPerformance,
);

export const AnalyticsRoutes = router;
