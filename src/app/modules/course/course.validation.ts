import { z } from 'zod';
import { COURSE_STATUS, LESSON_TYPE } from './course.interface';

// ==================== COURSE ====================

const createCourseZodSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Course title is required' })
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    description: z.string().max(5000).optional(),
    status: z.enum([COURSE_STATUS.DRAFT, COURSE_STATUS.SCHEDULED]).optional(),
    publishScheduledAt: z
      .string()
      .datetime('Invalid date format')
      .refine((val) => new Date(val) > new Date(), {
        message: 'Scheduled publish date must be in the future',
      })
      .optional(),
    thumbnail: z.string().optional(),
  }),
});

const updateCourseZodSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(5000).optional(),
    status: z
      .enum([
        COURSE_STATUS.DRAFT,
        COURSE_STATUS.PUBLISHED,
        COURSE_STATUS.ARCHIVED,
        COURSE_STATUS.SCHEDULED,
      ])
      .optional(),
    publishScheduledAt: z.string().datetime().optional(),
    thumbnail: z.string().optional(),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

// ==================== MODULE ====================

const addModuleZodSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Module title is required' })
      .min(1, 'Module title cannot be empty')
      .max(200),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

const updateModuleZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    moduleId: z.string({ required_error: 'Module ID is required' }),
  }),
});

const reorderModulesZodSchema = z.object({
  body: z.object({
    moduleOrder: z
      .array(z.string(), { required_error: 'Module order array is required' })
      .min(1),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

// ==================== LESSON ====================

const createLessonZodSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Lesson title is required' })
      .min(1)
      .max(300),
    type: z.enum(
      [LESSON_TYPE.VIDEO, LESSON_TYPE.READING, LESSON_TYPE.ASSIGNMENT],
      { required_error: 'Lesson type is required' }
    ),
    description: z.string().max(10000).optional(),
    learningObjectives: z.array(z.string().max(500)).max(20).optional(),
    isVisible: z.coerce.boolean().optional(),
    prerequisiteLesson: z.string().optional(),
    readingContent: z.string().optional(),
    assignmentInstructions: z.string().optional(),
    contentFile: z.string().optional(),
    attachments: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    moduleId: z.string({ required_error: 'Module ID is required' }),
  }),
});

const updateLessonZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(300).optional(),
    type: z
      .enum([LESSON_TYPE.VIDEO, LESSON_TYPE.READING, LESSON_TYPE.ASSIGNMENT])
      .optional(),
    description: z.string().max(10000).optional(),
    learningObjectives: z.array(z.string().max(500)).max(20).optional(),
    isVisible: z.coerce.boolean().optional(),
    prerequisiteLesson: z.string().nullable().optional(),
    readingContent: z.string().optional(),
    assignmentInstructions: z.string().optional(),
    contentFile: z.string().optional(),
    attachments: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    moduleId: z.string({ required_error: 'Module ID is required' }),
    lessonId: z.string({ required_error: 'Lesson ID is required' }),
  }),
});

const reorderLessonsZodSchema = z.object({
  body: z.object({
    lessonOrder: z
      .array(z.string(), { required_error: 'Lesson order array is required' })
      .min(1),
  }),
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    moduleId: z.string({ required_error: 'Module ID is required' }),
  }),
});

export const CourseValidation = {
  createCourseZodSchema,
  updateCourseZodSchema,
  addModuleZodSchema,
  updateModuleZodSchema,
  reorderModulesZodSchema,
  createLessonZodSchema,
  updateLessonZodSchema,
  reorderLessonsZodSchema,
};
