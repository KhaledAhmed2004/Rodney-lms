import { z } from 'zod';
import { USER_ROLES } from '../../../enums/user';

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
        .string({ required_error: 'Password is required' })
        .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars'),
      profilePicture: z.string().optional(),
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
const updateUserZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    gender: z.enum(['male', 'female']).optional(),
    dateOfBirth: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().regex(phoneRegex, 'Phone must be 7-15 digits, optional +').optional(),
    password: z
      .string()
      .regex(passwordRegex, 'Password must include upper, lower, number, special and be 8+ chars')
      .optional(),
    profilePicture: z.string().optional(),
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
};
