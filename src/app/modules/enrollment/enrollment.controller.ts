import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { EnrollmentService } from './enrollment.service';

const enrollInCourse = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await EnrollmentService.enrollInCourse(
    userId,
    req.body.courseId,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Enrolled successfully',
    data: result,
  });
});

const bulkEnroll = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await EnrollmentService.bulkEnroll(userId, req.body.courseIds);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Enrolled in courses successfully',
    data: result,
  });
});

const getAllEnrollments = catchAsync(async (req: Request, res: Response) => {
  const result = await EnrollmentService.getAllEnrollments(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Enrollments retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getMyEnrollments = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await EnrollmentService.getMyEnrollments(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My enrollments retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getEnrollmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await EnrollmentService.getEnrollmentById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Enrollment retrieved successfully',
    data: result,
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await EnrollmentService.updateStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Enrollment status updated successfully',
    data: result,
  });
});

const completeLesson = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const { enrollmentId, lessonId } = req.params;
  const result = await EnrollmentService.completeLesson(
    enrollmentId,
    lessonId,
    userId,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lesson completed successfully',
    data: result,
  });
});

const getEnrolledStudents = catchAsync(async (req: Request, res: Response) => {
  const result = await EnrollmentService.getEnrolledStudents(
    req.params.courseId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Enrolled students retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const EnrollmentController = {
  enrollInCourse,
  bulkEnroll,
  getAllEnrollments,
  getMyEnrollments,
  getEnrollmentById,
  updateStatus,
  completeLesson,
  getEnrolledStudents,
};
