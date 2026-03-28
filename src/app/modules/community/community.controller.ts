import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CommunityService } from './community.service';

const createPost = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.createPost(userId, {
    title: req.body.title,
    content: req.body.content,
    courseId: req.body.courseId,
    image: req.body.image,
  });
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Post created successfully',
    data: result,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload)?.id;
  const result = await CommunityService.getAllPosts(req.query, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Posts retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getPostById = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload)?.id;
  const result = await CommunityService.getPostById(req.params.id, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Post retrieved successfully',
    data: result,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const userRole = (req.user as JwtPayload).role;
  await CommunityService.deletePost(req.params.id, userId, userRole);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Post deleted successfully',
  });
});

const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.toggleLike(req.params.id, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.liked ? 'Post liked' : 'Post unliked',
    data: result,
  });
});

const createReply = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.createReply(
    req.params.id,
    userId,
    req.body.content,
    req.body.parentReplyId,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Reply added successfully',
    data: result,
  });
});

const deleteReply = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const userRole = (req.user as JwtPayload).role;
  await CommunityService.deleteReply(req.params.id, userId, userRole);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reply deleted successfully',
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.getMyPosts(userId, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My posts retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.updatePost(req.params.id, userId, {
    title: req.body.title,
    content: req.body.content,
    courseId: req.body.courseId,
    image: req.body.image,
    removeImage: req.body.removeImage,
  });
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Post updated successfully',
    data: result,
  });
});

const updateReply = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.updateReply(
    req.params.id,
    userId,
    req.body.content,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reply updated successfully',
    data: result,
  });
});

const getPostReplies = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getPostReplies(req.params.id, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Replies retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

export const CommunityController = {
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
