"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentValidation = void 0;
const zod_1 = require("zod");
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const enrollInCourse = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z
            .string({ required_error: 'Course ID is required' })
            .regex(objectIdRegex, 'Invalid course ID format'),
    }),
});
const bulkEnroll = zod_1.z.object({
    body: zod_1.z.object({
        courseIds: zod_1.z
            .array(zod_1.z
            .string({ required_error: 'Course ID is required' })
            .regex(objectIdRegex, 'Invalid course ID format'))
            .min(1, 'At least one course is required')
            .max(20, 'Cannot enroll in more than 20 courses at once')
            .refine(ids => new Set(ids).size === ids.length, {
            message: 'Duplicate course IDs are not allowed',
        }),
    }),
});
const updateStatus = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Enrollment ID is required' }),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'COMPLETED', 'SUSPENDED']),
    }),
});
const completeLesson = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        lessonId: zod_1.z.string({ required_error: 'Lesson ID is required' }),
    }),
});
exports.EnrollmentValidation = {
    enrollInCourse,
    bulkEnroll,
    updateStatus,
    completeLesson,
};
