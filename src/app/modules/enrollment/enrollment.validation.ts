import { z } from 'zod';

const enrollInCourse = z.object({
  body: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

const bulkEnroll = z.object({
  body: z.object({
    courseIds: z
      .array(z.string({ required_error: 'Course ID is required' }))
      .min(1, 'At least one course is required'),
  }),
});

const updateStatus = z.object({
  params: z.object({
    id: z.string({ required_error: 'Enrollment ID is required' }),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED']),
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
