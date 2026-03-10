import { model, Schema } from 'mongoose';
import {
  IPost,
  PostModel,
  IPostLike,
  PostLikeModel,
  IPostReply,
  PostReplyModel,
  POST_STATUS,
  REPLY_STATUS,
} from './community.interface';

// ==================== POST SCHEMA ====================
const postSchema = new Schema<IPost, PostModel>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    image: { type: String },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(POST_STATUS),
      default: POST_STATUS.ACTIVE,
    },
  },
  { timestamps: true },
);

postSchema.index({ author: 1 });
postSchema.index({ status: 1, createdAt: -1 });

export const Post = model<IPost, PostModel>('Post', postSchema);

// ==================== POST LIKE SCHEMA ====================
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

// ==================== POST REPLY SCHEMA ====================
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
    status: {
      type: String,
      enum: Object.values(REPLY_STATUS),
      default: REPLY_STATUS.ACTIVE,
    },
  },
  { timestamps: true },
);

postReplySchema.index({ post: 1, createdAt: 1 });
postReplySchema.index({ author: 1 });

export const PostReply = model<IPostReply, PostReplyModel>(
  'PostReply',
  postReplySchema,
);
