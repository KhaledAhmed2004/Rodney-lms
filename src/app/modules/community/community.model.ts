import { model, Schema } from 'mongoose';
import {
  IPost,
  PostModel,
  IPostLike,
  PostLikeModel,
  IPostReply,
  PostReplyModel,
} from './community.interface';

const postSchema = new Schema<IPost, PostModel>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    image: { type: String },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ course: 1 });

export const Post = model<IPost, PostModel>('Post', postSchema);

const postLikeSchema = new Schema<IPostLike, PostLikeModel>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

postLikeSchema.index({ post: 1, user: 1 }, { unique: true });

export const PostLike = model<IPostLike, PostLikeModel>(
  'PostLike',
  postLikeSchema,
);

const postReplySchema = new Schema<IPostReply, PostReplyModel>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    parentReply: {
      type: Schema.Types.ObjectId,
      ref: 'PostReply',
      default: null,
    },
  },
  { timestamps: true },
);

postReplySchema.index({ post: 1, createdAt: 1 });
postReplySchema.index({ author: 1 });
postReplySchema.index({ parentReply: 1 });

export const PostReply = model<IPostReply, PostReplyModel>(
  'PostReply',
  postReplySchema,
);
