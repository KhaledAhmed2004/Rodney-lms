"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationValidation = void 0;
const zod_1 = require("zod");
const createBadge = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Name is required' }).min(1).max(100),
        description: zod_1.z
            .string({ required_error: 'Description is required' })
            .min(1)
            .max(500),
        criteria: zod_1.z.object({
            type: zod_1.z.enum([
                'POINTS_THRESHOLD',
                'COURSES_COMPLETED',
                'QUIZZES_PASSED',
                'PERFECT_QUIZ',
                'STREAK_DAYS',
                'CUSTOM',
            ]),
            threshold: zod_1.z.coerce.number().min(1),
        }),
        isActive: zod_1.z.coerce.boolean().optional(),
    }),
});
const updateBadge = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Badge ID is required' }),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().min(1).max(500).optional(),
        criteria: zod_1.z
            .object({
            type: zod_1.z.enum([
                'POINTS_THRESHOLD',
                'COURSES_COMPLETED',
                'QUIZZES_PASSED',
                'PERFECT_QUIZ',
                'STREAK_DAYS',
                'CUSTOM',
            ]),
            threshold: zod_1.z.coerce.number().min(1),
        })
            .optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
    }),
});
const adjustPoints = zod_1.z.object({
    body: zod_1.z.object({
        studentId: zod_1.z.string({ required_error: 'Student ID is required' }),
        points: zod_1.z.number({ required_error: 'Points is required' }),
        description: zod_1.z
            .string({ required_error: 'Description is required' })
            .min(1)
            .max(500),
    }),
});
exports.GamificationValidation = {
    createBadge,
    updateBadge,
    adjustPoints,
};
