import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { GradebookController } from './gradebook.controller';
import { GradebookValidation } from './gradebook.validation';

const router = express.Router();

// Student routes
router.get(
  '/my-grades',
  auth(USER_ROLES.STUDENT),
  GradebookController.getMyGrades,
);

router.post(
  '/assignments/:lessonId/submit',
  auth(USER_ROLES.STUDENT),
  validateRequest(GradebookValidation.submitAssignment),
  GradebookController.submitAssignment,
);

// Admin routes (fixed paths before shorter paths)
router.get(
  '/students/summary',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.getGradebookSummary,
);

router.get(
  '/students/export',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.exportStudentGradebook,
);

router.get(
  '/students',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.getAllStudentGradebook,
);

export const GradebookRoutes = router;
