import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GamificationService } from './gamification.service';

const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  const result = await GamificationService.getLeaderboard(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Leaderboard retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getMyPoints = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GamificationService.getMyPoints(userId, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Points retrieved successfully',
    pagination: result.pagination,
    data: { totalPoints: result.totalPoints, history: result.history },
  });
});

const getMyBadges = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GamificationService.getMyBadges(userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Achievements retrieved successfully',
    data: result,
  });
});

const getMySummary = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GamificationService.getMySummary(userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Summary retrieved successfully',
    data: result,
  });
});

const getAllBadges = catchAsync(async (req: Request, res: Response) => {
  const result = await GamificationService.getAllBadges(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Badges retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const updateBadge = catchAsync(async (req: Request, res: Response) => {
  const result = await GamificationService.updateBadge(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Badge updated successfully',
    data: result,
  });
});

const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const result = await GamificationService.getAdminStats();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Stats retrieved successfully',
    data: result,
  });
});

export const GamificationController = {
  getLeaderboard,
  getMyPoints,
  getMyBadges,
  getMySummary,
  getAllBadges,
  updateBadge,
  getAdminStats,
};
