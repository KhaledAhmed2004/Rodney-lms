import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import AggregationBuilder, {
  calculateGrowthDynamic,
} from '../../builder/AggregationBuilder';
import QueryBuilder from '../../builder/QueryBuilder';
import { EnrollmentHelper } from '../../helpers/enrollmentHelper';
import { Feedback } from './feedback.model';
import { Course } from '../course/course.model';

const createFeedback = async (
  studentId: string,
  courseId: string,
  rating: number,
  review: string,
) => {
  // Verify enrollment — allow ACTIVE + COMPLETED (students can review after finishing)
  const enrollment = await EnrollmentHelper.verifyEnrollment(
    studentId,
    courseId,
    ['ACTIVE', 'COMPLETED'],
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
    enrollment: (enrollment as unknown as { _id: Types.ObjectId })._id,
    rating,
    review,
  });

  // Update course average rating
  await recalculateCourseRating(courseId);

  // Re-fetch — .create() bypasses select:false, raw result e __v/updatedAt leak hoy
  return Feedback.findById(feedback._id).select('rating review createdAt');
};

const getByCourse = async (
  courseId: string,
  query: Record<string, unknown>,
) => {
  const feedbackQuery = new QueryBuilder(
    Feedback.find({ course: courseId })
      .select('-enrollment -updatedAt -__v')
      .populate('student', 'name profilePicture'),
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
      .select('-enrollment -updatedAt -__v')
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

const getById = async (id: string) => {
  const feedback = await Feedback.findById(id)
    .select('-enrollment -updatedAt -__v')
    .populate('student', 'name email profilePicture')
    .populate('course', 'title slug');

  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
  }

  return feedback;
};

const respondToFeedback = async (id: string, adminResponse: string) => {
  const feedback = await Feedback.findById(id);
  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found');
  }

  const respondedAt = new Date();
  await Feedback.updateOne({ _id: id }, { adminResponse, respondedAt });

  return { _id: feedback._id, adminResponse, respondedAt };
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
    Feedback.find({ student: studentId })
      .select('-student -enrollment -updatedAt -__v')
      .populate('course', 'title slug thumbnail'),
    query,
  )
    .sort()
    .paginate();

  const data = await feedbackQuery.modelQuery;
  const pagination = await feedbackQuery.getPaginationInfo();
  return { pagination, data };
};

const getSummary = async () => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    reviewGrowth,
    currentAvgResult,
    previousAvgResult,
    pendingCount,
    distributionResult,
  ] = await Promise.all([
    // 1. Total reviews + growth (reuses dashboard pattern)
    calculateGrowthDynamic(Feedback),

    // 2. Current overall average rating
    new AggregationBuilder(Feedback)
      .group({ _id: null, avg: { $avg: '$rating' } })
      .execute(),

    // 3. Previous month overall average (for delta comparison)
    new AggregationBuilder(Feedback)
      .match({ createdAt: { $lt: startOfThisMonth } })
      .group({ _id: null, avg: { $avg: '$rating' } })
      .execute(),

    // 4. Pending responses (no admin reply yet)
    Feedback.countDocuments({ adminResponse: null }),

    // 5. Rating distribution (1-5 stars)
    new AggregationBuilder(Feedback)
      .group({ _id: '$rating', count: { $sum: 1 } })
      .sort({ _id: -1 })
      .execute(),
  ]);

  const currentAvg = currentAvgResult[0]?.avg ?? 0;
  const hasPreviousData = previousAvgResult.length > 0;
  const previousAvg = hasPreviousData ? previousAvgResult[0].avg : 0;
  const ratingDelta = hasPreviousData
    ? Math.round((currentAvg - previousAvg) * 10) / 10
    : 0;

  return {
    comparisonPeriod: 'month',
    totalReviews: {
      value: reviewGrowth.total,
      growth: reviewGrowth.growth,
      growthType: reviewGrowth.growthType,
    },
    averageRating: {
      value: Math.round(currentAvg * 10) / 10,
      growth: Math.abs(ratingDelta),
      growthType:
        ratingDelta > 0
          ? 'increase'
          : ratingDelta < 0
            ? 'decrease'
            : ('no_change' as const),
    },
    pendingResponses: pendingCount,
    ratingDistribution: [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      count:
        distributionResult.find((d: { _id: number }) => d._id === r)?.count ??
        0,
    })),
  };
};

// Helper: recalculate course average rating from all feedback
const recalculateCourseRating = async (courseId: string) => {
  const result = await Feedback.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
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
  getByCourse,
  getAllFeedback,
  getById,
  getSummary,
  respondToFeedback,
  deleteFeedback,
  getMyReviews,
};
