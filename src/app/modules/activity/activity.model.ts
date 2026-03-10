import { model, Schema } from 'mongoose';
import { IDailyActivity, DailyActivityModel } from './activity.interface';

const dailyActivitySchema = new Schema<IDailyActivity, DailyActivityModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    lessonsCompleted: {
      type: Number,
      default: 0,
    },
    quizzesTaken: {
      type: Number,
      default: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Indexes
dailyActivitySchema.index({ student: 1, date: 1 }, { unique: true });
dailyActivitySchema.index({ student: 1, date: -1 });

export const DailyActivity = model<IDailyActivity, DailyActivityModel>(
  'DailyActivity',
  dailyActivitySchema,
);
