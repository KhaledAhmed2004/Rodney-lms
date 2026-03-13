import { StatusCodes } from 'http-status-codes';
import { PipelineStage, Types } from 'mongoose';
import escapeRegex from 'escape-string-regexp';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EnrollmentHelper } from '../../helpers/enrollmentHelper';
import { Enrollment } from '../enrollment/enrollment.model';
import { ENROLLMENT_STATUS } from '../enrollment/enrollment.interface';
import { ASSESSMENT_TYPE, GRADE_STATUS } from './gradebook.interface';
import { Grade, AssignmentSubmission } from './gradebook.model';

const submitAssignment = async (
  lessonId: string,
  studentId: string,
  courseId: string,
  content: string,
  attachments: string[],
) => {
  // Verify enrollment
  const enrollment = await EnrollmentHelper.verifyEnrollment(
    studentId,
    courseId,
  );

  // Check for existing submission
  const existing = await AssignmentSubmission.findOne({
    student: studentId,
    lesson: lessonId,
    status: { $in: ['SUBMITTED', 'GRADED'] },
  });

  if (existing) {
    // Allow resubmission if returned
    if (existing.status === 'GRADED') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Assignment already graded');
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Assignment already submitted');
  }

  const attachmentData = (attachments || []).map((url: string) => ({
    url,
    name: url.split('/').pop() || 'file',
  }));

  const submission = await AssignmentSubmission.create({
    student: studentId,
    course: courseId,
    lesson: lessonId,
    enrollment: (enrollment as any)._id,
    content: content || '',
    attachments: attachmentData,
  });

  return submission;
};

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
    // Lookup quiz grades (pipeline lookup for filtered join)
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
          {
            $project: {
              title: '$assessmentTitle',
              percentage: 1,
              _id: 0,
            },
          },
          { $sort: { title: 1 as const } },
        ],
        as: 'quizzes',
      },
    },
    // Calculate overall quiz % and flatten fields
    {
      $addFields: {
        overallQuizPercentage: {
          $cond: [
            { $gt: [{ $size: '$quizzes' }, 0] },
            { $round: [{ $avg: '$quizzes.percentage' }, 2] },
            0,
          ],
        },
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
        quizzes: 1,
        overallQuizPercentage: 1,
        completionPercentage: '$progress.completionPercentage',
        enrolledAt: 1,
      },
    },
  ];

  // Search filter (after lookups)
  if (query.searchTerm) {
    const sanitized = escapeRegex(String(query.searchTerm));
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
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
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

  const data = await Enrollment.aggregate(pipeline);

  // Format quizzes array into readable string for export
  return data.map(
    (row: Record<string, unknown> & { quizzes: { title: string; percentage: number }[] }) => ({
      ...row,
      quizScores:
        row.quizzes
          .map(q => `${q.title}: ${q.percentage}%`)
          .join(', ') || 'N/A',
    }),
  );
};

export const GradebookService = {
  submitAssignment,
  getMyGrades,
  getAllStudentGradebook,
  exportStudentGradebook,
};
