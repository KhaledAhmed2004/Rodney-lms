import { z } from 'zod';

const createPost = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1)
      .max(200),
    courseId: z.string().optional(),
    content: z
      .string({ required_error: 'Content is required' })
      .trim()
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
      .trim()
      .min(1)
      .max(2000),
    parentReplyId: z.string().optional(),
  }),
});

const updatePost = z.object({
  params: z.object({
    id: z.string({ required_error: 'Post ID is required' }),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      content: z.string().trim().min(1).max(5000).optional(),
      courseId: z
        .union([z.string().min(1), z.literal('null')])
        .optional()
        .transform(v => (v === 'null' ? null : v)),
      image: z.string().optional(),
      removeImage: z
        .union([z.literal('true'), z.literal('false')])
        .optional()
        .transform(v => v === 'true'),
    })
    .refine(data => Object.values(data).some(v => v !== undefined), {
      message: 'At least one field must be provided',
    }),
});

const updateReply = z.object({
  params: z.object({
    id: z.string({ required_error: 'Reply ID is required' }),
  }),
  body: z.object({
    content: z
      .string({ required_error: 'Content is required' })
      .trim()
      .min(1)
      .max(2000),
  }),
});

const toggleLike = z.object({
  params: z.object({
    id: z.string({ required_error: 'Post ID is required' }),
  }),
});

export const CommunityValidation = {
  createPost,
  createReply,
  updatePost,
  updateReply,
  toggleLike,
};
