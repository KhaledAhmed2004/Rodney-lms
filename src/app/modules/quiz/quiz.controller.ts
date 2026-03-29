import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { QuizService } from './quiz.service';

// ==================== ADMIN ====================

const createQuiz = catchAsync(async (req: Request, res: Response) => {
  const result = await QuizService.createQuiz(req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Quiz created successfully',
    data: result,
  });
});

const getAllQuizzes = catchAsync(async (req: Request, res: Response) => {
  const result = await QuizService.getAllQuizzes(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quizzes retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getQuizById = catchAsync(async (req: Request, res: Response) => {
  const result = await QuizService.getQuizById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz retrieved successfully',
    data: result,
  });
});

const updateQuiz = catchAsync(async (req: Request, res: Response) => {
  const result = await QuizService.updateQuiz(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz updated successfully',
    data: result,
  });
});

const deleteQuiz = catchAsync(async (req: Request, res: Response) => {
  await QuizService.deleteQuiz(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz deleted successfully',
  });
});

const getQuizAttempts = catchAsync(async (req: Request, res: Response) => {
  const result = await QuizService.getQuizAttempts(req.params.id, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Attempts retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

// ==================== STUDENT ====================

const getStudentView = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await QuizService.getStudentView(req.params.id, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz retrieved successfully',
    data: result,
  });
});

const startAttempt = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await QuizService.startAttempt(req.params.id, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Quiz attempt started',
    data: result,
  });
});

const submitAttempt = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await QuizService.submitAttempt(
    req.params.attemptId,
    userId,
    req.body.answers,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz submitted successfully',
    data: result,
  });
});

const getAttemptById = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const userRole = (req.user as JwtPayload).role;
  const result = await QuizService.getAttemptById(
    req.params.attemptId,
    userId,
    userRole,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Attempt retrieved successfully',
    data: result,
  });
});

const getMyAttempts = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await QuizService.getMyAttempts(userId, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz attempts retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const QuizController = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
  getStudentView,
  startAttempt,
  submitAttempt,
  getAttemptById,
  getMyAttempts,
};
