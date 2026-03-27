import { model, Schema } from 'mongoose';
import {
  ISentNotification,
  SentNotificationModel,
} from './sentNotification.interface';

const sentNotificationSchema = new Schema<
  ISentNotification,
  SentNotificationModel
>(
  {
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true },
    audience: {
      type: String,
      enum: ['all', 'course'],
      required: true,
    },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    recipientCount: { type: Number, required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

sentNotificationSchema.index({ sentBy: 1, createdAt: -1 });

export const SentNotification = model<
  ISentNotification,
  SentNotificationModel
>('SentNotification', sentNotificationSchema);
