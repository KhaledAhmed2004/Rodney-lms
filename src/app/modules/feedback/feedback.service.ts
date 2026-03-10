import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EnrollmentHelper } from '../../helpers/enrollmentHelper';
import { IFeedback } from './feedback.interface';
import { Feedback } from './feedback.model';
import { Course } from '../course/course.model';

const createFeedback = async (
  studentId: string,
  courseId: string,
  rating: number,
  review: string,
): Promise<IFeedback> => {
  // Verify enrollment
  const enrollment = await EnrollmentHelper.verifyEnrollment(
    studentId,
    courseId,
  );

  // Check if already reviewed
  const existing = await Feedback.findOne({
    student: studentId,
    course: courseId,
  });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'You have already reviewed this course',
    );
  }

  const feedback = await Feedback.create({
    student: studentId,
    course: courseId,
    enrollment: (enrollment as any)._id,
    rating,
    review,
  });

  // Update course average rating
  await recalculateCourseRating(courseId);

  return feedback;
};

const getPublishedByCourse = async (
  courseId: string,
  query: Record<string, unknown>,
) => {
  const feedbackQuery = new QueryBuilder(
    Feedback.find({ course: courseId, isPublished: true }).populate(
      'student',
      'name profilePicture',
    ),
    query,
  )
    .sort()
    .paginate();

  const data = await feedbackQuery.modelQuery;
  const pagination = await feedbackQuery.getPaginationInfo();
  return { pagination, data };
};

const getAllFeedback = async (query: Record<string, unknown>) => {
  const feedbackQuery = new QueryBuilder(
    Feedback.find()
      .populate('student', 'name email profilePicture')
      .populate('course', 'title slug'),
    query,
  )
    .search(['review'])
    .filter()
    .sort()
    .paginate();

  const data = await feedbackQuery.modelQuery;
  const pagination = await feedbackQuery.getPaginationInfo();
  return { pagination, data };
};

const togglePublish = async (id: string): Promise<IFeedback | null> => {
  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
  }

  const result = await Feedback.findByIdAndUpdate(
    id,
    { isPublished: !feedback.isPublished },
    { new: true },
  );

  // Recalculate course rating (only published reviews count)
  await recalculateCourseRating(feedback.course.toString());

  return result;
};

const respondToFeedback = async (
  id: string,
  adminResponse: string,
): Promise<IFeedback | null> => {
  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
  }

  const result = await Feedback.findByIdAndUpdate(
    id,
    { adminResponse, respondedAt: new Date() },
    { new: true },
  );
  return result;
};

const deleteFeedback = async (id: string): Promise<void> => {
  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
  }

  const courseId = feedback.course.toString();
  await Feedback.findByIdAndDelete(id);
  await recalculateCourseRating(courseId);
};

const getMyReviews = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const feedbackQuery = new QueryBuilder(
    Feedback.find({ student: studentId }).populate(
      'course',
      'title slug thumbnail',
    ),
    query,
  )
    .sort()
    .paginate();

  const data = await feedbackQuery.modelQuery;
  const pagination = await feedbackQuery.getPaginationInfo();
  return { pagination, data };
};

// Helper: recalculate course rating from published feedback
const recalculateCourseRating = async (courseId: string) => {
  const result = await Feedback.aggregate([
    { $match: { course: courseId, isPublished: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { averageRating: 0, ratingsCount: 0 };

  await Course.findByIdAndUpdate(courseId, {
    averageRating: Math.round(stats.averageRating * 10) / 10,
    ratingsCount: stats.ratingsCount,
  });
};

export const FeedbackService = {
  createFeedback,
  getPublishedByCourse,
  getAllFeedback,
  togglePublish,
  respondToFeedback,
  deleteFeedback,
  getMyReviews,
};
