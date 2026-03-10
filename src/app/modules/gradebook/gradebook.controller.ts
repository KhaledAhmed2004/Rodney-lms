import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GradebookService } from './gradebook.service';

const getGradesByCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await GradebookService.getGradesByCourse(
    req.params.courseId,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grades retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getGradesByStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await GradebookService.getGradesByStudent(
    req.params.studentId,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Student grades retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getCourseSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await GradebookService.getCourseSummary(req.params.courseId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grade summary retrieved successfully',
    data: result,
  });
});

const updateGrade = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GradebookService.updateGrade(
    req.params.gradeId,
    userId,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grade updated successfully',
    data: result,
  });
});

const submitAssignment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await GradebookService.submitAssignment(
    req.params.lessonId,
    userId,
    req.body.courseId,
    req.body.content,
    req.body.attachments,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Assignment submitted successfully',
    data: result,
  });
});

const getAssignmentsByCourse = catchAsync(
  async (req: Request, res: Response) => {
    const result = await GradebookService.getAssignmentsByCourse(
      req.params.courseId,
      req.query,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Assignments retrieved successfully',
      pagination: result.pagination,
      data: result.data,
    });
  },
);

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

export const GradebookController = {
  getGradesByCourse,
  getGradesByStudent,
  getCourseSummary,
  updateGrade,
  submitAssignment,
  getAssignmentsByCourse,
  getMyGrades,
};
