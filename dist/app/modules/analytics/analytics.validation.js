"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsValidation = void 0;
const zod_1 = require("zod");
const periodQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['week', 'month', 'quarter', 'year']).optional(),
    }),
});
const courseQuizQuerySchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
    query: zod_1.z.object({
        period: zod_1.z.enum(['week', 'month', 'quarter', 'year']).optional(),
        page: zod_1.z.coerce.number().int().min(1).optional(),
        limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    }),
});
const exportQuerySchema = zod_1.z.object({
    query: zod_1.z
        .object({
        type: zod_1.z.enum(['courses', 'quizzes', 'engagement'], {
            required_error: 'Export type is required',
        }),
        course: zod_1.z.string().optional(),
        format: zod_1.z.enum(['csv', 'xlsx']).optional(),
        period: zod_1.z.enum(['week', 'month', 'quarter', 'year']).optional(),
    })
        .superRefine((data, ctx) => {
        if (data.type === 'quizzes' && !data.course) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['course'],
                message: 'Course ID is required when exporting quizzes',
            });
        }
    }),
});
const courseIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
exports.AnalyticsValidation = {
    periodQuerySchema,
    courseQuizQuerySchema,
    exportQuerySchema,
    courseIdParamSchema,
};
