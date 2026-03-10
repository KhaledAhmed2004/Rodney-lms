import { Model, Types } from 'mongoose';

export type NotificationType =
  | 'ADMIN'
  | 'BID'
  | 'BID_ACCEPTED'
  | 'BOOKING'
  | 'TASK'
  | 'SYSTEM'
  | 'DELIVERY_SUBMITTED'
  | 'PAYMENT_PENDING'
  | 'ENROLLMENT'
  | 'QUIZ_AVAILABLE'
  | 'QUIZ_GRADED'
  | 'BADGE_EARNED'
  | 'COMMUNITY_REPLY'
  | 'COURSE_COMPLETED'
  | 'STREAK_MILESTONE';

export type INotification = {
  text: string;
  receiver: Types.ObjectId;
  title?: string;
  isRead: boolean;
  type?: NotificationType;
  referenceId?: Types.ObjectId;
};

export type NotificationModel = Model<INotification>;
