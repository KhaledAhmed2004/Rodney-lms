import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import ExportBuilder from '../../builder/ExportBuilder';
import { AnalyticsService } from './analytics.service';

const getCourseCompletion = catchAsync(async (req: Request, res: Response) => {
  const period = req.query.period as string | undefined;
  const result = await AnalyticsService.getCourseCompletion(period);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Course completion rates retrieved successfully',
    data: result,
  });
});

const getQuizPerformance = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const period = req.query.period as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await AnalyticsService.getQuizPerformance(
    courseId,
    period,
    page,
    limit,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Quiz performance retrieved successfully',
    pagination: result.pagination,
    data: result.data,
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

const getEngagementHeatmap = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'quarter';
  const result = await AnalyticsService.getEngagementHeatmap(period);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Engagement heatmap retrieved successfully',
    data: result,
  });
});

const columnMap: Record<
  string,
  { key: string; header: string; width: number }[]
> = {
  courses: [
    { key: 'title', header: 'Course', width: 30 },
    { key: 'totalEnrollments', header: 'Enrolled', width: 12 },
    { key: 'completedEnrollments', header: 'Completed', width: 12 },
    { key: 'completionRate', header: 'Completion %', width: 14 },
  ],
  quizzes: [
    { key: 'title', header: 'Quiz', width: 30 },
    { key: 'avgScore', header: 'Avg Score', width: 12 },
    { key: 'totalAttempts', header: 'Total Attempts', width: 14 },
    { key: 'passRate', header: 'Pass Rate %', width: 12 },
  ],
  engagement: [
    { key: 'date', header: 'Date', width: 14 },
    { key: 'activeUsers', header: 'Active Users', width: 14 },
  ],
};

const exportAnalytics = catchAsync(async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const period = req.query.period as string | undefined;
  const course = req.query.course as string | undefined;
  const data = await AnalyticsService.getExportData(type, period, course);
  const format = req.query.format === 'xlsx' ? 'excel' : 'csv';
  const filename = `analytics-${type}-${new Date().toISOString().slice(0, 10)}`;

  await new ExportBuilder(data)
    .format(format as 'excel' | 'csv')
    .columns(columnMap[type])
    .dateFormat('DD/MM/YYYY')
    .sendResponse(res, filename);
});

export const AnalyticsController = {
  getCourseCompletion,
  getQuizPerformance,
  getEngagementHeatmap,
  getCourseAnalytics,
  exportAnalytics,
};
