import { z } from 'zod';

const getCalendar = z.object({
  query: z.object({
    days: z.string().optional(),
  }),
});

export const ActivityValidation = { getCalendar };
