import { BADGE_CRITERIA } from '../enums/gamification';
import { Badge } from '../app/modules/gamification/gamification.model';
import { logger } from '../shared/logger';

type DefaultBadge = {
  name: string;
  description: string;
  icon: string;
  criteria: { type: BADGE_CRITERIA; threshold: number };
};

const DEFAULT_BADGES: DefaultBadge[] = [
  // ==================== POINTS_THRESHOLD ====================
  {
    name: 'Rising Star',
    description: 'Earn 100 points to prove you are on the rise',
    icon: 'rising-star',
    criteria: { type: BADGE_CRITERIA.POINTS_THRESHOLD, threshold: 100 },
  },
  {
    name: 'Point Collector',
    description: 'Earn 500 points — you are building serious momentum',
    icon: 'point-collector',
    criteria: { type: BADGE_CRITERIA.POINTS_THRESHOLD, threshold: 500 },
  },
  {
    name: 'Point Master',
    description: 'Earn 1000 points — mastery in the making',
    icon: 'point-master',
    criteria: { type: BADGE_CRITERIA.POINTS_THRESHOLD, threshold: 1000 },
  },
  {
    name: 'Point Legend',
    description: 'Earn 5000 points — legendary dedication',
    icon: 'point-legend',
    criteria: { type: BADGE_CRITERIA.POINTS_THRESHOLD, threshold: 5000 },
  },

  // ==================== COURSES_COMPLETED ====================
  {
    name: 'First Steps',
    description: 'Complete your first course',
    icon: 'first-steps',
    criteria: { type: BADGE_CRITERIA.COURSES_COMPLETED, threshold: 1 },
  },
  {
    name: 'Course Explorer',
    description: 'Complete 3 courses — exploring new horizons',
    icon: 'course-explorer',
    criteria: { type: BADGE_CRITERIA.COURSES_COMPLETED, threshold: 3 },
  },
  {
    name: 'Course Master',
    description: 'Complete 5 courses — a true master of learning',
    icon: 'course-master',
    criteria: { type: BADGE_CRITERIA.COURSES_COMPLETED, threshold: 5 },
  },
  {
    name: 'Course Legend',
    description: 'Complete 10 courses — unstoppable learner',
    icon: 'course-legend',
    criteria: { type: BADGE_CRITERIA.COURSES_COMPLETED, threshold: 10 },
  },

  // ==================== QUIZZES_PASSED ====================
  {
    name: 'Quiz Starter',
    description: 'Pass your first quiz',
    icon: 'quiz-starter',
    criteria: { type: BADGE_CRITERIA.QUIZZES_PASSED, threshold: 1 },
  },
  {
    name: 'Quiz Master',
    description: 'Pass 10 quizzes — sharp mind',
    icon: 'quiz-master',
    criteria: { type: BADGE_CRITERIA.QUIZZES_PASSED, threshold: 10 },
  },
  {
    name: 'Quiz Champion',
    description: 'Pass 25 quizzes — champion level knowledge',
    icon: 'quiz-champion',
    criteria: { type: BADGE_CRITERIA.QUIZZES_PASSED, threshold: 25 },
  },

  // ==================== PERFECT_QUIZ ====================
  {
    name: 'Perfect Score',
    description: 'Get 100% on a quiz — flawless',
    icon: 'perfect-score',
    criteria: { type: BADGE_CRITERIA.PERFECT_QUIZ, threshold: 1 },
  },
  {
    name: 'Perfectionist',
    description: 'Get 100% on 5 quizzes — precision is your middle name',
    icon: 'perfectionist',
    criteria: { type: BADGE_CRITERIA.PERFECT_QUIZ, threshold: 5 },
  },

  // ==================== STREAK_DAYS ====================
  {
    name: 'Consistent Learner',
    description: '7-day learning streak — building the habit',
    icon: 'consistent-learner',
    criteria: { type: BADGE_CRITERIA.STREAK_DAYS, threshold: 7 },
  },
  {
    name: 'Streak Champion',
    description: '30-day streak — dedication at its finest',
    icon: 'streak-champion',
    criteria: { type: BADGE_CRITERIA.STREAK_DAYS, threshold: 30 },
  },
  {
    name: 'Streak Legend',
    description: '100-day streak — unstoppable force',
    icon: 'streak-legend',
    criteria: { type: BADGE_CRITERIA.STREAK_DAYS, threshold: 100 },
  },

  // ==================== CUSTOM (manually awarded) ====================
  {
    name: 'Early Adopter',
    description: 'One of the first learners on the platform',
    icon: 'early-adopter',
    criteria: { type: BADGE_CRITERIA.CUSTOM, threshold: 0 },
  },
];

export const seedBadges = async () => {
  const existingBadges = await Badge.find({}, 'name').lean();
  const existingNames = new Set(existingBadges.map(b => b.name));

  const missingBadges = DEFAULT_BADGES.filter(b => !existingNames.has(b.name));

  if (missingBadges.length > 0) {
    await Badge.insertMany(missingBadges);
    logger.info(
      `🏅 ${missingBadges.length} default badge(s) seeded: ${missingBadges.map(b => b.name).join(', ')}`,
    );
  }
};
