import { z } from 'zod';

const createBadge = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(1).max(100),
    description: z
      .string({ required_error: 'Description is required' })
      .min(1)
      .max(500),
    criteria: z.object({
      type: z.enum([
        'POINTS_THRESHOLD',
        'COURSES_COMPLETED',
        'QUIZZES_PASSED',
        'PERFECT_QUIZ',
        'STREAK_DAYS',
        'CUSTOM',
      ]),
      threshold: z.coerce.number().min(1),
    }),
    isActive: z.coerce.boolean().optional(),
  }),
});

const updateBadge = z.object({
  params: z.object({
    id: z.string({ required_error: 'Badge ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    criteria: z
      .object({
        type: z.enum([
          'POINTS_THRESHOLD',
          'COURSES_COMPLETED',
          'QUIZZES_PASSED',
          'PERFECT_QUIZ',
          'STREAK_DAYS',
          'CUSTOM',
        ]),
        threshold: z.coerce.number().min(1),
      })
      .optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

const adjustPoints = z.object({
  body: z.object({
    studentId: z.string({ required_error: 'Student ID is required' }),
    points: z.number({ required_error: 'Points is required' }),
    description: z
      .string({ required_error: 'Description is required' })
      .min(1)
      .max(500),
  }),
});

export const GamificationValidation = {
  createBadge,
  updateBadge,
  adjustPoints,
};
