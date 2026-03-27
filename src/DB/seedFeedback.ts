import { Types } from 'mongoose';
import config from '../config';
import { Feedback } from '../app/modules/feedback/feedback.model';
import { Enrollment } from '../app/modules/enrollment/enrollment.model';
import { Course } from '../app/modules/course/course.model';
import { logger } from '../shared/logger';

const DEMO_REVIEWS = [
  {
    rating: 5,
    review:
      'Excellent course! The projects were very practical and the instructor explained complex concepts simply. Highly recommend for beginners.',
    adminResponse: null as string | null,
    respondedAt: null as Date | null,
  },
  {
    rating: 4,
    review:
      'Great course overall. Loved the hands-on sections. Would appreciate more real-world project examples.',
    adminResponse:
      'Thank you! We are adding 3 new project modules next month. Stay tuned!',
    respondedAt: new Date('2026-03-24T14:30:00Z'),
  },
  {
    rating: 2,
    review:
      'Course content is outdated. Some lessons use deprecated methods. Needs a major update.',
    adminResponse: null as string | null,
    respondedAt: null as Date | null,
  },
  {
    rating: 1,
    review:
      'Very disappointed. The quizzes do not match the lesson content at all. Felt like I wasted my time.',
    adminResponse:
      'We are sorry to hear that. We have flagged this with the content team and will review all quizzes. Thank you for the feedback.',
    respondedAt: new Date('2026-03-19T10:00:00Z'),
  },
  {
    rating: 3,
    review:
      'Decent course. Good for intermediate learners but the pace is too fast for some sections. Closures chapter needs better examples.',
    adminResponse: null as string | null,
    respondedAt: null as Date | null,
  },
];

export const seedFeedback = async () => {
  // Only seed in development
  if (config.node_env !== 'development') return;

  // Skip if feedback already exists
  const existingCount = await Feedback.countDocuments();
  if (existingCount > 0) return;

  // Find enrollments with student + course (need real IDs)
  const enrollments = await Enrollment.find({
    status: { $in: ['ACTIVE', 'COMPLETED'] },
  })
    .limit(5)
    .lean();

  if (enrollments.length === 0) {
    logger.warn(
      '⚠️ No enrollments found — skipping feedback seed (enroll students first)',
    );
    return;
  }

  // Create feedback for each enrollment (up to 5)
  const feedbackData = enrollments.map((enrollment, i) => {
    const demo = DEMO_REVIEWS[i % DEMO_REVIEWS.length];
    return {
      student: enrollment.student,
      course: enrollment.course,
      enrollment: enrollment._id,
      rating: demo.rating,
      review: demo.review,
      ...(demo.adminResponse && {
        adminResponse: demo.adminResponse,
        respondedAt: demo.respondedAt,
      }),
    };
  });

  await Feedback.insertMany(feedbackData);

  // Recalculate course ratings for affected courses
  const courseIds = [
    ...new Set(feedbackData.map(f => f.course.toString())),
  ];
  for (const courseId of courseIds) {
    const stats = await Feedback.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          ratingsCount: { $sum: 1 },
        },
      },
    ]);
    if (stats[0]) {
      await Course.findByIdAndUpdate(courseId, {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        ratingsCount: stats[0].ratingsCount,
      });
    }
  }

  logger.info(
    `📝 ${feedbackData.length} demo feedback entries seeded (${courseIds.length} course ratings updated)`,
  );
};
