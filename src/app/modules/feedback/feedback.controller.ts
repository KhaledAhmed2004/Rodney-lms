import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { FeedbackService } from './feedback.service';

const createFeedback = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await FeedbackService.createFeedback(
    userId,
    req.body.courseId,
    req.body.rating,
    req.body.review,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Feedback submitted successfully',
    data: result,
  });
});

const getPublishedByCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getPublishedByCourse(
    req.params.courseId,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reviews retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getAllFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getAllFeedback(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All feedback retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const togglePublish = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.togglePublish(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Feedback publish status toggled',
    data: result,
  });
});

const respondToFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.respondToFeedback(
    req.params.id,
    req.body.adminResponse,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Response added successfully',
    data: result,
  });
});

const deleteFeedback = catchAsync(async (req: Request, res: Response) => {
  await FeedbackService.deleteFeedback(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Feedback deleted successfully',
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await FeedbackService.getMyReviews(userId, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My reviews retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const FeedbackController = {
  createFeedback,
  getPublishedByCourse,
  getAllFeedback,
  togglePublish,
  respondToFeedback,
  deleteFeedback,
  getMyReviews,
};
