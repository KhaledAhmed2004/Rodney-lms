import { User } from '../user/user.model';
import { Course } from '../course/course.model';
import { Enrollment } from '../enrollment/enrollment.model';
import { QuizAttempt } from '../quiz/quiz.model';
import AggregationBuilder from '../../builder/AggregationBuilder';

const getSummary = async () => {
  const endOfLastMonth = new Date();
  endOfLastMonth.setDate(0);
  endOfLastMonth.setHours(23, 59, 59, 999);

  const [
    studentGrowth,
    courseGrowth,
    activeEnrollmentGrowth,
    activeStudentIds,
    totalEnrollments,
    completedEnrollments,
    prevTotalEnrollments,
    prevCompletedEnrollments,
  ] = await Promise.all([
    new AggregationBuilder(User as any).calculateGrowth({
      period: 'month',
      filter: { role: 'STUDENT', status: 'ACTIVE' },
    }),
    new AggregationBuilder(Course as any).calculateGrowth({
      period: 'month',
      filter: { status: 'PUBLISHED' },
    }),
    new AggregationBuilder(Enrollment as any).calculateGrowth({
      period: 'month',
      filter: { status: 'ACTIVE' },
    }),
    Enrollment.distinct('student', { status: 'ACTIVE' }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'COMPLETED' }),
    Enrollment.countDocuments({ createdAt: { $lte: endOfLastMonth } }),
    Enrollment.countDocuments({
      status: 'COMPLETED',
      completedAt: { $lte: endOfLastMonth },
    }),
  ]);

  // Completion rate + growth
  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;
  const prevRate =
    prevTotalEnrollments > 0
      ? Math.round((prevCompletedEnrollments / prevTotalEnrollments) * 100)
      : 0;
  const rateDiff = completionRate - prevRate;
  const rateGrowthType: 'increase' | 'decrease' | 'no_change' =
    rateDiff > 0 ? 'increase' : rateDiff < 0 ? 'decrease' : 'no_change';

  const comparisonPeriod = 'month';

  return {
    comparisonPeriod,
    totalStudents: {
      value: studentGrowth.total,
      growth: studentGrowth.growth,
      growthType: studentGrowth.growthType,
    },
    activeStudents: {
      value: activeStudentIds.length,
      growth: activeEnrollmentGrowth.growth,
      growthType: activeEnrollmentGrowth.growthType,
    },
    totalCourses: {
      value: courseGrowth.total,
      growth: courseGrowth.growth,
      growthType: courseGrowth.growthType,
    },
    completionRate: {
      value: completionRate,
      growth: Math.abs(rateDiff),
      growthType: rateGrowthType,
    },
  };
};

const getTrends = async (months: number = 6) => {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(startDate.getMonth() - months);

  const [enrollmentTrends, completionTrends] = await Promise.all([
    new AggregationBuilder(Enrollment as any).getTimeTrends({
      timeUnit: 'month',
      startDate,
    }),
    new AggregationBuilder(Enrollment as any).getTimeTrends({
      timeUnit: 'month',
      dateField: 'completedAt',
      startDate,
      filter: { status: 'COMPLETED' },
    }),
  ]);

  return { enrollmentTrends, completionTrends };
};

const getRecentActivity = async (limit: number = 20, type?: string) => {
  const queries: Promise<any[]>[] = [];
  const includeTypes = type
    ? [type]
    : ['ENROLLMENT', 'COMPLETION', 'QUIZ_ATTEMPT'];

  if (includeTypes.includes('ENROLLMENT')) {
    queries.push(
      Enrollment.find()
        .populate('student', 'name')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .then(items =>
          items.map((item: any) => ({
            _id: item._id,
            type: 'ENROLLMENT',
            title: `${item.student?.name || 'Unknown'} enrolled in ${item.course?.title || 'Unknown'}`,
            timestamp: item.createdAt,
          }))
        )
    );
  }

  if (includeTypes.includes('COMPLETION')) {
    queries.push(
      Enrollment.find({ status: 'COMPLETED' })
        .populate('student', 'name')
        .populate('course', 'title')
        .sort({ completedAt: -1 })
        .limit(limit)
        .lean()
        .then(items =>
          items.map((item: any) => ({
            _id: item._id,
            type: 'COMPLETION',
            title: `${item.student?.name || 'Unknown'} completed ${item.course?.title || 'Unknown'}`,
            timestamp: item.completedAt,
          }))
        )
    );
  }

  if (includeTypes.includes('QUIZ_ATTEMPT')) {
    queries.push(
      QuizAttempt.find({ status: 'COMPLETED' })
        .populate('student', 'name')
        .populate('quiz', 'title')
        .sort({ completedAt: -1 })
        .limit(limit)
        .lean()
        .then(items =>
          items.map((item: any) => ({
            _id: item._id,
            type: 'QUIZ_ATTEMPT',
            title: `${item.student?.name || 'Unknown'} attempted ${item.quiz?.title || 'Unknown'}`,
            timestamp: item.completedAt,
          }))
        )
    );
  }

  const results = await Promise.all(queries);
  const merged = results.flat();

  merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return merged.slice(0, limit);
};

export const DashboardService = { getSummary, getTrends, getRecentActivity };
