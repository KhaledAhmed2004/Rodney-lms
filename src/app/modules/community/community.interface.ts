import { Model, Types } from 'mongoose';

export enum POST_STATUS {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}

export enum REPLY_STATUS {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}

export type IPost = {
  author: Types.ObjectId;
  content: string;
  image?: string;
  likesCount: number;
  repliesCount: number;
  status: POST_STATUS;
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
  status: REPLY_STATUS;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PostReplyModel = Model<IPostReply>;
