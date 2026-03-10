"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentValidation = void 0;
const zod_1 = require("zod");
const enrollInCourse = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
const bulkEnroll = zod_1.z.object({
    body: zod_1.z.object({
        courseIds: zod_1.z
            .array(zod_1.z.string({ required_error: 'Course ID is required' }))
            .min(1, 'At least one course is required'),
    }),
});
const updateStatus = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Enrollment ID is required' }),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED']),
    }),
});
const completeLesson = zod_1.z.object({
    params: zod_1.z.object({
        enrollmentId: zod_1.z.string({ required_error: 'Enrollment ID is required' }),
        lessonId: zod_1.z.string({ required_error: 'Lesson ID is required' }),
    }),
});
exports.EnrollmentValidation = {
    enrollInCourse,
    bulkEnroll,
    updateStatus,
    completeLesson,
};
