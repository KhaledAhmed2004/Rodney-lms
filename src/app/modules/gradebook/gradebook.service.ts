import { PipelineStage, Types } from 'mongoose';
import escapeRegex from 'escape-string-regexp';
import QueryBuilder from '../../builder/QueryBuilder';
import { Enrollment } from '../enrollment/enrollment.model';
import { ENROLLMENT_STATUS } from '../enrollment/enrollment.interface';
import { ASSESSMENT_TYPE, GRADE_STATUS } from './gradebook.interface';
import { Grade } from './gradebook.model';

const getMyGrades = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const gradeQuery = new QueryBuilder(
    Grade.find({ student: studentId }).populate(
      'course',
      'title slug thumbnail',
    ),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await gradeQuery.modelQuery;
  const pagination = await gradeQuery.getPaginationInfo();
  return { pagination, data };
};

const buildGradebookMatchConditions = (query: Record<string, unknown>) => {
  const conditions: Record<string, unknown> = {};

  if (query.status) {
    conditions.status = query.status;
  } else {
    conditions.status = ENROLLMENT_STATUS.ACTIVE;
  }

  if (query.courseId) {
    conditions.course = new Types.ObjectId(String(query.courseId));
  }

  return conditions;
};

const buildGradebookPipeline = (query: Record<string, unknown>) => {
  const matchConditions = buildGradebookMatchConditions(query);

  const pipeline: PipelineStage[] = [
    { $match: matchConditions },
    // Lookup student info
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo',
      },
    },
    { $unwind: '$studentInfo' },
    { $match: { 'studentInfo.status': { $ne: 'DELETE' } } },
    // Lookup course info
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseInfo',
      },
    },
    { $unwind: '$courseInfo' },
    // Lookup student's graded quiz grades
    {
      $lookup: {
        from: 'grades',
        let: { studentId: '$student', courseId: '$course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$student', '$$studentId'] },
                  { $eq: ['$course', '$$courseId'] },
                  { $eq: ['$assessmentType', ASSESSMENT_TYPE.QUIZ] },
                  { $eq: ['$status', GRADE_STATUS.GRADED] },
                ],
              },
            },
          },
          { $project: { percentage: 1, _id: 0 } },
        ],
        as: 'quizGrades',
      },
    },
    // Total quizzes per course
    {
      $lookup: {
        from: 'quizzes',
        localField: 'course',
        foreignField: 'course',
        pipeline: [{ $project: { _id: 1 } }],
        as: 'courseQuizzes',
      },
    },
    // Calculate summary fields
    {
      $addFields: {
        quizzesAttempted: { $size: '$quizGrades' },
        totalQuizzes: { $size: '$courseQuizzes' },
        overallQuizPercentage: {
          $cond: [
            { $gt: [{ $size: '$quizGrades' }, 0] },
            { $round: [{ $avg: '$quizGrades.percentage' }, 2] },
            0,
          ],
        },
        lastActivityDate: '$progress.lastAccessedAt',
      },
    },
    // Project final shape
    {
      $project: {
        _id: 1,
        studentName: '$studentInfo.name',
        studentEmail: '$studentInfo.email',
        studentAvatar: '$studentInfo.profilePicture',
        courseTitle: '$courseInfo.title',
        quizzesAttempted: 1,
        totalQuizzes: 1,
        overallQuizPercentage: 1,
        completionPercentage: '$progress.completionPercentage',
        lastActivityDate: 1,
        enrolledAt: 1,
      },
    },
  ];

  // Search filter (after lookups, capped at 200 chars)
  if (query.searchTerm) {
    const sanitized = escapeRegex(String(query.searchTerm).slice(0, 200));
    pipeline.push({
      $match: {
        $or: [
          { studentName: { $regex: sanitized, $options: 'i' } },
          { studentEmail: { $regex: sanitized, $options: 'i' } },
        ],
      },
    });
  }

  return pipeline;
};

