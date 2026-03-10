import { Model, Types } from 'mongoose';

export enum POINTS_REASON {
  LESSON_COMPLETE = 'LESSON_COMPLETE',
  QUIZ_PASS = 'QUIZ_PASS',
  QUIZ_PERFECT = 'QUIZ_PERFECT',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  FIRST_ENROLLMENT = 'FIRST_ENROLLMENT',
  STREAK_BONUS = 'STREAK_BONUS',
  COMMUNITY_POST = 'COMMUNITY_POST',
  ADMIN_ADJUST = 'ADMIN_ADJUST',
}

export enum BADGE_CRITERIA {
  POINTS_THRESHOLD = 'POINTS_THRESHOLD',
  COURSES_COMPLETED = 'COURSES_COMPLETED',
  QUIZZES_PASSED = 'QUIZZES_PASSED',
  PERFECT_QUIZ = 'PERFECT_QUIZ',
  STREAK_DAYS = 'STREAK_DAYS',
  CUSTOM = 'CUSTOM',
}

export type IPointsLedger = {
  student: Types.ObjectId;
  points: number;
  reason: POINTS_REASON;
  referenceId?: Types.ObjectId;
  referenceType?: string;
  description: string;
  createdAt?: Date;
};

export type PointsLedgerModel = Model<IPointsLedger>;

export type IBadgeCriteria = {
  type: BADGE_CRITERIA;
  threshold: number;
};

export type IBadge = {
  name: string;
  description: string;
  icon: string;
  criteria: IBadgeCriteria;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BadgeModel = Model<IBadge>;

export type IStudentBadge = {
  student: Types.ObjectId;
  badge: Types.ObjectId;
  earnedAt: Date;
};

export type StudentBadgeModel = Model<IStudentBadge>;
