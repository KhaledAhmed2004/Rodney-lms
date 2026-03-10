import { Model, Types } from 'mongoose';

export type IDailyActivity = {
  student: Types.ObjectId;
  date: Date;
  lessonsCompleted: number;
  quizzesTaken: number;
  pointsEarned: number;
  timeSpent: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type DailyActivityModel = Model<IDailyActivity>;
