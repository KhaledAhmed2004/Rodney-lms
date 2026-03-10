"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkValidation = void 0;
const zod_1 = require("zod");
// Validate generic toggle body: targetId + targetModel
const toggle = zod_1.z.object({
    body: zod_1.z.object({
        targetId: zod_1.z
            .string({ required_error: 'Target ID is required' })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Target ID format'),
        targetModel: zod_1.z
            .string({ required_error: 'Target model is required' })
            .min(1, 'Target model must be provided')
            .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Invalid model name format'),
    }),
});
// Validate query for listing bookmarks; allow optional targetModel
const getUserBookmarksQuery = zod_1.z.object({
    query: zod_1.z.object({
        limit: zod_1.z
            .string()
            .regex(/^\d+$/, 'Limit must be a number')
            .transform(Number)
            .optional(),
        page: zod_1.z
            .string()
            .regex(/^\d+$/, 'Page must be a number')
            .transform(Number)
            .optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
        targetModel: zod_1.z.string().optional(),
        // Task-specific filters (used only when targetModel === 'Task')
        category: zod_1.z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format')
            .optional(),
        searchTerm: zod_1.z.string().optional(),
    }),
});
exports.BookmarkValidation = {
    toggle,
    getUserBookmarksQuery,
};
