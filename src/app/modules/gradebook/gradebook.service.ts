import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EnrollmentHelper } from '../../helpers/enrollmentHelper';
import { IGrade } from './gradebook.interface';
import { Grade, AssignmentSubmission } from './gradebook.model';

const getGradesByCourse = async (
  courseId: string,
  query: Record<string, unknown>,
) => {
  const gradeQuery = new QueryBuilder(
    Grade.find({ course: courseId })
      .populate('student', 'name email profilePicture')
      .populate('gradedBy', 'name'),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await gradeQuery.modelQuery;
  const pagination = await gradeQuery.getPaginationInfo();
  return { pagination, data };
};

const getGradesByStudent = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const gradeQuery = new QueryBuilder(
    Grade.find({ student: studentId }).populate('course', 'title slug'),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await gradeQuery.modelQuery;
  const pagination = await gradeQuery.getPaginationInfo();
  return { pagination, data };
};

const getCourseSummary = async (courseId: string) => {
  const grades = await Grade.find({ course: courseId, status: 'GRADED' });

  if (grades.length === 0) {
    return {
      totalGrades: 0,
      averagePercentage: 0,
      passCount: 0,
      failCount: 0,
      gpaDistribution: {},
    };
  }

  const totalGrades = grades.length;
  const avgPercentage =
    grades.reduce((sum, g) => sum + g.percentage, 0) / totalGrades;
  const passCount = grades.filter(g => g.percentage >= 60).length;
  const failCount = totalGrades - passCount;

  // GPA distribution
  const gpaDistribution = {
    'A (90-100)': grades.filter(g => g.percentage >= 90).length,
    'B (80-89)': grades.filter(g => g.percentage >= 80 && g.percentage < 90)
      .length,
    'C (70-79)': grades.filter(g => g.percentage >= 70 && g.percentage < 80)
      .length,
    'D (60-69)': grades.filter(g => g.percentage >= 60 && g.percentage < 70)
      .length,
    'F (<60)': grades.filter(g => g.percentage < 60).length,
  };

  return {
    totalGrades,
    averagePercentage: Math.round(avgPercentage * 100) / 100,
    passCount,
    failCount,
    gpaDistribution,
  };
};

const updateGrade = async (
  gradeId: string,
  adminId: string,
  payload: { score?: number; feedback?: string; status?: string },
): Promise<IGrade | null> => {
  const grade = await Grade.findById(gradeId);
  if (!grade) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Grade not found');
  }

  const updateData: Record<string, unknown> = { ...payload };

  if (payload.score !== undefined) {
    updateData.percentage =
      grade.maxScore > 0
        ? Math.round((payload.score / grade.maxScore) * 100)
        : 0;
  }

  if (payload.status === 'GRADED') {
    updateData.gradedBy = adminId;
    updateData.gradedAt = new Date();
  }

  const result = await Grade.findByIdAndUpdate(gradeId, updateData, {
    new: true,
  });
  return result;
};

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

const getAssignmentsByCourse = async (
  courseId: string,
  query: Record<string, unknown>,
) => {
  const submissionQuery = new QueryBuilder(
    AssignmentSubmission.find({ course: courseId })
      .populate('student', 'name email profilePicture')
      .populate('lesson', 'title'),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await submissionQuery.modelQuery;
  const pagination = await submissionQuery.getPaginationInfo();
  return { pagination, data };
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

export const GradebookService = {
  getGradesByCourse,
  getGradesByStudent,
  getCourseSummary,
  updateGrade,
  submitAssignment,
  getAssignmentsByCourse,
  getMyGrades,
};
