import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { PipelineStage } from 'mongoose';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import { deleteFile } from '../../middlewares/fileHandler';
import generateOTP from '../../../util/generateOTP';
import { User } from './user.model';
import { IUser } from './user.interface';
import { Enrollment } from '../enrollment/enrollment.model';
import { ENROLLMENT_STATUS } from '../enrollment/enrollment.interface';
import escapeRegex from 'escape-string-regexp';
import AggregationBuilder from '../../builder/AggregationBuilder';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  console.log('Sending email to:', createUser.email, 'with OTP:', otp);

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } }
  );

  const sanitizedUser = await User.findById(createUser._id).select(
    'name email role verified profilePicture onboardingCompleted createdAt'
  );
  return sanitizedUser as IUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload
): Promise<Partial<IUser>> => {
  const { id } = user;

  // Student-specific fields to exclude for non-student roles
  const studentOnlyFields =
    '-averageRating -ratingsCount -achievements -totalPoints -streak -onboardingCompleted -deviceTokens';

  const query = User.findById(id);

  if (user.role !== USER_ROLES.STUDENT) {
    query.select(studentOnlyFields);
  }

  const result = await query;
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return result;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // //unlink file here
  // if (payload.image) {
  //   unlinkFile(isExistUser.image);
  // }

  //unlink file here
  if (payload.profilePicture) {
    await deleteFile(isExistUser.profilePicture);
  }

  // Student-specific fields to exclude for non-student roles
  const studentOnlyFields =
    '-averageRating -ratingsCount -achievements -totalPoints -streak -onboardingCompleted -deviceTokens';

  const updateQuery = User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  if (user.role !== USER_ROLES.STUDENT) {
    updateQuery.select(studentOnlyFields);
  }

  return updateQuery;
};

const buildUserMatchConditions = (query: Record<string, unknown>) => {
  const matchConditions: Record<string, unknown> = {
    role: { $ne: USER_ROLES.SUPER_ADMIN },
  };

  // Status filter: if provided use it; otherwise exclude soft-deleted users
  if (query.status) {
    matchConditions.status = query.status;
  } else {
    matchConditions.status = { $ne: USER_STATUS.DELETE };
  }

  if (query.role) {
    matchConditions.role = query.role;
  }

  if (query.searchTerm) {
    const sanitized = escapeRegex(String(query.searchTerm));
    matchConditions.$or = [
      { name: { $regex: sanitized, $options: 'i' } },
      { email: { $regex: sanitized, $options: 'i' } },
    ];
  }

  return matchConditions;
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build sort spec from ?sort=field or ?sort=-field
  const sortParam = query.sort ? String(query.sort) : '-createdAt';
  const sortSpec: Record<string, 1 | -1> = {};
  if (sortParam.startsWith('-')) {
    sortSpec[sortParam.slice(1)] = -1;
  } else {
    sortSpec[sortParam] = 1;
  }

  const matchConditions = buildUserMatchConditions(query);

  const pipeline: PipelineStage[] = [
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

  const result = await User.aggregate(pipeline);
  const data = result[0]?.data ?? [];
  const total = result[0]?.total[0]?.count ?? 0;
  const totalPage = Math.ceil(total / limit);

  return {
    pagination: { page, limit, totalPage, total },
    data,
  };
};

const exportUsers = async (query: Record<string, unknown>) => {
  const matchConditions = buildUserMatchConditions(query);

  const pipeline: PipelineStage[] = [
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
    { $sort: { createdAt: -1 as const } },
  ];

  return User.aggregate(pipeline);
};

const updateUserStatus = async (id: string, status: USER_STATUS) => {
  const user = await User.isExistUserById(id);
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  return updatedUser;
};

const getUserById = async (id: string) => {
  const user = await User.findById(id).select('-password -authentication -deviceTokens');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const enrollments = await Enrollment.find({ student: id })
    .populate('course', '_id title thumbnail')
    .lean();

  const courseStats = {
    total: enrollments.length,
    active: enrollments.filter(e => e.status === ENROLLMENT_STATUS.ACTIVE).length,
    completed: enrollments.filter(e => e.status === ENROLLMENT_STATUS.COMPLETED).length,
    dropped: enrollments.filter(e => e.status === ENROLLMENT_STATUS.DROPPED).length,
    averageCompletion: Math.round(
      enrollments.reduce((sum, e) => sum + (e.progress?.completionPercentage ?? 0), 0) /
        (enrollments.length || 1)
    ),
  };

  const enrolledCourses = enrollments.map(e => ({
    enrollmentId: e._id,
    course: e.course,
    enrollmentStatus: e.status,
    completionPercentage: e.progress?.completionPercentage ?? 0,
    enrolledAt: e.enrolledAt,
    lastAccessedAt: e.progress?.lastAccessedAt ?? null,
  }));

  const userObj = user.toObject();
  return {
    ...userObj,
    lastActiveDate: userObj.streak?.lastActiveDate ?? null,
    courseStats,
    enrolledCourses,
  };
};

const updateUserByAdmin = async (
  id: string,
  payload: Partial<Pick<IUser, 'name' | 'email' | 'status' | 'role' | 'verified'>>
): Promise<IUser | null> => {
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (payload.email && payload.email !== isExistUser.email) {
    const emailExists = await User.findOne({ email: payload.email, _id: { $ne: id } });
    if (emailExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already in use');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, payload, { new: true }).select(
    '-password -authentication -deviceTokens'
  );

  return updatedUser;
};

const getUserDetailsById = async (id: string) => {
  const user = await User.findById(id).select('-password -authentication');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  return user;
};

const getUserStats = async () => {
  const [totalStudents, activeStudents] = await Promise.all([
    new AggregationBuilder(User as any).calculateGrowth({
      filter: { role: USER_ROLES.STUDENT, status: { $ne: USER_STATUS.DELETE } },
      period: 'month',
    }),
    new AggregationBuilder(User as any).calculateGrowth({
      filter: { role: USER_ROLES.STUDENT, status: USER_STATUS.ACTIVE },
      period: 'month',
    }),
  ]);

  return { totalStudents, activeStudents };
};

export const UserService = {
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
