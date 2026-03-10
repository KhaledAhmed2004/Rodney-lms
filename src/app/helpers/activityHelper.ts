import { DailyActivity } from '../modules/activity/activity.model';
import { User } from '../modules/user/user.model';

const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const trackActivity = async (
  studentId: string,
  type: 'lesson' | 'quiz',
  points: number = 0,
) => {
  const today = getToday();

  const updateFields: Record<string, number> = {};
  if (type === 'lesson') updateFields.lessonsCompleted = 1;
  if (type === 'quiz') updateFields.quizzesTaken = 1;
  if (points > 0) updateFields.pointsEarned = points;

  // Upsert daily activity
  await DailyActivity.findOneAndUpdate(
    { student: studentId, date: today },
    {
      $inc: updateFields,
      $set: { isActive: true },
      $setOnInsert: { student: studentId, date: today },
    },
    { upsert: true, new: true },
  );

  // Update streak
  await updateStreak(studentId, today);
};

const updateStreak = async (studentId: string, today: Date) => {
  const user = await User.findById(studentId).select('streak');
  if (!user) return;

  const streak = (user as any).streak || {
    current: 0,
    longest: 0,
    lastActiveDate: null,
  };
  const lastActive = streak.lastActiveDate
    ? new Date(streak.lastActiveDate)
    : null;

  let newCurrent = streak.current;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      // Same day, no change
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      newCurrent = streak.current + 1;
    } else {
      // Streak broken
      newCurrent = 1;
    }
  } else {
    // First activity ever
    newCurrent = 1;
  }

  const newLongest = Math.max(streak.longest, newCurrent);

  await User.findByIdAndUpdate(studentId, {
    $set: {
      'streak.current': newCurrent,
      'streak.longest': newLongest,
      'streak.lastActiveDate': today,
    },
  });
};

export const ActivityHelper = { trackActivity, updateStreak };
