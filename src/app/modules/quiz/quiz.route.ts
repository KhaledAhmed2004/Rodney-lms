import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { QuizController } from './quiz.controller';
import { QuizValidation } from './quiz.validation';

const router = express.Router();

// ==================== STUDENT ROUTES ====================
router.get(
  '/my-attempts',
  auth(USER_ROLES.STUDENT),
  QuizController.getMyAttempts,
);

router.get(
  '/:id/student-view',
  auth(USER_ROLES.STUDENT),
  QuizController.getStudentView,
);

router.post(
  '/:id/attempts',
  auth(USER_ROLES.STUDENT),
  QuizController.startAttempt,
);

router.patch(
  '/attempts/:attemptId/submit',
  auth(USER_ROLES.STUDENT),
  validateRequest(QuizValidation.submitAttempt),
  QuizController.submitAttempt,
);

router.get(
  '/attempts/:attemptId',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  QuizController.getAttemptById,
);

// ==================== ADMIN ROUTES ====================
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(QuizValidation.createQuiz),
  QuizController.createQuiz,
);

router.get(
  '/course/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  QuizController.getQuizzesByCourse,
);

router.get('/:id', auth(USER_ROLES.SUPER_ADMIN), QuizController.getQuizById);

router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(QuizValidation.updateQuiz),
  QuizController.updateQuiz,
);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN), QuizController.deleteQuiz);

// Question management
router.post(
  '/:id/questions',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(QuizValidation.addQuestion),
  QuizController.addQuestion,
);

router.patch(
  '/:id/questions/reorder',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(QuizValidation.reorderQuestions),
  QuizController.reorderQuestions,
);

router.patch(
  '/:id/questions/:questionId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(QuizValidation.updateQuestion),
  QuizController.updateQuestion,
);

router.delete(
  '/:id/questions/:questionId',
  auth(USER_ROLES.SUPER_ADMIN),
  QuizController.deleteQuestion,
);

// Attempts (admin view)
router.get(
  '/:id/attempts',
  auth(USER_ROLES.SUPER_ADMIN),
  QuizController.getQuizAttempts,
);

export const QuizRoutes = router;
