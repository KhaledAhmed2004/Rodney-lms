import { Model, Types } from 'mongoose';

export type ISentNotification = {
  title: string;
  text: string;
  audience: 'all' | 'course';
  course?: Types.ObjectId;
  recipientCount: number;
  sentBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SentNotificationModel = Model<ISentNotification>;
