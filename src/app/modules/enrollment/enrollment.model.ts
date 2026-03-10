import { model, Schema } from 'mongoose';
import {
  IEnrollment,
  EnrollmentModel,
  ENROLLMENT_STATUS,
} from './enrollment.interface';

const enrollmentProgressSchema = new Schema(
  {
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    lastAccessedLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    lastAccessedAt: { type: Date },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);

const enrollmentSchema = new Schema<IEnrollment, EnrollmentModel>(
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
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUS),
      default: ENROLLMENT_STATUS.ACTIVE,
    },
    progress: {
      type: enrollmentProgressSchema,
      default: {
        completedLessons: [],
        completionPercentage: 0,
      },
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ student: 1, status: 1 });

// Statics
enrollmentSchema.statics.isExistById = async function (id: string) {
  return await this.findById(id);
};

export const Enrollment = model<IEnrollment, EnrollmentModel>(
  'Enrollment',
  enrollmentSchema,
);
