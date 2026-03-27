import { Model } from 'mongoose';

export type ISentNotification = {
  title: string;
  text: string;
  audience: 'all' | 'course';
  courseTitle?: string;
  recipientCount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SentNotificationModel = Model<ISentNotification>;
