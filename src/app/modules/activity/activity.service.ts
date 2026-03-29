import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { DailyActivity } from './activity.model';
import { User } from '../user/user.model';

const getCalendar = async (
  studentId: string,
  month?: number,
  year?: number,
) => {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const activeDays = await DailyActivity.find({
    student: studentId,
    date: { $gte: startDate, $lt: endDate },
  })
    .sort({ date: 1 })
    .select('date -_id')
    .lean();

  const days = activeDays.map(d => d.date);

  return { month: m, year: y, days };
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
