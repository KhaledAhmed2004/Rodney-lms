import { z } from 'zod';

const updateBadge = z.object({
  params: z.object({
    id: z.string({ required_error: 'Badge ID is required' }),
  }),
  body: z.object({
    description: z.string().min(1).max(500).optional(),
    icon: z.string().min(1).optional(),
    criteria: z
      .object({
        threshold: z.coerce.number().min(1),
      })
      .optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const GamificationValidation = {
  updateBadge,
};
