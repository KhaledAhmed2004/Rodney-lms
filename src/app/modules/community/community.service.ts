import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { deleteFile } from '../../middlewares/fileHandler';
import { IPost, IPostReply } from './community.interface';
import { Course } from '../course/course.model';
import { User } from '../user/user.model';
import { USER_STATUS } from '../../../enums/user';
import { Post, PostLike, PostReply } from './community.model';
import { GamificationHelper } from '../../helpers/gamificationHelper';
import { POINTS_REASON } from '../gamification/gamification.interface';

const validateCourseId = async (courseId: string) => {
  const course = await Course.findById(courseId).select('_id');
  if (!course) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Course not found');
  }
};

const createPost = async (
  authorId: string,
  payload: { title: string; content: string; courseId?: string; image?: string },
): Promise<IPost> => {
  if (payload.courseId) await validateCourseId(payload.courseId);

  const post = await Post.create({
    author: authorId,
    title: payload.title,
    course: payload.courseId || undefined,
    content: payload.content,
    image: payload.image,
  });

  const result: any = (
    await Post.findById(post._id)
      .select('_id title content course image createdAt')
      .populate('course', 'title')
  )!.toObject();

  // Gamification: award points for community post
  try {
    await GamificationHelper.awardPoints(authorId, POINTS_REASON.COMMUNITY_POST, post._id.toString(), 'Post');
    await GamificationHelper.checkAndAwardBadges(authorId);
  } catch { /* points failure should not block post creation */ }

  return { ...result, course: result.course?.title || null };
};

const getAllPosts = async (query: Record<string, unknown>, userId?: string) => {
  const baseFilter: Record<string, unknown> = {};
  if (query.courseId) {
    baseFilter.course = query.courseId;
  }

  // Pre-filter: exclude posts by deleted users for accurate pagination
  const deletedUserIds = await User.find({ status: USER_STATUS.DELETE }).distinct('_id');
  if (deletedUserIds.length > 0) {
    baseFilter.author = { $nin: deletedUserIds };
  }

  const postQuery = new QueryBuilder(
    Post.find(baseFilter)
      .select('author title course content image likesCount repliesCount createdAt')
      .populate('author', 'name profilePicture role')
      .populate('course', 'title'),
    query,
  )
    .search(['title', 'content'])
    .sort()
    .paginate();

  const data = await postQuery.modelQuery;
  const pagination = await postQuery.getPaginationInfo();

  // Add isLiked flag for current user + flatten course to title string
  let postsWithLikeStatus;
  if (userId) {
    const postIds = data.map((p: any) => p._id);
    const userLikes = await PostLike.find({
      post: { $in: postIds },
      user: userId,
    });
    const likedPostIds = new Set(userLikes.map(l => l.post.toString()));

    postsWithLikeStatus = data.map((p: any) => ({
      ...p.toObject(),
      course: p.course?.title || null,
      isLiked: likedPostIds.has(p._id.toString()),
    }));
  } else {
    postsWithLikeStatus = data.map((p: any) => ({
      ...p.toObject(),
      course: p.course?.title || null,
    }));
  }

  return { pagination, data: postsWithLikeStatus };
};

const REPLY_LIMIT = 200;

