"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationValidation = void 0;
const zod_1 = require("zod");
const updateBadge = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Badge ID is required' }),
    }),
    body: zod_1.z.object({
        description: zod_1.z.string().min(1).max(500).optional(),
        criteria: zod_1.z
            .object({
            threshold: zod_1.z.number().min(1),
        })
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.GamificationValidation = {
    updateBadge,
};
