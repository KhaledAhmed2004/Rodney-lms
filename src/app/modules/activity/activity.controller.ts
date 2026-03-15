import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ActivityService } from './activity.service';

const getCalendar = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const result = await ActivityService.getCalendar(userId, month, year);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Activity calendar retrieved successfully',
    data: result,
  });
});

const getStreak = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await ActivityService.getStreak(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Streak retrieved successfully',
    data: result,
  });
});

const getAdminOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await ActivityService.getAdminOverview();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Activity overview retrieved successfully',
    data: result,
  });
});

export const ActivityController = { getCalendar, getStreak, getAdminOverview };
