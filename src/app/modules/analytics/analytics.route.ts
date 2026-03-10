import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { AnalyticsController } from './analytics.controller';

const router = express.Router();

router.get(
  '/user-engagement',
  auth(USER_ROLES.SUPER_ADMIN),
  AnalyticsController.getUserEngagement,
);
router.get(
  '/course-completion',
  auth(USER_ROLES.SUPER_ADMIN),
  AnalyticsController.getCourseCompletion,
);
router.get(
  '/quiz-performance',
  auth(USER_ROLES.SUPER_ADMIN),
  AnalyticsController.getQuizPerformance,
);
router.get(
  '/courses/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  AnalyticsController.getCourseAnalytics,
);
router.get(
  '/students/:studentId',
  auth(USER_ROLES.SUPER_ADMIN),
  AnalyticsController.getStudentAnalytics,
);

export const AnalyticsRoutes = router;
