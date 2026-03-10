"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityValidation = void 0;
const zod_1 = require("zod");
const createPost = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z
            .string({ required_error: 'Content is required' })
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
            .min(1)
            .max(2000),
    }),
});
exports.CommunityValidation = { createPost, createReply };
