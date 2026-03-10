"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookValidation = void 0;
const zod_1 = require("zod");
const updateGrade = zod_1.z.object({
    params: zod_1.z.object({
        gradeId: zod_1.z.string({ required_error: 'Grade ID is required' }),
    }),
    body: zod_1.z.object({
        score: zod_1.z.number().min(0).optional(),
        feedback: zod_1.z.string().max(5000).optional(),
        status: zod_1.z.enum(['PENDING', 'GRADED', 'RETURNED']).optional(),
    }),
});
const submitAssignment = zod_1.z.object({
    params: zod_1.z.object({
        lessonId: zod_1.z.string({ required_error: 'Lesson ID is required' }),
    }),
    body: zod_1.z.object({
        content: zod_1.z.string().optional(),
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
exports.GradebookValidation = { updateGrade, submitAssignment };
