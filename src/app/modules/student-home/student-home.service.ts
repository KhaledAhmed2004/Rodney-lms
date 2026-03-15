import { Types } from 'mongoose';
import { Enrollment } from '../enrollment/enrollment.model';
import { QuizAttempt } from '../quiz/quiz.model';
import { StudentBadge } from '../gamification/gamification.model';
import { User } from '../user/user.model';

const getHome = async (studentId: string) => {
  const [user, enrolledCourses, recentBadges, quizStats] = await Promise.all([
    User.findById(studentId).select('name streak totalPoints'),
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
    QuizAttempt.aggregate([
      { $match: { student: new Types.ObjectId(studentId), status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
        },
      },
    ]),
  ]);

  // Filter out enrollments where course was deleted
  const validEnrolledCourses = enrolledCourses.filter((e: any) => e.course);
  const validRecentBadges = recentBadges.filter((sb: any) => sb.badge);

  // Calculate course progress (average completion across all courses)
  const totalCourses = validEnrolledCourses.length;
  const courseProgress =
    totalCourses > 0
      ? Math.round(
          validEnrolledCourses.reduce(
            (sum: number, e: any) => sum + (e.progress.completionPercentage || 0),
            0,
          ) / totalCourses,
        )
      : 0;

  // Calculate quiz progress
  const quizTotal = quizStats[0]?.total || 0;
  const quizPassed = quizStats[0]?.passed || 0;
  const quizPercentage =
    quizTotal > 0 ? Math.round((quizPassed / quizTotal) * 100) : 0;

  return {
    name: (user as any)?.name || '',
    points: (user as any)?.totalPoints || 0,
    streak: {
      current: (user as any)?.streak?.current || 0,
      longest: (user as any)?.streak?.longest || 0,
    },
    yourProgress: {
      courseProgress,
      quizProgress: quizPercentage,
    },
    enrolledCourses: validEnrolledCourses.map((e: any) => ({
      enrollmentId: e._id,
      courseId: e.course._id,
      title: e.course.title,
      slug: e.course.slug,
      thumbnail: e.course.thumbnail,
      totalLessons: e.course.totalLessons,
      completionPercentage: e.progress.completionPercentage || 0,
      status: e.status,
    })),
    recentBadges: validRecentBadges.map((sb: any) => ({
      name: sb.badge.name,
      icon: sb.badge.icon,
      earnedAt: sb.earnedAt,
    })),
  };
};

const getProgress = async (studentId: string) => {
  const [user, enrollments] = await Promise.all([
    User.findById(studentId).select('streak totalPoints'),
    Enrollment.find({
      student: studentId,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    })
      .populate('course', 'title slug')
      .select('course progress'),
  ]);

  const validEnrollments = enrollments.filter((e: any) => e.course);
  const totalCourses = validEnrollments.length;
  const overallPercentage =
    totalCourses > 0
      ? Math.round(
          validEnrollments.reduce(
            (sum: number, e: any) =>
              sum + (e.progress.completionPercentage || 0),
            0,
          ) / totalCourses,
        )
      : 0;

  return {
    overallPercentage,
    points: (user as any)?.totalPoints || 0,
    streak: {
      current: (user as any)?.streak?.current || 0,
      longest: (user as any)?.streak?.longest || 0,
    },
    courses: validEnrollments.map((e: any) => ({
      title: e.course.title,
      slug: e.course.slug,
      completionPercentage: e.progress.completionPercentage || 0,
    })),
  };
};

export const StudentHomeService = { getHome, getProgress };
