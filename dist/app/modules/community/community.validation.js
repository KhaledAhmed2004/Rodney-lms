"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityValidation = void 0;
const zod_1 = require("zod");
const createPost = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string({ required_error: 'Title is required' })
            .trim()
            .min(1)
            .max(200),
        courseId: zod_1.z.string().optional(),
        content: zod_1.z
            .string({ required_error: 'Content is required' })
            .trim()
            .min(1)
            .max(5000),
    }),
});
const createReply = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Post ID is required' }),
    }),
    body: zod_1.z.object({
        content: zod_1.z
            .string({ required_error: 'Content is required' })
            .trim()
            .min(1)
            .max(2000),
        parentReplyId: zod_1.z.string().optional(),
    }),
});
const updatePost = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Post ID is required' }),
    }),
    body: zod_1.z
        .object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        content: zod_1.z.string().trim().min(1).max(5000).optional(),
        courseId: zod_1.z
            .union([zod_1.z.string().min(1), zod_1.z.literal('null')])
            .optional()
            .transform(v => (v === 'null' ? null : v)),
        image: zod_1.z.string().optional(),
        removeImage: zod_1.z
            .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
            .optional()
            .transform(v => v === 'true'),
    })
        .refine(data => Object.values(data).some(v => v !== undefined), {
        message: 'At least one field must be provided',
    }),
});
const updateReply = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Reply ID is required' }),
    }),
    body: zod_1.z.object({
        content: zod_1.z
            .string({ required_error: 'Content is required' })
            .trim()
            .min(1)
            .max(2000),
    }),
});
const toggleLike = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Post ID is required' }),
    }),
});
exports.CommunityValidation = {
    createPost,
    createReply,
    updatePost,
    updateReply,
    toggleLike,
};
