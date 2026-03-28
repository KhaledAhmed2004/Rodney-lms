"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthValidation = void 0;
const zod_1 = require("zod");
// Shared schemas
const emailSchema = zod_1.z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim();
const passwordSchema = zod_1.z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128);
const createVerifyEmailZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        oneTimeCode: zod_1.z.number({ required_error: 'One time code is required' }),
    }),
});
const createLoginZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .min(1, 'Password is required')
            .max(128),
    }),
});
const createForgetPasswordZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
    }),
});
const createResetPasswordZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        token: zod_1.z.string({ required_error: 'Reset token is required' }),
        newPassword: passwordSchema,
        confirmPassword: passwordSchema,
    })
        .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    }),
});
const createChangePasswordZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        currentPassword: zod_1.z
            .string({ required_error: 'Current Password is required' })
            .min(1),
        newPassword: passwordSchema,
        confirmPassword: passwordSchema,
    })
        .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    }),
});
const createRefreshTokenZodSchema = zod_1.z.object({
    // Allow empty body when using cookie-based refresh tokens
    body: zod_1.z
        .object({
        refreshToken: zod_1.z.string().optional(),
    })
        .optional(),
});
const createResendVerifyEmailZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
    }),
});
exports.AuthValidation = {
    createVerifyEmailZodSchema,
    createForgetPasswordZodSchema,
    createLoginZodSchema,
    createResetPasswordZodSchema,
    createChangePasswordZodSchema,
    createRefreshTokenZodSchema,
    createResendVerifyEmailZodSchema,
};
