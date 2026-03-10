import { z } from 'zod';

const createLegalPage = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1).max(200),
    content: z.string({ required_error: 'Content is required' }).min(1),
  }),
});

const updateLegalPage = z.object({
  params: z.object({
    slug: z.string({ required_error: 'Slug is required' }),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
  }),
});

export const LegalValidation = { createLegalPage, updateLegalPage };
