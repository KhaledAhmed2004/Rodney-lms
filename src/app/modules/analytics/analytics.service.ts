import { Enrollment } from '../enrollment/enrollment.model';
import { QuizAttempt } from '../quiz/quiz.model';
import { DailyActivity } from '../activity/activity.model';
import { User } from '../user/user.model';
import { Course } from '../course/course.model';

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
        date: '$_id',
        activeUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return activeUsers;
};

const getCourseCompletion = async () => {
  const courses = await Course.find({ status: 'PUBLISHED' }).select(
    'title slug',
  );

  const completionData = await Promise.all(
    courses.map(async course => {
      const total = await Enrollment.countDocuments({ course: course._id });
      const completed = await Enrollment.countDocuments({
        course: course._id,
        status: 'COMPLETED',
      });
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        courseId: course._id,
        title: course.title,
        totalEnrollments: total,
        completedEnrollments: completed,
        completionRate: rate,
      };
    }),
  );

  return completionData;
};

const getQuizPerformance = async () => {
  const quizStats = await QuizAttempt.aggregate([
    { $match: { status: 'COMPLETED' } },
    {
      $group: {
        _id: '$quiz',
        avgScore: { $avg: '$percentage' },
        totalAttempts: { $sum: 1 },
        passCount: {
          $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
        },
        avgTimeSpent: { $avg: '$timeSpent' },
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
        quizId: '$_id',
        title: '$quiz.title',
        avgScore: { $round: ['$avgScore', 1] },
        totalAttempts: 1,
        passRate: {
          $round: [
            { $multiply: [{ $divide: ['$passCount', '$totalAttempts'] }, 100] },
            1,
          ],
        },
        avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);

  return quizStats;
};

const getCourseAnalytics = async (courseId: string) => {
  const [enrollmentStats, quizStats, progressDistribution] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: courseId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    QuizAttempt.aggregate([
      { $match: { course: courseId, status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 },
          passCount: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
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
    quizStats: quizStats[0] || null,
    progressDistribution,
  };
};

const getStudentAnalytics = async (studentId: string) => {
  const [enrollments, quizPerformance, activitySummary] = await Promise.all([
    Enrollment.find({ student: studentId })
      .populate('course', 'title slug')
      .select('status progress completedAt'),
    QuizAttempt.aggregate([
      { $match: { student: studentId, status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$percentage' },
          totalQuizzes: { $sum: 1 },
          passCount: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
        },
      },
    ]),
    DailyActivity.aggregate([
      { $match: { student: studentId } },
      {
        $group: {
          _id: null,
          totalDaysActive: { $sum: 1 },
          totalLessons: { $sum: '$lessonsCompleted' },
          totalQuizzes: { $sum: '$quizzesTaken' },
          totalTimeSpent: { $sum: '$timeSpent' },
        },
      },
    ]),
  ]);

  return {
    enrollments,
    quizPerformance: quizPerformance[0] || null,
    activitySummary: activitySummary[0] || null,
  };
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
  getUserEngagement,
  getCourseCompletion,
  getQuizPerformance,
  getCourseAnalytics,
  getStudentAnalytics,
};
