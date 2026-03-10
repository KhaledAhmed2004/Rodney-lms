import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IEnrollment } from './enrollment.interface';
import { Enrollment } from './enrollment.model';
import { Course } from '../course/course.model';
import { Lesson } from '../course/course.model';

const enrollInCourse = async (
  studentId: string,
  courseId: string,
): Promise<IEnrollment> => {
  // Check if course exists and is published
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course not found');
  }
  if (course.status !== 'PUBLISHED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Course is not available for enrollment',
    );
  }

  // Check if already enrolled
  const existing = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Already enrolled in this course');
  }

  const result = await Enrollment.create({
    student: studentId,
    course: courseId,
  });

  return result;
};

const bulkEnroll = async (
  studentId: string,
  courseIds: string[],
): Promise<IEnrollment[]> => {
  const results: IEnrollment[] = [];

  for (const courseId of courseIds) {
    // Skip if already enrolled
    const existing = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });
    if (existing) continue;

    const course = await Course.findById(courseId);
    if (!course || course.status !== 'PUBLISHED') continue;

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
    });
    results.push(enrollment);
  }

  return results;
};

const getAllEnrollments = async (query: Record<string, unknown>) => {
  const enrollmentQuery = new QueryBuilder(
    Enrollment.find()
      .populate('student', 'name email profilePicture')
      .populate('course', 'title slug thumbnail'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await enrollmentQuery.modelQuery;
  const pagination = await enrollmentQuery.getPaginationInfo();
  return { pagination, data };
};

const getMyEnrollments = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const enrollmentQuery = new QueryBuilder(
    Enrollment.find({ student: studentId }).populate(
      'course',
      'title slug thumbnail totalLessons totalDuration',
    ),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await enrollmentQuery.modelQuery;
  const pagination = await enrollmentQuery.getPaginationInfo();
  return { pagination, data };
};

const getEnrollmentById = async (id: string): Promise<IEnrollment> => {
  const result = await Enrollment.findById(id)
    .populate('student', 'name email profilePicture')
    .populate('course', 'title slug thumbnail totalLessons totalDuration');
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Enrollment not found');
  }
  return result;
};

const updateStatus = async (
  id: string,
  status: string,
): Promise<IEnrollment | null> => {
  const enrollment = await Enrollment.findById(id);
  if (!enrollment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Enrollment not found');
  }

  const updateData: Record<string, unknown> = { status };
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const result = await Enrollment.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  return result;
};

const completeLesson = async (
  enrollmentId: string,
  lessonId: string,
  studentId: string,
): Promise<IEnrollment | null> => {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Enrollment not found');
  }

  if (enrollment.student.toString() !== studentId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized');
  }

  // Check if lesson already completed
  const alreadyCompleted = enrollment.progress.completedLessons.some(
    l => l.toString() === lessonId,
  );
  if (alreadyCompleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Lesson already completed');
  }

  // Get total lessons for the course to calculate percentage
  const totalLessons = await Lesson.countDocuments({
    courseId: enrollment.course,
  });
  const newCompletedCount = enrollment.progress.completedLessons.length + 1;
  const completionPercentage =
    totalLessons > 0 ? Math.round((newCompletedCount / totalLessons) * 100) : 0;

  const updateData: Record<string, unknown> = {
    $addToSet: { 'progress.completedLessons': lessonId },
    $set: {
      'progress.lastAccessedLesson': lessonId,
      'progress.lastAccessedAt': new Date(),
      'progress.completionPercentage': completionPercentage,
    },
  };

  // Auto-complete enrollment if all lessons done
  if (completionPercentage >= 100) {
    (updateData.$set as Record<string, unknown>)['status'] = 'COMPLETED';
    (updateData.$set as Record<string, unknown>)['completedAt'] = new Date();
  }

  const result = await Enrollment.findByIdAndUpdate(enrollmentId, updateData, {
    new: true,
  });
  return result;
};

const getEnrolledStudents = async (
  courseId: string,
  query: Record<string, unknown>,
) => {
  const enrollmentQuery = new QueryBuilder(
    Enrollment.find({ course: courseId }).populate(
      'student',
      'name email profilePicture',
    ),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await enrollmentQuery.modelQuery;
  const pagination = await enrollmentQuery.getPaginationInfo();
  return { pagination, data };
};

export const EnrollmentService = {
  enrollInCourse,
  bulkEnroll,
  getAllEnrollments,
  getMyEnrollments,
  getEnrollmentById,
  updateStatus,
  completeLesson,
  getEnrolledStudents,
};
