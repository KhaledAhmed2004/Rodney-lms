import { z } from 'zod';

const updateGrade = z.object({
  params: z.object({
    gradeId: z.string({ required_error: 'Grade ID is required' }),
  }),
  body: z.object({
    score: z.number().min(0).optional(),
    feedback: z.string().max(5000).optional(),
    status: z.enum(['PENDING', 'GRADED', 'RETURNED']).optional(),
  }),
});

const submitAssignment = z.object({
  params: z.object({
    lessonId: z.string({ required_error: 'Lesson ID is required' }),
  }),
  body: z.object({
    content: z.string().optional(),
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

export const GradebookValidation = { updateGrade, submitAssignment };
