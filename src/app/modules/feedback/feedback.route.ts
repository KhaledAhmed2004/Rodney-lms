import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { FeedbackController } from './feedback.controller';
import { FeedbackValidation } from './feedback.validation';

const router = express.Router();

// Student routes
router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(FeedbackValidation.createFeedback),
  FeedbackController.createFeedback,
);

router.get(
  '/my-reviews',
  auth(USER_ROLES.STUDENT),
  FeedbackController.getMyReviews,
);

// Public
router.get('/course/:courseId', FeedbackController.getPublishedByCourse);

// Admin routes
router.get(
  '/admin/all',
  auth(USER_ROLES.SUPER_ADMIN),
  FeedbackController.getAllFeedback,
);

router.patch(
  '/:id/publish',
  auth(USER_ROLES.SUPER_ADMIN),
  FeedbackController.togglePublish,
);

router.patch(
  '/:id/respond',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(FeedbackValidation.respondToFeedback),
  FeedbackController.respondToFeedback,
);

router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  FeedbackController.deleteFeedback,
);

export const FeedbackRoutes = router;
