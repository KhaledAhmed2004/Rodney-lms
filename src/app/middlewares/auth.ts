import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';
import { User } from '../modules/user/user.model';
import { USER_STATUS } from '../../enums/user';

const auth =
  (...allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      // 1️⃣ No token provided
      if (!authHeader) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Authorization token is required'
        );
      }

      // 2️⃣ Validate Bearer format
      if (!authHeader.startsWith('Bearer ')) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Authorization header must start with "Bearer "'
        );
      }

      // 3️⃣ Extract token and ensure it's not empty
      const token = authHeader.split(' ')[1];
      if (!token || token.trim() === '') {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Valid token is required');
      }

      // 4️⃣ Verify JWT token
      const verifiedUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      );

      if (!verifiedUser || !verifiedUser.role) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token payload');
      }

      // 5️⃣ Verify user still exists and is active in DB
      const dbUser = await User.findById(verifiedUser.id)
        .select('status passwordChangedAt')
        .lean();

      if (!dbUser) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account no longer exists');
      }

      if (
        dbUser.status === USER_STATUS.DELETE ||
        dbUser.status === USER_STATUS.INACTIVE ||
        dbUser.status === USER_STATUS.RESTRICTED
      ) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account no longer active');
      }

      // 6️⃣ Reject tokens issued before password change
      if (dbUser.passwordChangedAt && verifiedUser.iat) {
        const changedTimestamp = Math.floor(
          new Date(dbUser.passwordChangedAt).getTime() / 1000
        );
        if (verifiedUser.iat < changedTimestamp) {
          throw new ApiError(
            StatusCodes.UNAUTHORIZED,
            'Password was recently changed. Please log in again.'
          );
        }
      }

      // 7️⃣ Attach verified user to request
      req.user = verifiedUser as any;

      // 8️⃣ Role-based access check
      if (allowedRoles.length && !allowedRoles.includes(verifiedUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this API"
        );
      }

      // 9️⃣ Proceed
      next();
    } catch (error: any) {
      // Handle JWT-specific errors
      if (error.name === 'JsonWebTokenError') {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Token has expired')
        );
      }
      if (error.name === 'NotBeforeError') {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token not active'));
      }

      // Pass other errors
      next(error);
    }
  };

export default auth;
