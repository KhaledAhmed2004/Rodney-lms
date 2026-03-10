import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { DailyActivity } from './activity.model';
import { User } from '../user/user.model';

const getCalendar = async (studentId: string, days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const activities = await DailyActivity.find({
    student: studentId,
    date: { $gte: startDate },
  })
    .sort({ date: 1 })
    .select('date lessonsCompleted quizzesTaken pointsEarned isActive');

  return activities;
};

const getStreak = async (studentId: string) => {
  const user = await User.findById(studentId).select('streak');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  return {
    current: (user as any).streak?.current || 0,
    longest: (user as any).streak?.longest || 0,
    lastActiveDate: (user as any).streak?.lastActiveDate || null,
  };
};

const getAdminOverview = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [todayActive, weekActive, monthActive, dailyStats] = await Promise.all([
    DailyActivity.countDocuments({ date: today, isActive: true }),
    DailyActivity.distinct('student', {
      date: { $gte: sevenDaysAgo },
      isActive: true,
    }).then(r => r.length),
    DailyActivity.distinct('student', {
      date: { $gte: thirtyDaysAgo },
      isActive: true,
    }).then(r => r.length),
    DailyActivity.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$date',
          activeUsers: { $sum: 1 },
          totalLessons: { $sum: '$lessonsCompleted' },
          totalQuizzes: { $sum: '$quizzesTaken' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    todayActive,
    weekActive,
    monthActive,
    dailyStats,
  };
};

export const ActivityService = { getCalendar, getStreak, getAdminOverview };
