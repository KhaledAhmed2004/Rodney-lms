import { model, Schema } from 'mongoose';
import {
  IGrade,
  GradeModel,
  GRADE_STATUS,
  ASSESSMENT_TYPE,
} from './gradebook.interface';

// ==================== GRADE SCHEMA ====================
const gradeSchema = new Schema<IGrade, GradeModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    assessmentType: {
      type: String,
      enum: Object.values(ASSESSMENT_TYPE),
      required: true,
    },
    assessmentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    assessmentTitle: {
      type: String,
      required: true,
    },
    score: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: Object.values(GRADE_STATUS),
      default: GRADE_STATUS.PENDING,
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: { type: Date },
    feedback: { type: String },
  },
  { timestamps: true },
);

gradeSchema.index({ student: 1, course: 1 });
gradeSchema.index({ enrollment: 1 });
gradeSchema.index({ assessmentType: 1, assessmentId: 1 });
gradeSchema.index({ assessmentType: 1, status: 1, createdAt: 1 });

export const Grade = model<IGrade, GradeModel>('Grade', gradeSchema);

