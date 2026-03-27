import { z } from 'zod';

const sendNotification = z.object({
  body: z
    .object({
      title: z
        .string({ required_error: 'Title is required' })
        .min(1)
        .max(200),
      text: z
        .string({ required_error: 'Message is required' })
        .min(1)
        .max(5000),
      audience: z.enum(['all', 'course'], {
        required_error: 'Audience is required',
      }),
      courseId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.audience === 'course' && !data.courseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'courseId is required when audience is course',
          path: ['courseId'],
        });
      }
    }),
});

export const NotificationValidation = { sendNotification };
