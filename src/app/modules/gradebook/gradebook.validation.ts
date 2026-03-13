import { z } from 'zod';

const submitAssignment = z.object({
  params: z.object({
    lessonId: z.string({ required_error: 'Lesson ID is required' }),
  }),
  body: z.object({
    content: z.string().optional(),
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

export const GradebookValidation = { submitAssignment };
