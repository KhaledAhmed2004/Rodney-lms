import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const enrollInCourse = z.object({
  body: z.object({
    courseId: z
      .string({ required_error: 'Course ID is required' })
      .regex(objectIdRegex, 'Invalid course ID format'),
  }),
});

const bulkEnroll = z.object({
  body: z.object({
    courseIds: z
      .array(
        z
          .string({ required_error: 'Course ID is required' })
          .regex(objectIdRegex, 'Invalid course ID format'),
      )
      .min(1, 'At least one course is required')
      .max(20, 'Cannot enroll in more than 20 courses at once')
      .refine(ids => new Set(ids).size === ids.length, {
        message: 'Duplicate course IDs are not allowed',
      }),
  }),
});

const updateStatus = z.object({
  params: z.object({
    id: z.string({ required_error: 'Enrollment ID is required' }),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'SUSPENDED']),
  }),
});

const completeLesson = z.object({
  params: z.object({
    enrollmentId: z.string({ required_error: 'Enrollment ID is required' }),
    lessonId: z.string({ required_error: 'Lesson ID is required' }),
  }),
});

export const EnrollmentValidation = {
  enrollInCourse,
  bulkEnroll,
  updateStatus,
  completeLesson,
};
