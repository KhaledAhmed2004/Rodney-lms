"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsValidation = void 0;
const zod_1 = require("zod");
const periodQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z.enum(['week', 'month', 'quarter', 'year']).optional(),
    }),
});
const exportQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        type: zod_1.z.enum(['courses', 'quizzes', 'engagement'], {
            required_error: 'Export type is required',
        }),
        format: zod_1.z.enum(['csv', 'xlsx']).optional(),
        period: zod_1.z.enum(['week', 'month', 'quarter', 'year']).optional(),
    }),
});
const courseIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
const studentIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        studentId: zod_1.z.string({ required_error: 'Student ID is required' }),
    }),
});
exports.AnalyticsValidation = {
    periodQuerySchema,
    exportQuerySchema,
    courseIdParamSchema,
    studentIdParamSchema,
};