const getPostById = async (id: string, userId?: string) => {
  const post = await Post.findById(id)
    .select('author title course content image likesCount repliesCount createdAt')
    .populate({
      path: 'author',
      select: 'name profilePicture role',
      match: { status: { $ne: 'DELETE' } },
    })
    .populate('course', 'title');
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  const allReplies = await PostReply.find({ post: id })
    .select('author content parentReply createdAt')
    .populate({
      path: 'author',
      select: 'name profilePicture role',
      match: { status: { $ne: 'DELETE' } },
    })
    .sort({ createdAt: 1 })
    .limit(REPLY_LIMIT)
    .lean();

  // Build nested reply structure (1-level)
  const topLevelReplies: any[] = [];
  const childrenMap = new Map<string, any[]>();

  for (const reply of allReplies) {
    if (reply.parentReply) {
      const parentId = reply.parentReply.toString();
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(reply);
    } else {
      topLevelReplies.push({ ...reply, children: [] });
    }
  }

  for (const topReply of topLevelReplies) {
    topReply.children = childrenMap.get(topReply._id.toString()) || [];
  }

  let isLiked = false;
  if (userId) {
    const like = await PostLike.findOne({ post: id, user: userId });
    isLiked = !!like;
  }

  const postObj: any = post.toObject();
  return {
    ...postObj,
    course: postObj.course?.title || null,
    isLiked,
    replies: topLevelReplies,
    hasMoreReplies: post.repliesCount > REPLY_LIMIT,
  };
};

const deletePost = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  const post = await Post.findById(id);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  if (post.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Not authorized to delete this post',
    );
  }

  if (post.image) deleteFile(post.image).catch(() => {});
  await Post.findByIdAndDelete(id);
  await PostReply.deleteMany({ post: id });
  await PostLike.deleteMany({ post: id });
};

const toggleLike = async (postId: string, userId: string) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  // Atomic unlike — findOneAndDelete prevents race condition
  const removed = await PostLike.findOneAndDelete({
    post: postId,
    user: userId,
  });

  // Recalculate count from source of truth (self-healing, no drift)
  const syncLikesCount = async () => {
    const count = await PostLike.countDocuments({ post: postId });
    await Post.findByIdAndUpdate(postId, { likesCount: count });
  };

  if (removed) {
    await syncLikesCount();
    return { liked: false };
  }

  // Like — catch duplicate key (race condition: concurrent double-click)
  try {
    await PostLike.create({ post: postId, user: userId });
    await syncLikesCount();
    return { liked: true };
  } catch (err: any) {
    if (err.code === 11000) {
      return { liked: true };
    }
    throw err;
  }
};

const createReply = async (
  postId: string,
  authorId: string,
  content: string,
  parentReplyId?: string,
): Promise<IPostReply> => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  if (parentReplyId) {
    const parentReply = await PostReply.findById(parentReplyId);
    if (!parentReply) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent reply not found');
    }
    if (parentReply.post.toString() !== postId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Parent reply does not belong to this post',
      );
    }
    if (parentReply.parentReply) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot reply to a nested reply (max 1 level)',
      );
    }
  }

  const reply = await PostReply.create({
    post: postId,
    author: authorId,
    content,
    parentReply: parentReplyId || null,
  });

  const repliesCount = await PostReply.countDocuments({ post: postId });
  await Post.findByIdAndUpdate(postId, { repliesCount });

  return (await PostReply.findById(reply._id).select(
    '_id content parentReply createdAt',
  ))!;
};

const deleteReply = async (
  replyId: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  const reply = await PostReply.findById(replyId);
  if (!reply) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reply not found');
  }

  if (reply.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Not authorized to delete this reply',
    );
  }

  // Cascade delete: if top-level reply, delete its children too
  let deleteCount = 1;
  if (!reply.parentReply) {
    const childResult = await PostReply.deleteMany({ parentReply: replyId });
    deleteCount += childResult.deletedCount;
  }

  await PostReply.findByIdAndDelete(replyId);
  const repliesCount = await PostReply.countDocuments({ post: reply.post });
  await Post.findByIdAndUpdate(reply.post, { repliesCount });
};

