import { z } from 'zod';

// Shared schemas
const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128);

const createVerifyEmailZodSchema = z.object({
  body: z.object({
    email: emailSchema,
    oneTimeCode: z.number({ required_error: 'One time code is required' }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
      .max(128),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Reset token is required' }),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: 'Current Password is required',
    }),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createRefreshTokenZodSchema = z.object({
  // Allow empty body when using cookie-based refresh tokens
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

const createResendVerifyEmailZodSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const AuthValidation = {
  createVerifyEmailZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  createRefreshTokenZodSchema,
  createResendVerifyEmailZodSchema,
};