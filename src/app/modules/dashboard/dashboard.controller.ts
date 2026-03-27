import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import ApiError from '../../../errors/ApiError';
import { DashboardService } from './dashboard.service';

const VALID_ACTIVITY_TYPES = ['ENROLLMENT', 'COMPLETION', 'QUIZ_ATTEMPT'];

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getSummary();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard summary retrieved successfully',
    data: result,
  });
});

const getTrends = catchAsync(async (req: Request, res: Response) => {
  const months = req.query.months
    ? parseInt(req.query.months as string, 10)
    : 6;
  if (isNaN(months) || months < 1 || months > 24) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'months must be a number between 1 and 24'
    );
  }
  const result = await DashboardService.getTrends(months);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trends retrieved successfully',
    data: result,
  });
});

const getRecentActivity = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : 20;
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'limit must be a number between 1 and 100'
    );
  }

  const type = req.query.type as string | undefined;
  if (type && !VALID_ACTIVITY_TYPES.includes(type)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`
    );
  }

  const result = await DashboardService.getRecentActivity(limit, type);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Recent activity retrieved successfully',
    data: result,
  });
});

export const DashboardController = { getSummary, getTrends, getRecentActivity };
