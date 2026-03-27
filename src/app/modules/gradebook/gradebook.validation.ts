import { z } from 'zod';

const submitAssignment = z.object({
  params: z.object({
    lessonId: z.string({ required_error: 'Lesson ID is required' }),
  }),
  body: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    content: z.string().max(5000).optional(),
    attachments: z.array(z.string().min(1)).optional(),
  }),
});

export const GradebookValidation = { submitAssignment };
