import { Model, Types } from 'mongoose';

export type IPost = {
  author: Types.ObjectId;
  title: string;
  course?: Types.ObjectId;
  content: string;
  image?: string;
  likesCount: number;
  repliesCount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PostModel = Model<IPost>;

export type IPostLike = {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
};

export type PostLikeModel = Model<IPostLike>;

export type IPostReply = {
  post: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  parentReply?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PostReplyModel = Model<IPostReply>;
