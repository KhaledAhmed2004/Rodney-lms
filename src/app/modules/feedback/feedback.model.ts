import { model, Schema } from 'mongoose';
import { IFeedback, FeedbackModel } from './feedback.interface';

const feedbackSchema = new Schema<IFeedback, FeedbackModel>(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    adminResponse: { type: String },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

feedbackSchema.index({ student: 1, course: 1 }, { unique: true });
feedbackSchema.index({ course: 1 });
feedbackSchema.index({ rating: 1 });

export const Feedback = model<IFeedback, FeedbackModel>(
  'Feedback',
  feedbackSchema,
);
