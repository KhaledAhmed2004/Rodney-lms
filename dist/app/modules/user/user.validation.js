"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = void 0;
const zod_1 = require("zod");
const user_1 = require("../../../enums/user");
const phoneRegex = /^\+?[0-9]{7,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?]).{8,}$/;
const createUserZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string({ required_error: 'Name is required' }).min(1),
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address'),
        gender: zod_1.z.enum(['male', 'female']).optional(),
        dateOfBirth: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        phone: zod_1.z
            .string()
            .regex(phoneRegex, 'Phone must be 7-15 digits, optional +')
            .optional(),
        role: zod_1.z.enum([user_1.USER_ROLES.STUDENT]).optional(),
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars'),
        profilePicture: zod_1.z.string().optional(),
    })
        .strict(),
});
// const updateUserZodSchema = z.object({
//   name: z.string().optional(),
//   email: z.string().optional(),
//   gender: z.enum(['male', 'female']).optional(),
//   dateOfBirth: z.string().optional(),
//   location: z.string().optional(),
//   phone: z.string().optional(),
//   password: z.string().optional(),
//   image: z.string().optional(),
// });
const updateUserZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        email: zod_1.z.string().email('Invalid email address').optional(),
        gender: zod_1.z.enum(['male', 'female']).optional(),
        dateOfBirth: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        phone: zod_1.z.string().regex(phoneRegex, 'Phone must be 7-15 digits, optional +').optional(),
        password: zod_1.z
            .string()
            .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars')
            .optional(),
        profilePicture: zod_1.z.string().optional(),
    }),
});
exports.UserValidation = {
    createUserZodSchema,
    updateUserZodSchema,
};
