import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { CourseController } from './course.controller';
import { CourseValidation } from './course.validation';

const router = express.Router();

// Create course
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  validateRequest(CourseValidation.createCourseZodSchema),
  CourseController.createCourse,
);

// Get all published courses (public)
router.get('/', CourseController.getAllCourses);

// Get all courses for admin (all statuses)
router.get(
  '/manage',
  auth(USER_ROLES.SUPER_ADMIN),
  CourseController.getAdminCourses,
);

// Get course by ID or slug (public)
router.get('/:identifier', CourseController.getCourseByIdentifier);

// Update course (admin only)
router.patch(
  '/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler([{ name: 'thumbnail', maxCount: 1 }]),
  validateRequest(CourseValidation.updateCourseZodSchema),
  CourseController.updateCourse,
);

// Delete course (admin only)
router.delete(
  '/:courseId',
  auth(USER_ROLES.SUPER_ADMIN),
  CourseController.deleteCourse,
);

// ==================== MODULE ROUTES ====================

// Add module
router.post(
  '/:courseId/modules',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.addModuleZodSchema),
  CourseController.addModule,
);

// Reorder modules (MUST be before /:moduleId)
router.patch(
  '/:courseId/modules/reorder',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.reorderModulesZodSchema),
  CourseController.reorderModules,
);

// Update module
router.patch(
  '/:courseId/modules/:moduleId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.updateModuleZodSchema),
  CourseController.updateModule,
);

// Delete module
router.delete(
  '/:courseId/modules/:moduleId',
  auth(USER_ROLES.SUPER_ADMIN),
  CourseController.deleteModule,
);

// ==================== LESSON ROUTES ====================

// Create lesson
router.post(
  '/:courseId/modules/:moduleId/lessons',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler({
    maxFileSizeMB: 500,
    maxFilesTotal: 6,
    enforceAllowedFields: ['contentFile', 'attachments'],
    perFieldMaxCount: { contentFile: 1, attachments: 5 },
  }),
  validateRequest(CourseValidation.createLessonZodSchema),
  CourseController.createLesson,
);

// Reorder lessons (MUST be before /:lessonId)
router.patch(
  '/:courseId/modules/:moduleId/lessons/reorder',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(CourseValidation.reorderLessonsZodSchema),
  CourseController.reorderLessons,
);

// Get lessons by module (public)
router.get(
  '/:courseId/modules/:moduleId/lessons',
  CourseController.getLessonsByModule,
);

// Get single lesson (authenticated)
router.get(
  '/:courseId/lessons/:lessonId',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CourseController.getLessonById,
);

// Update lesson
router.patch(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  auth(USER_ROLES.SUPER_ADMIN),
  fileHandler({
    maxFileSizeMB: 500,
    maxFilesTotal: 6,
    enforceAllowedFields: ['contentFile', 'attachments'],
    perFieldMaxCount: { contentFile: 1, attachments: 5 },
  }),
  validateRequest(CourseValidation.updateLessonZodSchema),
  CourseController.updateLesson,
);

// Delete lesson
router.delete(
  '/:courseId/modules/:moduleId/lessons/:lessonId',
  auth(USER_ROLES.SUPER_ADMIN),
  CourseController.deleteLesson,
);

// Toggle lesson visibility
router.patch(
  '/:courseId/lessons/:lessonId/visibility',
  auth(USER_ROLES.SUPER_ADMIN),
  CourseController.toggleLessonVisibility,
);

export const CourseRoutes = router;
