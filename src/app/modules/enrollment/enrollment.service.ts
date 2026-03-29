import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { GamificationHelper } from '../../helpers/gamificationHelper';
import { POINTS_REASON } from '../gamification/gamification.interface';
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

  try {
    const result = await Enrollment.create({
      student: studentId,
      course: courseId,
    });

    // Increment enrollmentCount
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 },
    });

    // Gamification: first enrollment bonus
    try {
      const enrollmentCount = await Enrollment.countDocuments({ student: studentId });
      if (enrollmentCount === 1) {
        await GamificationHelper.awardPoints(studentId, POINTS_REASON.FIRST_ENROLLMENT, courseId, 'Course');
      }
      await GamificationHelper.checkAndAwardBadges(studentId);
    } catch { /* points failure should not block enrollment */ }

    return result;
  } catch (error: any) {
    // Race condition: concurrent double-click
    if (error.code === 11000) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Already enrolled in this course',
      );
    }
    throw error;
  }
};

const bulkEnroll = async (
  studentId: string,
  courseIds: string[],
): Promise<{ enrolledCount: number; skippedCount: number }> => {
  // Deduplicate input
  const uniqueIds = [...new Set(courseIds)];

  // Batch: find existing enrollments
  const existing = await Enrollment.find({
    student: studentId,
    course: { $in: uniqueIds },
  })
    .select('course')
    .lean();
  const enrolledSet = new Set(existing.map(e => e.course.toString()));

  // Batch: find valid published courses
  const courses = await Course.find({
    _id: { $in: uniqueIds },
    status: 'PUBLISHED',
  })
    .select('_id')
    .lean();
  const validSet = new Set(courses.map(c => c._id.toString()));

  // Filter to new, valid enrollments only
  const toEnroll = uniqueIds.filter(
    id => validSet.has(id) && !enrolledSet.has(id),
  );

  if (toEnroll.length > 0) {
    // Bulk insert with ordered:false — skip duplicate key errors from race conditions
    try {
      await Enrollment.insertMany(
        toEnroll.map(courseId => ({ student: studentId, course: courseId })),
        { ordered: false },
      );
    } catch (err: any) {
      // Only ignore duplicate key errors (race condition)
      if (
        err.code !== 11000 &&
        !err.writeErrors?.every((e: any) => e.code === 11000)
      ) {
        throw err;
      }
    }

    // Increment enrollmentCount on each enrolled course (+1 each)
    await Course.updateMany(
      { _id: { $in: toEnroll } },
      { $inc: { enrollmentCount: 1 } },
    );
  }

  return {
    enrolledCount: toEnroll.length,
    skippedCount: uniqueIds.length - toEnroll.length,
  };
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

  // Gamification: manual course completion
  if (status === 'COMPLETED' && result) {
    try {
      await GamificationHelper.awardPoints(
        enrollment.student.toString(),
        POINTS_REASON.COURSE_COMPLETE,
        enrollment.course.toString(),
        'Course',
      );
      await GamificationHelper.checkAndAwardBadges(enrollment.student.toString());
    } catch { /* points failure should not block status update */ }
  }

  return result;
};

const completeLesson = async (
  courseId: string,
  lessonId: string,
  studentId: string,
) => {
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ['ACTIVE'] },
  });
  if (!enrollment) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not enrolled in this course');
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

  const result = await Enrollment.findByIdAndUpdate(
    enrollment._id,
    updateData,
    { new: true },
  );

  // Gamification: lesson complete + auto course complete
  try {
    await GamificationHelper.awardPoints(studentId, POINTS_REASON.LESSON_COMPLETE, lessonId, 'Lesson');
    if (result?.status === 'COMPLETED') {
      await GamificationHelper.awardPoints(studentId, POINTS_REASON.COURSE_COMPLETE, courseId, 'Course');
    }
    await GamificationHelper.checkAndAwardBadges(studentId);
  } catch { /* points failure should not block lesson completion */ }

  return { completionPercentage };
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
