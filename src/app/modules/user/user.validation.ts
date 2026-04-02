import { z } from 'zod';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';

const phoneRegex = /^\+?[0-9]{7,15}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?]).{8,}$/;

const createUserZodSchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'Name is required' }).min(1),
      email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address'),
      gender: z.enum(['male', 'female']).optional(),
      dateOfBirth: z.string().optional(),
      location: z.string().optional(),
      phone: z
        .string()
        .regex(phoneRegex, 'Phone must be 7-15 digits, optional +')
        .optional(),
      role: z.enum([USER_ROLES.STUDENT]).optional(),
      password: z
        .string({ required_error: 'Password is required' }),
        // .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars'),
      profilePicture: z.string().optional(),
    })
    .strict(),
});

const updateUserZodSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
      gender: z.enum(['male', 'female']).optional(),
      dateOfBirth: z.string().optional(),
      location: z.string().trim().optional(),
      phone: z
        .string()
        .regex(phoneRegex, 'Phone must be 7-15 digits, optional +')
        .optional(),
      profilePicture: z.string().min(1).optional(),
    })
    .strict()
    .refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
});

const adminUpdateUserZodSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email('Invalid email address').optional(),
    status: z
      .enum([
        USER_STATUS.ACTIVE,
        USER_STATUS.INACTIVE,
        USER_STATUS.RESTRICTED,
        USER_STATUS.DELETE,
      ])
      .optional(),
    role: z.enum([USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN]).optional(),
    verified: z.boolean().optional(),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  adminUpdateUserZodSchema,
};
