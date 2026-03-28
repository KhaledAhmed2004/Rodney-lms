import { PipelineStage } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Course } from '../course/course.model';
import { Enrollment } from '../enrollment/enrollment.model';
import { Quiz, QuizAttempt } from '../quiz/quiz.model';
import { DailyActivity } from '../activity/activity.model';

const getUserEngagement = async (period: string = 'month') => {
  const startDate = getStartDate(period);

  const activeUsers = await DailyActivity.aggregate([
    { $match: { date: { $gte: startDate }, isActive: true } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        uniqueUsers: { $addToSet: '$student' },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        activeUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return activeUsers;
};

const getCourseCompletion = async (period?: string) => {
  const matchStage: Record<string, unknown> = {};
  if (period) {
    matchStage.createdAt = { $gte: getStartDate(period) };
  }

  const pipeline: PipelineStage[] = [
    ...(Object.keys(matchStage).length > 0
      ? [{ $match: matchStage } as PipelineStage]
      : []),
    {
      $group: {
        _id: '$course',
        totalEnrollments: { $sum: 1 },
        completedEnrollments: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course',
        pipeline: [
          { $match: { status: 'PUBLISHED' } },
          { $project: { title: 1 } },
        ],
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        _id: 0,
        courseId: '$_id',
        title: '$course.title',
        totalEnrollments: 1,
        completedEnrollments: 1,
        completionRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$completedEnrollments', '$totalEnrollments'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { completionRate: -1 as const } },
  ];

  return Enrollment.aggregate(pipeline);
};

const getQuizPerformance = async (
  courseId: string,
  period?: string,
  page: number = 1,
  limit: number = 10,
) => {
  // Validate course exists
  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course not found');
  }

  // Find quiz IDs for this course
  const quizIds = await Quiz.find({ course: courseId }).distinct('_id');
  if (quizIds.length === 0) {
    return { data: [], pagination: { page, limit, total: 0, totalPage: 0 } };
  }

  const matchConditions: Record<string, unknown> = {
    status: 'COMPLETED',
    quiz: { $in: quizIds },
  };
  if (period) {
    matchConditions.createdAt = { $gte: getStartDate(period) };
  }

  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$quiz',
        avgScore: { $avg: '$percentage' },
        totalAttempts: { $sum: 1 },
        passCount: {
          $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'quizzes',
        localField: '_id',
        foreignField: '_id',
        as: 'quiz',
        pipeline: [{ $project: { title: 1 } }],
      },
    },
    { $unwind: '$quiz' },
    {
      $project: {
        _id: 0,
        title: '$quiz.title',
        avgScore: { $round: ['$avgScore', 1] },
        totalAttempts: 1,
        passRate: {
          $round: [
            { $multiply: [{ $divide: ['$passCount', '$totalAttempts'] }, 100] },
            1,
          ],
        },
      },
    },
    { $sort: { avgScore: -1 as const } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await QuizAttempt.aggregate(pipeline);
  const data = result[0]?.data ?? [];
  const total = result[0]?.total[0]?.count ?? 0;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getCourseAnalytics = async (courseId: string) => {
  const [enrollmentStats, progressDistribution] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: courseId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Enrollment.aggregate([
      { $match: { course: courseId } },
      {
        $bucket: {
          groupBy: '$progress.completionPercentage',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
  ]);

  return {
    enrollmentStats,
    progressDistribution,
  };
};

const getEngagementHeatmap = async (period: string = 'quarter') => {
  const startDate = getStartDate(period);
  // End of today in UTC — consistent with MongoDB $dateToString (UTC) and toISOString (UTC)
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  // Get active days from DB
  const dailyData = await DailyActivity.aggregate([
    { $match: { date: { $gte: startDate }, isActive: true } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        uniqueUsers: { $addToSet: '$student' },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        activeUsers: { $size: '$uniqueUsers' },
      },
    },
  ]);

  // Build lookup map: date string → activeUsers
  const activityMap = new Map<string, number>();
  for (const d of dailyData) {
    activityMap.set(d.date, d.activeUsers);
  }

  // Generate ALL days in the period (gap-fill zeros)
  const allDays: { date: string; activeUsers: number }[] = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    allDays.push({
      date: dateStr,
      activeUsers: activityMap.get(dateStr) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Calculate intensity (0-4) based on quartiles
  const counts = allDays
    .map(d => d.activeUsers)
    .filter(c => c > 0)
    .sort((a, b) => a - b);

  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    return arr[Math.max(0, Math.ceil(arr.length * p) - 1)];
  };

  const p25 = getPercentile(counts, 0.25);
  const p50 = getPercentile(counts, 0.5);
  const p75 = getPercentile(counts, 0.75);

  return allDays.map(d => {
    let intensity = 0;
    if (d.activeUsers > 0) {
      if (d.activeUsers <= p25) intensity = 1;
      else if (d.activeUsers <= p50) intensity = 2;
      else if (d.activeUsers <= p75) intensity = 3;
      else intensity = 4;
    }

    return {
      date: d.date,
      activeUsers: d.activeUsers,
      intensity,
    };
  });
};

const getExportData = async (
  type: string,
  period?: string,
  course?: string,
) => {
  switch (type) {
    case 'courses':
      return getCourseCompletion(period);
    case 'quizzes': {
      if (!course)
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Course ID is required for quiz export',
        );
      const result = await getQuizPerformance(course, period, 1, 1000);
      return result.data;
    }
    case 'engagement':
      return getUserEngagement(period);
    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid export type');
  }
};

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      now.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setMonth(now.getMonth() - 1);
  }
  return now;
}

export const AnalyticsService = {
  getCourseCompletion,
  getQuizPerformance,
  getCourseAnalytics,
  getEngagementHeatmap,
  getExportData,
};
