import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
const router = express.Router();

// User Login
router.post(
  '/login',
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser
);

// User Logout
router.post(
  '/logout',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.STUDENT),
  AuthController.logoutUser
);

// Forget Password Request
router.post(
  '/forget-password',
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword
);

// Email Verification
router.post(
  '/verify-email',
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail
);

// Reset Password
router.post(
  '/reset-password',
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword
);

// Change Password
router.post(
  '/change-password',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.STUDENT),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword
);

// Resend Verification Email
router.post('/resend-verify-email', AuthController.resendVerifyEmail);

// Refresh Token
router.post(
  '/refresh-token',
  validateRequest(AuthValidation.createRefreshTokenZodSchema),
  AuthController.refreshToken
);

export const AuthRoutes = router;