const getAllStudentGradebook = async (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const pipeline = buildGradebookPipeline(query);

  // Add $facet for pagination
  pipeline.push({
    $facet: {
      data: [
        { $sort: { completionPercentage: -1 as const } },
        { $skip: skip },
        { $limit: limit },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const result = await Enrollment.aggregate(pipeline);
  const data = result[0]?.data ?? [];
  const total = result[0]?.total[0]?.count ?? 0;
  const totalPage = Math.ceil(total / limit);

  return {
    pagination: { page, limit, totalPage, total },
    data,
  };
};

const exportStudentGradebook = async (query: Record<string, unknown>) => {
  const pipeline = buildGradebookPipeline(query);

  pipeline.push({ $sort: { studentName: 1 as const } });

  return Enrollment.aggregate(pipeline);
};

// ==================== ADMIN SUMMARY (Stat Cards) ====================
const AT_RISK_COMPLETION_THRESHOLD = 20;
const AT_RISK_INACTIVE_DAYS = 14;

const getGradebookSummary = async () => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  endOfLastMonth.setHours(23, 59, 59, 999);

  const inactiveCutoff = new Date(
    now.getTime() - AT_RISK_INACTIVE_DAYS * 24 * 60 * 60 * 1000,
  );

  const [
    allTimeQuizAvg,
    thisMonthQuizAvg,
    lastMonthQuizAvg,
    currentCompletionAvg,
    previousCompletionAvg,
    atRiskStudents,
  ] = await Promise.all([
    // All-time avg quiz score
    Grade.aggregate([
      { $match: { assessmentType: ASSESSMENT_TYPE.QUIZ, status: GRADE_STATUS.GRADED } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]),
    // This month graded quizzes avg
    Grade.aggregate([
      {
        $match: {
          assessmentType: ASSESSMENT_TYPE.QUIZ,
          status: GRADE_STATUS.GRADED,
          createdAt: { $gte: startOfThisMonth },
        },
      },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]),
    // Last month graded quizzes avg
    Grade.aggregate([
      {
        $match: {
          assessmentType: ASSESSMENT_TYPE.QUIZ,
          status: GRADE_STATUS.GRADED,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]),
    // Current avg completion (all active enrollments)
    Enrollment.aggregate([
      { $match: { status: ENROLLMENT_STATUS.ACTIVE } },
      { $group: { _id: null, avg: { $avg: '$progress.completionPercentage' } } },
    ]),
    // Previous avg completion (active enrollments created before this month)
    Enrollment.aggregate([
      { $match: { status: ENROLLMENT_STATUS.ACTIVE, createdAt: { $lt: startOfThisMonth } } },
      { $group: { _id: null, avg: { $avg: '$progress.completionPercentage' } } },
    ]),
    // At-risk: active, low completion, inactive or never accessed
    Enrollment.countDocuments({
      status: ENROLLMENT_STATUS.ACTIVE,
      'progress.completionPercentage': { $lt: AT_RISK_COMPLETION_THRESHOLD },
      $or: [
        { 'progress.lastAccessedAt': { $lt: inactiveCutoff } },
        { 'progress.lastAccessedAt': null },
      ],
    }),
  ]);

  // Avg quiz score + growth (absolute delta like avgRating pattern)
  const quizValue = Math.round((allTimeQuizAvg[0]?.avg ?? 0) * 100) / 100;
  const thisMonthQuiz = thisMonthQuizAvg[0]?.avg ?? 0;
  const lastMonthQuiz = lastMonthQuizAvg[0]?.avg ?? 0;
  const hasLastMonthQuiz = lastMonthQuizAvg[0] != null;
  const quizDelta = hasLastMonthQuiz
    ? Math.round((thisMonthQuiz - lastMonthQuiz) * 10) / 10
    : 0;
  const quizGrowthType =
    quizDelta > 0 ? 'increase' : quizDelta < 0 ? 'decrease' : 'no_change';

  // Avg completion + growth (absolute delta)
  const completionValue =
    Math.round((currentCompletionAvg[0]?.avg ?? 0) * 100) / 100;
  const prevCompletion = previousCompletionAvg[0]?.avg ?? 0;
  const hasPrevCompletion = previousCompletionAvg[0] != null;
  const completionDelta = hasPrevCompletion
    ? Math.round((completionValue - prevCompletion) * 10) / 10
    : 0;
  const completionGrowthType =
    completionDelta > 0
      ? 'increase'
      : completionDelta < 0
        ? 'decrease'
        : 'no_change';

  return {
    avgQuizScore: {
      value: quizValue,
      growth: Math.abs(quizDelta),
      growthType: quizGrowthType as 'increase' | 'decrease' | 'no_change',
    },
    avgCompletion: {
      value: completionValue,
      growth: Math.abs(completionDelta),
      growthType: completionGrowthType as 'increase' | 'decrease' | 'no_change',
    },
    atRiskStudents,
  };
};

export const GradebookService = {
  getMyGrades,
  getAllStudentGradebook,
  exportStudentGradebook,
  getGradebookSummary,
};
