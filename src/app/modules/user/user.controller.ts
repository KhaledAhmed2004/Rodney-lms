import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
import { USER_STATUS } from '../../../enums/user';
import ExportBuilder from '../../builder/ExportBuilder';

const createUser = catchAsync(async (req: Request, res: Response) => {
  const { ...userData } = req.body;
  const result = await UserService.createUserToDB(userData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'User created successfully',
    data: result,
  });
});

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user as JwtPayload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  // All files + text data are in req.body
  const payload = { ...req.body };

  const result = await UserService.updateProfileToDB(
    user as JwtPayload,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const completeOnboarding = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.completeOnboardingInDB(user as JwtPayload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Onboarding completed',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Users retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = (req.user as JwtPayload).id;
  const result = await UserService.updateUserStatus(id, USER_STATUS.RESTRICTED, requesterId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User blocked successfully',
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = (req.user as JwtPayload).id;
  const result = await UserService.updateUserStatus(id, USER_STATUS.ACTIVE, requesterId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User unblocked successfully',
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await UserService.getUserById(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User data retrieved successfully',
    data: result,
  });
});

const getUserDetailsById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await UserService.getUserDetailsById(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User details retrieved successfully',
    data: result,
  });
});

const updateUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUserByAdmin(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User updated successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = (req.user as JwtPayload).id;

  await UserService.updateUserStatus(id, USER_STATUS.DELETE, requesterId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully',
  });
});

const exportUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await UserService.exportUsers(req.query);
  const format = req.query.format === 'xlsx' ? 'excel' : 'csv';
  const filename = `users-export-${new Date().toISOString().slice(0, 10)}`;

  await new ExportBuilder(users)
    .format(format as 'excel' | 'csv')
    .columns([
      { key: 'name', header: 'Name', width: 20 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'status', header: 'Status', width: 12 },
      { key: 'enrollmentCount', header: 'Enrolled Courses', width: 16 },
      { key: 'lastActiveDate', header: 'Last Active', width: 18 },
      { key: 'createdAt', header: 'Joined Date', width: 18 },
    ])
    .dateFormat('DD/MM/YYYY')
    .sendResponse(res, filename);
});

const getUserStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await UserService.getUserStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User stats retrieved successfully',
    data: result,
  });
});

export const UserController = {
  createUser,
  getUserProfile,
  updateProfile,
  completeOnboarding,
  getAllUsers,
  blockUser,
  unblockUser,
  getUserById,
  getUserDetailsById,
  updateUserByAdmin,
  deleteUser,
  exportUsers,
  getUserStats,
};
