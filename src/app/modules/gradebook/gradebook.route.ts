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

// Admin routes
router.get(
  '/courses/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.getGradesByCourse,
);

router.get(
  '/courses/:courseId/summary',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.getCourseSummary,
);

router.get(
  '/students/:studentId',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.STUDENT),
  GradebookController.getGradesByStudent,
);

router.patch(
  '/grades/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradebookValidation.updateGrade),
  GradebookController.updateGrade,
);

router.get(
  '/assignments/course/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  GradebookController.getAssignmentsByCourse,
);

export const GradebookRoutes = router;
