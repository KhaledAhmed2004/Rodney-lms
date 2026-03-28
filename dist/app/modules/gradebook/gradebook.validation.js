"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookValidation = void 0;
const zod_1 = require("zod");
const submitAssignment = zod_1.z.object({
    params: zod_1.z.object({
        lessonId: zod_1.z.string({ required_error: 'Lesson ID is required' }),
    }),
    body: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        content: zod_1.z.string().max(5000).optional(),
        attachments: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    }),
});
exports.GradebookValidation = { submitAssignment };
