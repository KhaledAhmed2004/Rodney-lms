import { z } from 'zod';

const getCalendar = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  }),
});

export const ActivityValidation = { getCalendar };
