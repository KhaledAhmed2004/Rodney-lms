import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CourseService } from './course.service';

// ==================== COURSE ====================

const createCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.createCourse(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Course created successfully',
    data: result,
  });
});

const getAllCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.getAllCourses(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Courses retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const browseCourses = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CourseService.browseCourses(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Courses retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getAdminCourses = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.getAdminCourses(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Courses retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getStudentCourseDetail = catchAsync(
  async (req: Request, res: Response) => {
    const { identifier } = req.params;
    const userId = (req.user as JwtPayload).id;
    const result = await CourseService.getStudentCourseDetail(
      identifier,
      userId,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Course detail retrieved successfully',
      data: result,
    });
  },
);

const getCourseByIdentifier = catchAsync(
  async (req: Request, res: Response) => {
    const { identifier } = req.params;
    const result = await CourseService.getCourseByIdentifier(identifier);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Course retrieved successfully',
      data: result,
    });
  },
);

const updateCourse = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const result = await CourseService.updateCourse(courseId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Course updated successfully',
    data: result,
  });
});

const deleteCourse = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  await CourseService.deleteCourse(courseId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Course deleted successfully',
  });
});

// ==================== MODULE ====================

const addModule = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const result = await CourseService.addModule(courseId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Module added successfully',
    data: result,
  });
});

const updateModule = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const result = await CourseService.updateModule(courseId, moduleId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Module updated successfully',
    data: result,
  });
});

const reorderModules = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const result = await CourseService.reorderModules(
    courseId,
    req.body.moduleOrder,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Modules reordered successfully',
    data: result,
  });
});

const deleteModule = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  await CourseService.deleteModule(courseId, moduleId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Module deleted successfully',
  });
});

// ==================== LESSON ====================

const createLesson = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const result = await CourseService.createLesson(
    courseId,
    moduleId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Lesson created successfully',
    data: result,
  });
});

const getLessonsByModule = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const result = await CourseService.getLessonsByModule(
    courseId,
    moduleId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lessons retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getLessonById = catchAsync(async (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;
  const result = await CourseService.getLessonById(courseId, lessonId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lesson retrieved successfully',
    data: result,
  });
});

const updateLesson = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId, lessonId } = req.params;
  const result = await CourseService.updateLesson(
    courseId,
    moduleId,
    lessonId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lesson updated successfully',
    data: result,
  });
});

const reorderLessons = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const result = await CourseService.reorderLessons(
    courseId,
    moduleId,
    req.body.lessonOrder,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lessons reordered successfully',
    data: result,
  });
});

const deleteLesson = catchAsync(async (req: Request, res: Response) => {
  const { courseId, moduleId, lessonId } = req.params;
  await CourseService.deleteLesson(courseId, moduleId, lessonId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Lesson deleted successfully',
  });
});

const toggleLessonVisibility = catchAsync(
  async (req: Request, res: Response) => {
    const { courseId, lessonId } = req.params;
    const result = await CourseService.toggleLessonVisibility(
      courseId,
      lessonId,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: `Lesson is now ${result?.isVisible ? 'visible' : 'hidden'}`,
      data: result,
    });
  },
);

export const CourseController = {
  createCourse,
  getAllCourses,
  browseCourses,
  getStudentCourseDetail,
  getAdminCourses,
  getCourseByIdentifier,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  reorderModules,
  deleteModule,
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  reorderLessons,
  deleteLesson,
  toggleLessonVisibility,
};
