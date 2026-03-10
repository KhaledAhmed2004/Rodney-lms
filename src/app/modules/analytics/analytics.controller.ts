import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AnalyticsService } from './analytics.service';

const getUserEngagement = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'month';
  const result = await AnalyticsService.getUserEngagement(period);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User engagement retrieved successfully',
    data: result,
  });
});

const getCourseCompletion = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getCourseCompletion();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Course completion rates retrieved successfully',
    data: result,
  });
});

const getQuizPerformance = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getQuizPerformance();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz performance retrieved successfully',
    data: result,
  });
});

const getCourseAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getCourseAnalytics(req.params.courseId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Course analytics retrieved successfully',
    data: result,
  });
});

const getStudentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getStudentAnalytics(
    req.params.studentId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Student analytics retrieved successfully',
    data: result,
  });
});

export const AnalyticsController = {
  getUserEngagement,
  getCourseCompletion,
  getQuizPerformance,
  getCourseAnalytics,
  getStudentAnalytics,
};