const getMyPosts = async (userId: string, query: Record<string, unknown>) => {
  const baseFilter: Record<string, unknown> = {
    author: userId,
  };
  if (query.courseId) {
    baseFilter.course = query.courseId;
  }

  const postQuery = new QueryBuilder(
    Post.find(baseFilter)
      .select('author title course content image likesCount repliesCount createdAt')
      .populate({
        path: 'author',
        select: 'name profilePicture role',
        match: { status: { $ne: 'DELETE' } },
      })
      .populate('course', 'title'),
    query,
  )
    .search(['title', 'content'])
    .sort()
    .paginate();

  const data = await postQuery.modelQuery;
  const pagination = await postQuery.getPaginationInfo();

  const postIds = data.map((p: any) => p._id);
  const userLikes = await PostLike.find({
    post: { $in: postIds },
    user: userId,
  });
  const likedPostIds = new Set(userLikes.map(l => l.post.toString()));

  const postsWithLikeStatus = data.map((p: any) => ({
    ...p.toObject(),
    course: p.course?.title || null,
    isLiked: likedPostIds.has(p._id.toString()),
  }));

  return { pagination, data: postsWithLikeStatus };
};

const updatePost = async (
  postId: string,
  userId: string,
  payload: {
    title?: string;
    content?: string;
    courseId?: string | null;
    image?: string;
    removeImage?: boolean;
  },
) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }
  if (post.author.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Not authorized to edit this post',
    );
  }

  const update: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.content !== undefined) update.content = payload.content;

  if (payload.removeImage && !payload.image) {
    if (post.image) deleteFile(post.image).catch(() => {});
    unset.image = 1;
  } else if (payload.image) {
    if (post.image) deleteFile(post.image).catch(() => {});
    update.image = payload.image;
  }

  if (payload.courseId === null) {
    unset.course = 1;
  } else if (payload.courseId !== undefined) {
    await validateCourseId(payload.courseId);
    update.course = payload.courseId;
  }

  const updateQuery: Record<string, unknown> = {};
  if (Object.keys(update).length > 0) updateQuery.$set = update;
  if (Object.keys(unset).length > 0) updateQuery.$unset = unset;

  const updated = await Post.findByIdAndUpdate(postId, updateQuery, {
    new: true,
  })
    .select('_id title content course image updatedAt')
    .populate('course', 'title');

  const result: any = updated!.toObject();
  return { ...result, course: result.course?.title || null };
};

const updateReply = async (
  replyId: string,
  userId: string,
  content: string,
): Promise<IPostReply> => {
  const reply = await PostReply.findById(replyId);
  if (!reply) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reply not found');
  }
  if (reply.author.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Not authorized to edit this reply',
    );
  }

  const updated = await PostReply.findByIdAndUpdate(
    replyId,
    { content },
    { new: true },
  ).select('_id content updatedAt');

  return updated!;
};

const getPostReplies = async (postId: string, query: Record<string, unknown>) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  // Paginate top-level replies, fetch their children in batch
  const replyQuery = new QueryBuilder(
    PostReply.find({ post: postId, parentReply: null })
      .select('author content createdAt')
      .populate({
        path: 'author',
        select: 'name profilePicture role',
        match: { status: { $ne: 'DELETE' } },
      }),
    query,
  )
    .sort()
    .paginate();

  const topReplies = await replyQuery.modelQuery;
  const pagination = await replyQuery.getPaginationInfo();

  // Batch fetch children for this page's top-level replies
  const topReplyIds = topReplies.map((r: any) => r._id);
  const children = await PostReply.find({ parentReply: { $in: topReplyIds } })
    .select('author content parentReply createdAt')
    .populate({
      path: 'author',
      select: 'name profilePicture role',
      match: { status: { $ne: 'DELETE' } },
    })
    .sort({ createdAt: 1 })
    .lean();

  const childrenMap = new Map<string, any[]>();
  for (const child of children) {
    const parentId = child.parentReply!.toString();
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(child);
  }

  const data = topReplies.map((r: any) => ({
    ...r.toObject(),
    children: childrenMap.get(r._id.toString()) || [],
  }));

  return { pagination, data };
};

export const CommunityService = {
  createPost,
  getAllPosts,
  getPostById,
  deletePost,
  toggleLike,
  createReply,
  deleteReply,
  getMyPosts,
  updatePost,
  updateReply,
  getPostReplies,
};
