import { z } from 'zod';

const periodQuerySchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  }),
});

const courseQuizQuerySchema = z.object({
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const exportQuerySchema = z.object({
  query: z
    .object({
      type: z.enum(['courses', 'quizzes', 'engagement'], {
        required_error: 'Export type is required',
      }),
      course: z.string().optional(),
      format: z.enum(['csv', 'xlsx']).optional(),
      period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'quizzes' && !data.course) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['course'],
          message: 'Course ID is required when exporting quizzes',
        });
      }
    }),
});

const courseIdParamSchema = z.object({
  params: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
  }),
});

export const AnalyticsValidation = {
  periodQuerySchema,
  courseQuizQuerySchema,
  exportQuerySchema,
  courseIdParamSchema,
};
