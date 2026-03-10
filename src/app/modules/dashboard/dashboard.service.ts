import { User } from '../user/user.model';
import { Course } from '../course/course.model';
import { Enrollment } from '../enrollment/enrollment.model';
import { QuizAttempt } from '../quiz/quiz.model';

const getSummary = async () => {
  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    completedEnrollments,
    activeStudents,
  ] = await Promise.all([
    User.countDocuments({ status: 'ACTIVE', role: 'STUDENT' }),
    Course.countDocuments({ status: 'PUBLISHED' }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'COMPLETED' }),
    Enrollment.distinct('student', { status: 'ACTIVE' }).then(r => r.length),
  ]);

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  return {
    totalUsers,
    totalCourses,
    totalEnrollments,
    completedEnrollments,
    completionRate,
    activeStudents,
  };
};

const getTrends = async (months: number = 6) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const [enrollmentTrends, userTrends] = await Promise.all([
    Enrollment.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate }, role: 'STUDENT' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  return { enrollmentTrends, userTrends };
};

const getRecentActivity = async (limit: number = 20) => {
  const [recentEnrollments, recentCompletions, recentQuizAttempts] =
    await Promise.all([
      Enrollment.find()
        .populate('student', 'name profilePicture')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(limit),
      Enrollment.find({ status: 'COMPLETED' })
        .populate('student', 'name profilePicture')
        .populate('course', 'title')
        .sort({ completedAt: -1 })
        .limit(limit),
      QuizAttempt.find({ status: 'COMPLETED' })
        .populate('student', 'name profilePicture')
        .populate('quiz', 'title')
        .sort({ completedAt: -1 })
        .limit(limit),
    ]);

  return { recentEnrollments, recentCompletions, recentQuizAttempts };
};

export const DashboardService = { getSummary, getTrends, getRecentActivity };
