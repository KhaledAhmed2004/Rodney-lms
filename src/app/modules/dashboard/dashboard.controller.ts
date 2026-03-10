import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DashboardService } from './dashboard.service';

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
  const months = req.query.months ? parseInt(req.query.months as string) : 6;
  const result = await DashboardService.getTrends(months);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trends retrieved successfully',
    data: result,
  });
});

const getRecentActivity = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const result = await DashboardService.getRecentActivity(limit);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Recent activity retrieved successfully',
    data: result,
  });
});

export const DashboardController = { getSummary, getTrends, getRecentActivity };
