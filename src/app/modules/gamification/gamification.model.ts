import { model, Schema } from 'mongoose';
import {
  IPointsLedger,
  PointsLedgerModel,
  IBadge,
  BadgeModel,
  IStudentBadge,
  StudentBadgeModel,
  POINTS_REASON,
  BADGE_CRITERIA,
} from './gamification.interface';

const pointsLedgerSchema = new Schema<IPointsLedger, PointsLedgerModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    points: { type: Number, required: true },
    reason: {
      type: String,
      enum: Object.values(POINTS_REASON),
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    referenceType: { type: String },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

pointsLedgerSchema.index({ student: 1, createdAt: -1 });
pointsLedgerSchema.index({ reason: 1 });

export const PointsLedger = model<IPointsLedger, PointsLedgerModel>(
  'PointsLedger',
  pointsLedgerSchema,
);

const BadgeCriteriaSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(BADGE_CRITERIA),
      required: true,
    },
    threshold: { type: Number, required: true },
  },
  { _id: false },
);

const badgeSchema = new Schema<IBadge, BadgeModel>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    criteria: { type: BadgeCriteriaSchema, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

badgeSchema.index({ isActive: 1 });

export const Badge = model<IBadge, BadgeModel>('Badge', badgeSchema);

// ==================== STUDENT BADGE ====================
const studentBadgeSchema = new Schema<IStudentBadge, StudentBadgeModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    badge: {
      type: Schema.Types.ObjectId,
      ref: 'Badge',
      required: true,
    },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

studentBadgeSchema.index({ student: 1, badge: 1 }, { unique: true });
studentBadgeSchema.index({ badge: 1 });

export const StudentBadge = model<IStudentBadge, StudentBadgeModel>(
  'StudentBadge',
  studentBadgeSchema,
);
