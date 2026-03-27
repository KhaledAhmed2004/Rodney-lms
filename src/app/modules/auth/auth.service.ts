import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { sendVerificationOTP } from '../../../helpers/authHelpers';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from './resetToken/resetToken.model';
import { User } from '../user/user.model';
import { USER_STATUS } from '../../../enums/user';

// Generate access + refresh token pair
const generateTokenPair = (user: { _id: unknown; role: string; email: string }) => {
  const payload = { id: user._id, role: user.role, email: user.email };
  const accessToken = jwtHelper.createToken(
    payload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );
  const refreshToken = jwtHelper.createToken(
    payload,
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string
  );
  return { accessToken, refreshToken };
};

const loginUserFromDB = async (
  payload: ILoginData & { deviceToken?: string }
) => {
  const { email, password, deviceToken } = payload;
  const isExistUser = await User.findOne({ email }).select('+password');

  // Generic message to prevent user enumeration
  const invalidCredentials = 'Invalid email or password';

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidCredentials);
  }

  // Check status — block deleted/inactive/restricted
  if (isExistUser.status === USER_STATUS.DELETE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidCredentials);
  }
  if (isExistUser.status === USER_STATUS.INACTIVE) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Your account has been deactivated. Contact support.');
  }
  if (isExistUser.status === USER_STATUS.RESTRICTED) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Your account has been restricted. Contact support.');
  }

  // Password check BEFORE verified check — don't leak verification status (#16)
  if (
    !password ||
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidCredentials);
  }

  if (!isExistUser.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account, then try to login again'
    );
  }

  const tokens = generateTokenPair(isExistUser);

  // save device token
  if (deviceToken) {
    await User.addDeviceToken(isExistUser._id.toString(), deviceToken);
  }

  return { tokens };
};

// logout
const logoutUserFromDB = async (user: JwtPayload, deviceToken: string) => {
  if (!deviceToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Device token is required');
  }

  await User.removeDeviceToken(user.id, deviceToken);
};

//forget password — silent success to prevent user enumeration
const forgetPasswordToDB = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    return; // Silent return — don't reveal if email exists
  }

  // Don't send OTP to deleted/inactive accounts
  if (
    isExistUser.status === USER_STATUS.DELETE ||
    isExistUser.status === USER_STATUS.INACTIVE
  ) {
    return; // Silent — same as non-existent
  }

  //send mail
  const otp = generateOTP();
  const value = {
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.resetPassword(value);
  await emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

//verify email
const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;
  const isExistUser = await User.findOne({ email }).select('+authentication');

  // Generic error for all invalid cases — prevent user enumeration
  const invalidOtp = 'Invalid or expired OTP';

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidOtp);
  }

  if (!oneTimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidOtp);
  }

  // Check expiry BEFORE value — don't reveal correct OTP after expiry (#6)
  if (
    !isExistUser.authentication?.expireAt ||
    new Date() > isExistUser.authentication.expireAt
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidOtp);
  }

  // Constant-time OTP comparison (#3)
  const otpMatch =
    String(oneTimeCode) === String(isExistUser.authentication?.oneTimeCode);
  if (!otpMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, invalidOtp);
  }

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { oneTimeCode: null, expireAt: null } }
    );

    // Auto-login: generate tokens after email verification
    const tokens = generateTokenPair(isExistUser);

    message = 'Email verified successfully';
    data = { tokens };
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      }
    );

    // Delete any existing reset tokens for this user, then create new one
    await ResetToken.deleteMany({ user: isExistUser._id });
    const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: createToken,
      expireAt: new Date(Date.now() + 5 * 60000),
    });
    message =
      'Verification Successful: Please securely store and utilize this code for reset password';
    data = createToken;
  }
  return { data, message };
};

//reset password
const resetPasswordToDB = async (payload: IAuthResetPassword) => {
  const { token, newPassword, confirmPassword } = payload;

  // Single query: check token exists AND not expired (#21)
  const isExistToken = await ResetToken.findOne({
    token,
    expireAt: { $gt: new Date() },
  });
  if (!isExistToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired reset token');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication'
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'"
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
    passwordChangedAt: new Date(),
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData);

  // Invalidate ALL reset tokens for this user
  await ResetToken.deleteMany({ user: isExistToken.user });
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (!(await User.isMatchPassword(currentPassword, isExistUser.password))) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password'
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched"
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
    passwordChangedAt: new Date(),
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData);

  // Invalidate any pending reset tokens
  await ResetToken.deleteMany({ user: user.id });
};

const resendVerifyEmailToDB = async (email: string) => {
  return sendVerificationOTP(email);
};

// Refresh token: verify and issue new tokens
const refreshTokenToDB = async (token: string) => {
  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Refresh token is required');
  }

  // Verify the refresh token
  const decoded = jwtHelper.verifyToken(
    token,
    config.jwt.jwt_refresh_secret as Secret
  );

  const userId = decoded.id as string;
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User doesn't exist!");
  }

  if (user.status === USER_STATUS.DELETE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your account has been deactivated. Contact support.'
    );
  }

  // Issue new token pair (rotate refresh token)
  const tokens = generateTokenPair(user);

  return { tokens };
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  resendVerifyEmailToDB,
  logoutUserFromDB,
  refreshTokenToDB,
};
