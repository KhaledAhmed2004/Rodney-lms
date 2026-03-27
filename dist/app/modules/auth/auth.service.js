"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = require("http-status-codes");
const config_1 = __importDefault(require("../../../config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const authHelpers_1 = require("../../../helpers/authHelpers");
const emailHelper_1 = require("../../../helpers/emailHelper");
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const emailTemplate_1 = require("../../../shared/emailTemplate");
const cryptoToken_1 = __importDefault(require("../../../util/cryptoToken"));
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const resetToken_model_1 = require("./resetToken/resetToken.model");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
// Generate access + refresh token pair
const generateTokenPair = (user) => {
    const payload = { id: user._id, role: user.role, email: user.email };
    const accessToken = jwtHelper_1.jwtHelper.createToken(payload, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    const refreshToken = jwtHelper_1.jwtHelper.createToken(payload, config_1.default.jwt.jwt_refresh_secret, config_1.default.jwt.jwt_refresh_expire_in);
    return { accessToken, refreshToken };
};
const loginUserFromDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, deviceToken } = payload;
    const isExistUser = yield user_model_1.User.findOne({ email }).select('+password');
    // Generic message to prevent user enumeration
    const invalidCredentials = 'Invalid email or password';
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidCredentials);
    }
    // Check status — block deleted/inactive/restricted
    if (isExistUser.status === user_1.USER_STATUS.DELETE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidCredentials);
    }
    if (isExistUser.status === user_1.USER_STATUS.INACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Your account has been deactivated. Contact support.');
    }
    if (isExistUser.status === user_1.USER_STATUS.RESTRICTED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Your account has been restricted. Contact support.');
    }
    // Password check BEFORE verified check — don't leak verification status (#16)
    if (!password ||
        !(yield user_model_1.User.isMatchPassword(password, isExistUser.password))) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidCredentials);
    }
    if (!isExistUser.verified) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Please verify your account, then try to login again');
    }
    const tokens = generateTokenPair(isExistUser);
    // save device token
    if (deviceToken) {
        yield user_model_1.User.addDeviceToken(isExistUser._id.toString(), deviceToken);
    }
    return { tokens };
});
// logout
const logoutUserFromDB = (user, deviceToken) => __awaiter(void 0, void 0, void 0, function* () {
    if (!deviceToken) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Device token is required');
    }
    yield user_model_1.User.removeDeviceToken(user.id, deviceToken);
});
//forget password — silent success to prevent user enumeration
const forgetPasswordToDB = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.isExistUserByEmail(email);
    if (!isExistUser) {
        return; // Silent return — don't reveal if email exists
    }
    // Don't send OTP to deleted/inactive accounts
    if (isExistUser.status === user_1.USER_STATUS.DELETE ||
        isExistUser.status === user_1.USER_STATUS.INACTIVE) {
        return; // Silent — same as non-existent
    }
    //send mail
    const otp = (0, generateOTP_1.default)();
    const value = {
        otp,
        email: isExistUser.email,
    };
    const forgetPassword = emailTemplate_1.emailTemplate.resetPassword(value);
    yield emailHelper_1.emailHelper.sendEmail(forgetPassword);
    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate({ email }, { $set: { authentication } });
});
//verify email
const verifyEmailToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { email, oneTimeCode } = payload;
    const isExistUser = yield user_model_1.User.findOne({ email }).select('+authentication');
    // Generic error for all invalid cases — prevent user enumeration
    const invalidOtp = 'Invalid or expired OTP';
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidOtp);
    }
    if (!oneTimeCode) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidOtp);
    }
    // Check expiry BEFORE value — don't reveal correct OTP after expiry (#6)
    if (!((_a = isExistUser.authentication) === null || _a === void 0 ? void 0 : _a.expireAt) ||
        new Date() > isExistUser.authentication.expireAt) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidOtp);
    }
    // Constant-time OTP comparison (#3)
    const otpMatch = String(oneTimeCode) === String((_b = isExistUser.authentication) === null || _b === void 0 ? void 0 : _b.oneTimeCode);
    if (!otpMatch) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, invalidOtp);
    }
    let message;
    let data;
    if (!isExistUser.verified) {
        yield user_model_1.User.findOneAndUpdate({ _id: isExistUser._id }, { verified: true, authentication: { oneTimeCode: null, expireAt: null } });
        // Auto-login: generate tokens after email verification
        const tokens = generateTokenPair(isExistUser);
        message = 'Email verified successfully';
        data = { tokens };
    }
    else {
        yield user_model_1.User.findOneAndUpdate({ _id: isExistUser._id }, {
            authentication: {
                isResetPassword: true,
                oneTimeCode: null,
                expireAt: null,
            },
        });
        // Delete any existing reset tokens for this user, then create new one
        yield resetToken_model_1.ResetToken.deleteMany({ user: isExistUser._id });
        const createToken = (0, cryptoToken_1.default)();
        yield resetToken_model_1.ResetToken.create({
            user: isExistUser._id,
            token: createToken,
            expireAt: new Date(Date.now() + 5 * 60000),
        });
        message =
            'Verification Successful: Please securely store and utilize this code for reset password';
        data = createToken;
    }
    return { data, message };
});
//reset password
const resetPasswordToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { token, newPassword, confirmPassword } = payload;
    // Single query: check token exists AND not expired (#21)
    const isExistToken = yield resetToken_model_1.ResetToken.findOne({
        token,
        expireAt: { $gt: new Date() },
    });
    if (!isExistToken) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid or expired reset token');
    }
    //user permission check
    const isExistUser = yield user_model_1.User.findById(isExistToken.user).select('+authentication');
    if (!((_a = isExistUser === null || isExistUser === void 0 ? void 0 : isExistUser.authentication) === null || _a === void 0 ? void 0 : _a.isResetPassword)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, "You don't have permission to change the password. Please click again to 'Forgot Password'");
    }
    //check password
    if (newPassword !== confirmPassword) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "New password and Confirm password doesn't match!");
    }
    const hashPassword = yield bcrypt_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    const updateData = {
        password: hashPassword,
        passwordChangedAt: new Date(),
        authentication: {
            isResetPassword: false,
        },
    };
    yield user_model_1.User.findOneAndUpdate({ _id: isExistToken.user }, updateData);
    // Invalidate ALL reset tokens for this user
    yield resetToken_model_1.ResetToken.deleteMany({ user: isExistToken.user });
});
const changePasswordToDB = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { currentPassword, newPassword, confirmPassword } = payload;
    const isExistUser = yield user_model_1.User.findById(user.id).select('+password');
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    //current password match
    if (!(yield user_model_1.User.isMatchPassword(currentPassword, isExistUser.password))) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Current password is incorrect');
    }
    //newPassword and current password
    if (currentPassword === newPassword) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Please give different password from current password');
    }
    //new password and confirm password check
    if (newPassword !== confirmPassword) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Password and Confirm password doesn't matched");
    }
    //hash password
    const hashPassword = yield bcrypt_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    const updateData = {
        password: hashPassword,
        passwordChangedAt: new Date(),
    };
    yield user_model_1.User.findOneAndUpdate({ _id: user.id }, updateData);
    // Invalidate any pending reset tokens
    yield resetToken_model_1.ResetToken.deleteMany({ user: user.id });
});
const resendVerifyEmailToDB = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, authHelpers_1.sendVerificationOTP)(email);
});
// Refresh token: verify and issue new tokens
const refreshTokenToDB = (token) => __awaiter(void 0, void 0, void 0, function* () {
    if (!token) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Refresh token is required');
    }
    // Verify the refresh token
    const decoded = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_refresh_secret);
    const userId = decoded.id;
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, "User doesn't exist!");
    }
    if (user.status === user_1.USER_STATUS.DELETE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Your account has been deactivated. Contact support.');
    }
    // Issue new token pair (rotate refresh token)
    const tokens = generateTokenPair(user);
    return { tokens };
});
exports.AuthService = {
    verifyEmailToDB,
    loginUserFromDB,
    forgetPasswordToDB,
    resetPasswordToDB,
    changePasswordToDB,
    resendVerifyEmailToDB,
    logoutUserFromDB,
    refreshTokenToDB,
};
