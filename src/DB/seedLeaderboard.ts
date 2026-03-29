import { User } from '../app/modules/user/user.model';
import {
  PointsLedger,
  Badge,
  StudentBadge,
} from '../app/modules/gamification/gamification.model';
import { USER_ROLES } from '../enums/user';
import { POINTS_REASON } from '../app/modules/gamification/gamification.interface';
import { logger } from '../shared/logger';

const DEMO_STUDENTS = [
  { name: 'Rahim Ahmed', email: 'rahim@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=rahim' },
  { name: 'Karim Hossain', email: 'karim@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=karim' },
  { name: 'Fatima Begum', email: 'fatima@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=fatima' },
  { name: 'Ayesha Khan', email: 'ayesha@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=ayesha' },
  { name: 'Nusrat Jahan', email: 'nusrat@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=nusrat' },
  { name: 'Tanvir Islam', email: 'tanvir@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=tanvir' },
  { name: 'Sumaiya Akter', email: 'sumaiya@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=sumaiya' },
  { name: 'Mahfuz Rahman', email: 'mahfuz@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=mahfuz' },
  { name: 'Riya Das', email: 'riya@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=riya' },
  { name: 'Imran Chowdhury', email: 'imran@demo.com', profilePicture: 'https://i.pravatar.cc/150?u=imran' },
];

// Points distribution — top students get more, creates realistic leaderboard spread
const POINTS_CONFIGS = [
  { lessons: 25, quizzes: 8, courses: 3, streaks: 10, posts: 5 },  // ~1250 pts
  { lessons: 20, quizzes: 6, courses: 2, streaks: 8, posts: 4 },   // ~950 pts
  { lessons: 18, quizzes: 5, courses: 2, streaks: 6, posts: 3 },   // ~800 pts
  { lessons: 15, quizzes: 4, courses: 1, streaks: 5, posts: 2 },   // ~620 pts
  { lessons: 12, quizzes: 3, courses: 1, streaks: 4, posts: 2 },   // ~490 pts
  { lessons: 10, quizzes: 2, courses: 1, streaks: 3, posts: 1 },   // ~380 pts
  { lessons: 8, quizzes: 2, courses: 0, streaks: 2, posts: 1 },    // ~270 pts
  { lessons: 5, quizzes: 1, courses: 0, streaks: 1, posts: 0 },    // ~140 pts
  { lessons: 3, quizzes: 1, courses: 0, streaks: 0, posts: 0 },    // ~80 pts
  { lessons: 1, quizzes: 0, courses: 0, streaks: 0, posts: 0 },    // ~10 pts
];

// Points per action (matches gamificationHelper)
const POINTS_MAP = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 25,
  QUIZ_PERFECT: 50,
  COURSE_COMPLETE: 100,
  FIRST_ENROLLMENT: 5,
  STREAK_BONUS: 15,
  COMMUNITY_POST: 10,
};

export const seedLeaderboard = async () => {
  // Skip if demo students already exist
  const existing = await User.findOne({ email: 'rahim@demo.com' });
  if (existing) return;

  logger.info('🏆 Seeding leaderboard demo data...');

  const badges = await Badge.find({ isActive: true }).lean();

  for (let i = 0; i < DEMO_STUDENTS.length; i++) {
    const student = DEMO_STUDENTS[i];
    const config = POINTS_CONFIGS[i];

    // Create student user
    const user = await User.create({
      ...student,
      role: USER_ROLES.STUDENT,
      password: 'DemoPass123!',
      verified: true,
      totalPoints: 0, // will be calculated
    });

    const ledgerEntries: Array<{
      student: typeof user._id;
      points: number;
      reason: POINTS_REASON;
      description: string;
    }> = [];

    // Lesson complete points
    for (let j = 0; j < config.lessons; j++) {
      ledgerEntries.push({
        student: user._id,
        points: POINTS_MAP.LESSON_COMPLETE,
        reason: POINTS_REASON.LESSON_COMPLETE,
        description: `Completed lesson ${j + 1}`,
      });
    }

    // Quiz pass points
    for (let j = 0; j < config.quizzes; j++) {
      ledgerEntries.push({
        student: user._id,
        points: POINTS_MAP.QUIZ_PASS,
        reason: POINTS_REASON.QUIZ_PASS,
        description: `Passed quiz ${j + 1}`,
      });
    }

    // Course complete points
    for (let j = 0; j < config.courses; j++) {
      ledgerEntries.push({
        student: user._id,
        points: POINTS_MAP.COURSE_COMPLETE,
        reason: POINTS_REASON.COURSE_COMPLETE,
        description: `Completed course ${j + 1}`,
      });
    }

    // Streak bonus
    for (let j = 0; j < config.streaks; j++) {
      ledgerEntries.push({
        student: user._id,
        points: POINTS_MAP.STREAK_BONUS,
        reason: POINTS_REASON.STREAK_BONUS,
        description: `Streak bonus day ${j + 1}`,
      });
    }

    // Community posts
    for (let j = 0; j < config.posts; j++) {
      ledgerEntries.push({
        student: user._id,
        points: POINTS_MAP.COMMUNITY_POST,
        reason: POINTS_REASON.COMMUNITY_POST,
        description: `Community post ${j + 1}`,
      });
    }

    // Bulk insert points
    if (ledgerEntries.length > 0) {
      await PointsLedger.insertMany(ledgerEntries);
    }

    // Calculate total
    const totalPoints = ledgerEntries.reduce((sum, e) => sum + e.points, 0);
    await User.findByIdAndUpdate(user._id, { totalPoints });

    // Award badges based on points
    for (const badge of badges) {
      let earned = false;

      if (badge.criteria.type === 'POINTS_THRESHOLD') {
        earned = totalPoints >= badge.criteria.threshold;
      } else if (badge.criteria.type === 'COURSES_COMPLETED') {
        earned = config.courses >= badge.criteria.threshold;
      } else if (badge.criteria.type === 'QUIZZES_PASSED') {
        earned = config.quizzes >= badge.criteria.threshold;
      }

      if (earned) {
        await StudentBadge.create({
          student: user._id,
          badge: badge._id,
        }).catch(() => {}); // skip duplicates
      }
    }
  }

  logger.info('✅ Leaderboard demo data seeded — 10 students with realistic points + badges');
};
