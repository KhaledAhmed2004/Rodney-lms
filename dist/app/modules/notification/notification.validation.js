"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationValidation = void 0;
const zod_1 = require("zod");
const sendNotification = zod_1.z.object({
    body: zod_1.z
        .object({
        title: zod_1.z
            .string({ required_error: 'Title is required' })
            .min(1)
            .max(200),
        text: zod_1.z
            .string({ required_error: 'Message is required' })
            .min(1)
            .max(5000),
        audience: zod_1.z.enum(['all', 'course'], {
            required_error: 'Audience is required',
        }),
        courseId: zod_1.z.string().optional(),
    })
        .superRefine((data, ctx) => {
        if (data.audience === 'course' && !data.courseId) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'courseId is required when audience is course',
                path: ['courseId'],
            });
        }
    }),
});
exports.NotificationValidation = { sendNotification };
