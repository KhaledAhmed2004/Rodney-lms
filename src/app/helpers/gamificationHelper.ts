import {
  POINTS_REASON,
  BADGE_CRITERIA,
} from '../modules/gamification/gamification.interface';
import {
  PointsLedger,
  Badge,
  StudentBadge,
} from '../modules/gamification/gamification.model';
import { User } from '../modules/user/user.model';
import { Enrollment } from '../modules/enrollment/enrollment.model';
import { QuizAttempt } from '../modules/quiz/quiz.model';
import { DailyActivity } from '../modules/activity/activity.model';

const POINTS_MAP: Record<string, number> = {
  [POINTS_REASON.LESSON_COMPLETE]: 10,
  [POINTS_REASON.QUIZ_PASS]: 25,
  [POINTS_REASON.QUIZ_PERFECT]: 50,
  [POINTS_REASON.COURSE_COMPLETE]: 100,
  [POINTS_REASON.FIRST_ENROLLMENT]: 5,
  [POINTS_REASON.STREAK_BONUS]: 15,
  [POINTS_REASON.COMMUNITY_POST]: 5,
};

const awardPoints = async (
  studentId: string,
  reason: POINTS_REASON,
  referenceId?: string,
  referenceType?: string,
  customPoints?: number,
) => {
  const points = customPoints || POINTS_MAP[reason] || 0;
  if (points === 0) return;

  // Duplicate prevention — skip if already awarded for same reason + reference
  if (referenceId) {
    const existing = await PointsLedger.findOne({
      student: studentId,
      reason,
      referenceId,
    });
    if (existing) return;
  }

  const descriptions: Record<string, string> = {
    [POINTS_REASON.LESSON_COMPLETE]: 'Completed a lesson',
    [POINTS_REASON.QUIZ_PASS]: 'Passed a quiz',
    [POINTS_REASON.QUIZ_PERFECT]: 'Perfect score on quiz',
    [POINTS_REASON.COURSE_COMPLETE]: 'Completed a course',
    [POINTS_REASON.FIRST_ENROLLMENT]: 'Enrolled in first course',
    [POINTS_REASON.STREAK_BONUS]: 'Streak milestone bonus',
    [POINTS_REASON.COMMUNITY_POST]: 'Posted in community',
  };

  await PointsLedger.create({
    student: studentId,
    points,
    reason,
    referenceId,
    referenceType,
    description: descriptions[reason] || reason,
  });

  await User.findByIdAndUpdate(studentId, { $inc: { totalPoints: points } });

  // Update daily activity pointsEarned
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await DailyActivity.findOneAndUpdate(
    { student: studentId, date: today },
    { $inc: { pointsEarned: points }, $set: { isActive: true } },
    { upsert: true },
  );
};

const checkAndAwardBadges = async (studentId: string) => {
  const activeBadges = await Badge.find({ isActive: true });

  for (const badge of activeBadges) {
    // Skip if already earned
    const alreadyEarned = await StudentBadge.findOne({
      student: studentId,
      badge: badge._id,
    });
    if (alreadyEarned) continue;

    let earned = false;
    const { type, threshold } = badge.criteria;

    switch (type) {
      case BADGE_CRITERIA.POINTS_THRESHOLD: {
        const totalResult = await PointsLedger.aggregate([
          { $match: { student: studentId } },
          { $group: { _id: null, total: { $sum: '$points' } } },
        ]);
        const total = totalResult[0]?.total || 0;
        earned = total >= threshold;
        break;
      }
      case BADGE_CRITERIA.COURSES_COMPLETED: {
        const count = await Enrollment.countDocuments({
          student: studentId,
          status: 'COMPLETED',
        });
        earned = count >= threshold;
        break;
      }
      case BADGE_CRITERIA.QUIZZES_PASSED: {
        const count = await QuizAttempt.countDocuments({
          student: studentId,
          passed: true,
          status: 'COMPLETED',
        });
        earned = count >= threshold;
        break;
      }
      case BADGE_CRITERIA.PERFECT_QUIZ: {
        const count = await QuizAttempt.countDocuments({
          student: studentId,
          percentage: 100,
          status: 'COMPLETED',
        });
        earned = count >= threshold;
        break;
      }
      case BADGE_CRITERIA.STREAK_DAYS: {
        const user = await User.findById(studentId).select('streak');
        const longest = (user as any)?.streak?.longest || 0;
        earned = longest >= threshold;
        break;
      }
      default:
        break;
    }

    if (earned) {
      await StudentBadge.create({
        student: studentId,
        badge: badge._id,
      });
    }
  }
};

export const GamificationHelper = { awardPoints, checkAndAwardBadges };
