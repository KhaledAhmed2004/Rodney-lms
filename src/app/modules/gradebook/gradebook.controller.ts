import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import ExportBuilder from '../../builder/ExportBuilder';
import { GradebookService } from './gradebook.service';

const getMyGrades = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GradebookService.getMyGrades(userId, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My grades retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getAllStudentGradebook = catchAsync(
  async (req: Request, res: Response) => {
    const result = await GradebookService.getAllStudentGradebook(req.query);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Student gradebook retrieved successfully',
      pagination: result.pagination,
      data: result.data,
    });
  },
);

const getGradebookSummary = catchAsync(
  async (req: Request, res: Response) => {
    const result = await GradebookService.getGradebookSummary();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Gradebook summary retrieved successfully',
      data: result,
    });
  },
);

const exportStudentGradebook = catchAsync(
  async (req: Request, res: Response) => {
    const data = await GradebookService.exportStudentGradebook(req.query);
    const format = req.query.format === 'xlsx' ? 'excel' : 'csv';
    const filename = `student-gradebook-${new Date().toISOString().slice(0, 10)}`;

    await new ExportBuilder(data)
      .format(format as 'excel' | 'csv')
      .columns([
        { key: 'studentName', header: 'Student Name', width: 20 },
        { key: 'studentEmail', header: 'Email', width: 30 },
        { key: 'courseTitle', header: 'Course', width: 30 },
        { key: 'quizzesAttempted', header: 'Quizzes Attempted', width: 18 },
        { key: 'totalQuizzes', header: 'Total Quizzes', width: 15 },
        { key: 'overallQuizPercentage', header: 'Quiz Avg %', width: 12 },
        { key: 'completionPercentage', header: 'Completion %', width: 15 },
        { key: 'lastActivityDate', header: 'Last Activity', width: 18 },
      ])
      .sendResponse(res, filename);
  },
);

export const GradebookController = {
  getMyGrades,
  getAllStudentGradebook,
  getGradebookSummary,
  exportStudentGradebook,
};
