import { z } from 'zod';

const createPost = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Content is required' })
      .min(1)
      .max(5000),
  }),
});

const createReply = z.object({
  params: z.object({
    id: z.string({ required_error: 'Post ID is required' }),
  }),
  body: z.object({
    content: z
      .string({ required_error: 'Content is required' })
      .min(1)
      .max(2000),
  }),
});

export const CommunityValidation = { createPost, createReply };
