import { Model, Types } from 'mongoose';

export type IFeedback = {
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  rating: number;
  review: string;
  isPublished: boolean;
  adminResponse?: string;
  respondedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type FeedbackModel = Model<IFeedback>;
