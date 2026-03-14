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
exports.UserService = void 0;
const http_status_codes_1 = require("http-status-codes");
const user_1 = require("../../../enums/user");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const emailHelper_1 = require("../../../helpers/emailHelper");
const emailTemplate_1 = require("../../../shared/emailTemplate");
const fileHandler_1 = require("../../middlewares/fileHandler");
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const user_model_1 = require("./user.model");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const enrollment_interface_1 = require("../enrollment/enrollment.interface");
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const AggregationBuilder_1 = __importDefault(require("../../builder/AggregationBuilder"));
const createUserToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createUser = yield user_model_1.User.create(payload);
    if (!createUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create user');
    }
    //send email
    const otp = (0, generateOTP_1.default)();
    const values = {
        name: createUser.name,
        otp: otp,
        email: createUser.email,
    };
    console.log('Sending email to:', createUser.email, 'with OTP:', otp);
    const createAccountTemplate = emailTemplate_1.emailTemplate.createAccount(values);
    emailHelper_1.emailHelper.sendEmail(createAccountTemplate);
    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });
    const sanitizedUser = yield user_model_1.User.findById(createUser._id).select('name email role verified profilePicture onboardingCompleted createdAt');
    return sanitizedUser;
});
const getUserProfileFromDB = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    // Student-specific fields to exclude for non-student roles
    const studentOnlyFields = '-averageRating -ratingsCount -achievements -totalPoints -streak -onboardingCompleted -deviceTokens';
    const query = user_model_1.User.findById(id);
    if (user.role !== user_1.USER_ROLES.STUDENT) {
        query.select(studentOnlyFields);
    }
    const result = yield query;
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    return result;
});
const updateProfileToDB = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    if (payload.profilePicture && isExistUser.profilePicture) {
        yield (0, fileHandler_1.deleteFile)(isExistUser.profilePicture);
    }
    // Student-specific fields to exclude for non-student roles
    const studentOnlyFields = '-averageRating -ratingsCount -achievements -totalPoints -streak -onboardingCompleted -deviceTokens';
    const updateQuery = user_model_1.User.findOneAndUpdate({ _id: id }, payload, {
        new: true,
    });
    if (user.role !== user_1.USER_ROLES.STUDENT) {
        updateQuery.select(studentOnlyFields);
    }
    return updateQuery;
});
const buildUserMatchConditions = (query) => {
    const matchConditions = {
        role: { $ne: user_1.USER_ROLES.SUPER_ADMIN },
    };
    // Status filter: if provided use it; otherwise exclude soft-deleted users
    if (query.status) {
        matchConditions.status = query.status;
    }
    else {
        matchConditions.status = { $ne: user_1.USER_STATUS.DELETE };
    }
    if (query.role) {
        matchConditions.role = query.role;
    }
    if (query.searchTerm) {
        const sanitized = (0, escape_string_regexp_1.default)(String(query.searchTerm));
        matchConditions.$or = [
            { name: { $regex: sanitized, $options: 'i' } },
            { email: { $regex: sanitized, $options: 'i' } },
        ];
    }
    return matchConditions;
};
const getAllUsers = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Build sort spec from ?sort=field or ?sort=-field
    const sortParam = query.sort ? String(query.sort) : '-createdAt';
    const sortSpec = {};
    if (sortParam.startsWith('-')) {
        sortSpec[sortParam.slice(1)] = -1;
    }
    else {
        sortSpec[sortParam] = 1;
    }
    const matchConditions = buildUserMatchConditions(query);
    const pipeline = [
        { $match: matchConditions },
        {
            $lookup: {
                from: 'enrollments',
                localField: '_id',
                foreignField: 'student',
                as: 'enrollments',
            },
        },
        {
            $addFields: {
                enrollmentCount: { $size: '$enrollments' },
                lastActiveDate: '$streak.lastActiveDate',
            },
        },
        {
            $project: {
                name: 1,
                email: 1,
                profilePicture: 1,
                status: 1,
                role: 1,
                verified: 1,
                enrollmentCount: 1,
                lastActiveDate: 1,
                createdAt: 1,
            },
        },
        {
            $facet: {
                data: [{ $sort: sortSpec }, { $skip: skip }, { $limit: limit }],
                total: [{ $count: 'count' }],
            },
        },
    ];
    const result = yield user_model_1.User.aggregate(pipeline);
    const data = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    const total = (_e = (_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.total[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
    const totalPage = Math.ceil(total / limit);
    return {
        pagination: { page, limit, totalPage, total },
        data,
    };
});
const exportUsers = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const matchConditions = buildUserMatchConditions(query);
    const pipeline = [
        { $match: matchConditions },
        {
            $lookup: {
                from: 'enrollments',
                localField: '_id',
                foreignField: 'student',
                as: 'enrollments',
            },
        },
        {
            $addFields: {
                enrollmentCount: { $size: '$enrollments' },
                lastActiveDate: '$streak.lastActiveDate',
            },
        },
        {
            $project: {
                name: 1,
                email: 1,
                status: 1,
                role: 1,
                verified: 1,
                enrollmentCount: 1,
                lastActiveDate: 1,
                createdAt: 1,
            },
        },
        { $sort: { createdAt: -1 } },
    ];
    return user_model_1.User.aggregate(pipeline);
});
const updateUserStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.isExistUserById(id);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    return updatedUser;
});
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const user = yield user_model_1.User.findById(id).select('-password -authentication -deviceTokens');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    const enrollments = yield enrollment_model_1.Enrollment.find({ student: id })
        .populate('course', '_id title thumbnail')
        .lean();
    const courseStats = {
        total: enrollments.length,
        active: enrollments.filter(e => e.status === enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE).length,
        completed: enrollments.filter(e => e.status === enrollment_interface_1.ENROLLMENT_STATUS.COMPLETED).length,
        dropped: enrollments.filter(e => e.status === enrollment_interface_1.ENROLLMENT_STATUS.DROPPED).length,
        averageCompletion: Math.round(enrollments.reduce((sum, e) => { var _a, _b; return sum + ((_b = (_a = e.progress) === null || _a === void 0 ? void 0 : _a.completionPercentage) !== null && _b !== void 0 ? _b : 0); }, 0) /
            (enrollments.length || 1)),
    };
    const enrolledCourses = enrollments.map(e => {
        var _a, _b, _c, _d;
        return ({
            enrollmentId: e._id,
            course: e.course,
            enrollmentStatus: e.status,
            completionPercentage: (_b = (_a = e.progress) === null || _a === void 0 ? void 0 : _a.completionPercentage) !== null && _b !== void 0 ? _b : 0,
            enrolledAt: e.enrolledAt,
            lastAccessedAt: (_d = (_c = e.progress) === null || _c === void 0 ? void 0 : _c.lastAccessedAt) !== null && _d !== void 0 ? _d : null,
        });
    });
    const userObj = user.toObject();
    return Object.assign(Object.assign({}, userObj), { lastActiveDate: (_b = (_a = userObj.streak) === null || _a === void 0 ? void 0 : _a.lastActiveDate) !== null && _b !== void 0 ? _b : null, courseStats,
        enrolledCourses });
});
const updateUserByAdmin = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    if (payload.email && payload.email !== isExistUser.email) {
        const emailExists = yield user_model_1.User.findOne({ email: payload.email, _id: { $ne: id } });
        if (emailExists) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Email already in use');
        }
    }
    const updatedUser = yield user_model_1.User.findByIdAndUpdate(id, payload, { new: true }).select('-password -authentication -deviceTokens');
    return updatedUser;
});
const getUserDetailsById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(id).select('-password -authentication');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User doesn't exist!");
    }
    return user;
});
const getUserStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const [totalStudents, activeStudents] = yield Promise.all([
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.STUDENT, status: { $ne: user_1.USER_STATUS.DELETE } },
            period: 'month',
        }),
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.STUDENT, status: user_1.USER_STATUS.ACTIVE },
            period: 'month',
        }),
    ]);
    return { totalStudents, activeStudents };
});
exports.UserService = {
    createUserToDB,
    getUserProfileFromDB,
    updateProfileToDB,
    getAllUsers,
    exportUsers,
    updateUserStatus,
    getUserById,
    updateUserByAdmin,
    getUserDetailsById,
    getUserStats,
};
