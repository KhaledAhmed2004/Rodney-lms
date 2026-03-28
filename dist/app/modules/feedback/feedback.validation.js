"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackValidation = void 0;
const zod_1 = require("zod");
const createFeedback = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        rating: zod_1.z
            .number({ required_error: 'Rating is required' })
            .int({ message: 'Rating must be a whole number' })
            .min(1)
            .max(5),
        review: zod_1.z.string({ required_error: 'Review is required' }).min(1).max(5000),
    }),
});
const respondToFeedback = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Feedback ID is required' }),
    }),
    body: zod_1.z.object({
        adminResponse: zod_1.z
            .string({ required_error: 'Response is required' })
            .min(1)
            .max(5000),
    }),
});
exports.FeedbackValidation = { createFeedback, respondToFeedback };
