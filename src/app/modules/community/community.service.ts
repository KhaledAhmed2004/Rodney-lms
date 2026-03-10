import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IPost, IPostReply } from './community.interface';
import { Post, PostLike, PostReply } from './community.model';

const createPost = async (
  authorId: string,
  content: string,
  image?: string,
): Promise<IPost> => {
  const post = await Post.create({ author: authorId, content, image });
  return post;
};

const getAllPosts = async (query: Record<string, unknown>, userId?: string) => {
  const postQuery = new QueryBuilder(
    Post.find({ status: 'ACTIVE' }).populate('author', 'name profilePicture'),
    query,
  )
    .search(['content'])
    .sort()
    .paginate();

  const data = await postQuery.modelQuery;
  const pagination = await postQuery.getPaginationInfo();

  // Add isLiked flag for current user
  let postsWithLikeStatus = data;
  if (userId) {
    const postIds = data.map((p: any) => p._id);
    const userLikes = await PostLike.find({
      post: { $in: postIds },
      user: userId,
    });
    const likedPostIds = new Set(userLikes.map(l => l.post.toString()));

    postsWithLikeStatus = data.map((p: any) => ({
      ...p.toObject(),
      isLiked: likedPostIds.has(p._id.toString()),
    }));
  }

  return { pagination, data: postsWithLikeStatus };
};

const getPostById = async (id: string, userId?: string) => {
  const post = await Post.findById(id).populate(
    'author',
    'name profilePicture',
  );
  if (!post || post.status !== 'ACTIVE') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  const replies = await PostReply.find({ post: id, status: 'ACTIVE' })
    .populate('author', 'name profilePicture')
    .sort({ createdAt: 1 });

  let isLiked = false;
  if (userId) {
    const like = await PostLike.findOne({ post: id, user: userId });
    isLiked = !!like;
  }

  return {
    ...post.toObject(),
    isLiked,
    replies,
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

  await Post.findByIdAndUpdate(id, { status: 'DELETED' });
  await PostReply.updateMany({ post: id }, { status: 'DELETED' });
};

const toggleLike = async (postId: string, userId: string) => {
  const post = await Post.findById(postId);
  if (!post || post.status !== 'ACTIVE') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  const existingLike = await PostLike.findOne({ post: postId, user: userId });

  if (existingLike) {
    await PostLike.findByIdAndDelete(existingLike._id);
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
    return { liked: false };
  } else {
    await PostLike.create({ post: postId, user: userId });
    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
    return { liked: true };
  }
};

const createReply = async (
  postId: string,
  authorId: string,
  content: string,
): Promise<IPostReply> => {
  const post = await Post.findById(postId);
  if (!post || post.status !== 'ACTIVE') {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found');
  }

  const reply = await PostReply.create({
    post: postId,
    author: authorId,
    content,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { repliesCount: 1 } });

  return reply;
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

  await PostReply.findByIdAndUpdate(replyId, { status: 'DELETED' });
  await Post.findByIdAndUpdate(reply.post, { $inc: { repliesCount: -1 } });
};

// Admin
const getFlaggedPosts = async (query: Record<string, unknown>) => {
  const postQuery = new QueryBuilder(
    Post.find({ status: 'HIDDEN' }).populate(
      'author',
      'name email profilePicture',
    ),
    query,
  )
    .sort()
    .paginate();

  const data = await postQuery.modelQuery;
  const pagination = await postQuery.getPaginationInfo();
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
  getFlaggedPosts,
};
