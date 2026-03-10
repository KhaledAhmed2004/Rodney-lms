import { z } from 'zod';

const createFeedback = z.object({
  body: z.object({
    courseId: z.string({ required_error: 'Course ID is required' }),
    rating: z.number({ required_error: 'Rating is required' }).min(1).max(5),
    review: z.string({ required_error: 'Review is required' }).min(1).max(5000),
  }),
});

const respondToFeedback = z.object({
  params: z.object({
    id: z.string({ required_error: 'Feedback ID is required' }),
  }),
  body: z.object({
    adminResponse: z
      .string({ required_error: 'Response is required' })
      .min(1)
      .max(5000),
  }),
});

export const FeedbackValidation = { createFeedback, respondToFeedback };
