import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentValidation } from './enrollment.validation';

const router = express.Router();

// Student routes
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(EnrollmentValidation.enrollInCourse),
  EnrollmentController.enrollInCourse,
);

router.post(
  '/bulk',
  auth(USER_ROLES.STUDENT),
  validateRequest(EnrollmentValidation.bulkEnroll),
  EnrollmentController.bulkEnroll,
);

router.get(
  '/my-courses',
  auth(USER_ROLES.STUDENT),
  EnrollmentController.getMyEnrollments,
);

// Admin routes
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  EnrollmentController.getAllEnrollments,
);

router.get(
  '/course/:courseId/students',
  auth(USER_ROLES.SUPER_ADMIN),
  EnrollmentController.getEnrolledStudents,
);

router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  EnrollmentController.getEnrollmentById,
);

router.patch(
  '/:id/status',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(EnrollmentValidation.updateStatus),
  EnrollmentController.updateStatus,
);

// Lesson completion
router.post(
  '/:enrollmentId/lessons/:lessonId/complete',
  auth(USER_ROLES.STUDENT),
  validateRequest(EnrollmentValidation.completeLesson),
  EnrollmentController.completeLesson,
);

export const EnrollmentRoutes = router;
