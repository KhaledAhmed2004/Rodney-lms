import { Enrollment } from '../enrollment/enrollment.model';
import { QuizAttempt } from '../quiz/quiz.model';
import { DailyActivity } from '../activity/activity.model';
import { StudentBadge } from '../gamification/gamification.model';
import { PointsLedger } from '../gamification/gamification.model';
import { User } from '../user/user.model';

const getHome = async (studentId: string) => {
  const [
    user,
    enrolledCourses,
    recentBadges,
    totalPointsResult,
    todayActivity,
  ] = await Promise.all([
    User.findById(studentId).select('streak totalPoints'),
    Enrollment.find({
      student: studentId,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    })
      .populate('course', 'title slug thumbnail totalLessons')
      .sort({ 'progress.lastAccessedAt': -1 })
      .limit(10),
    StudentBadge.find({ student: studentId })
      .populate('badge', 'name icon')
      .sort({ earnedAt: -1 })
      .limit(5),
    PointsLedger.aggregate([
      { $match: { student: studentId } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]),
    (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return DailyActivity.findOne({ student: studentId, date: today });
    })(),
  ]);

  return {
    points: totalPointsResult[0]?.total || (user as any)?.totalPoints || 0,
    streak: {
      current: (user as any)?.streak?.current || 0,
      longest: (user as any)?.streak?.longest || 0,
    },
    enrolledCourses: enrolledCourses.map((e: any) => ({
      enrollmentId: e._id,
      courseId: e.course._id,
      title: e.course.title,
      slug: e.course.slug,
      thumbnail: e.course.thumbnail,
      totalLessons: e.course.totalLessons,
      completionPercentage: e.progress.completionPercentage,
      status: e.status,
    })),
    recentBadges: recentBadges.map((sb: any) => ({
      name: sb.badge.name,
      icon: sb.badge.icon,
      earnedAt: sb.earnedAt,
    })),
    todayActive: !!todayActivity,
  };
};

const getProgress = async (studentId: string) => {
  const [user, enrollments, quizResults, totalPointsResult] = await Promise.all(
    [
      User.findById(studentId).select('streak totalPoints'),
      Enrollment.find({ student: studentId })
        .populate('course', 'title slug')
        .select('course status progress'),
      QuizAttempt.find({ student: studentId, status: 'COMPLETED' })
        .populate('quiz', 'title')
        .sort({ completedAt: -1 })
        .limit(20),
      PointsLedger.aggregate([
        { $match: { student: studentId } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
    ],
  );

  // Calculate overall progress
  const totalCourses = enrollments.length;
  const overallPercentage =
    totalCourses > 0
      ? Math.round(
          enrollments.reduce(
            (sum: number, e: any) => sum + e.progress.completionPercentage,
            0,
          ) / totalCourses,
        )
      : 0;

  return {
    overallPercentage,
    points: totalPointsResult[0]?.total || 0,
    streak: {
      current: (user as any)?.streak?.current || 0,
      longest: (user as any)?.streak?.longest || 0,
    },
    progressByTopics: enrollments.map((e: any) => ({
      courseId: e.course._id,
      title: e.course.title,
      slug: e.course.slug,
      completionPercentage: e.progress.completionPercentage,
      status: e.status,
      completedLessons: e.progress.completedLessons.length,
    })),
    quizResults: quizResults.map((a: any) => ({
      quizId: a.quiz._id,
      quizTitle: a.quiz.title,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      passed: a.passed,
      completedAt: a.completedAt,
    })),
  };
};

export const StudentHomeService = { getHome, getProgress };
