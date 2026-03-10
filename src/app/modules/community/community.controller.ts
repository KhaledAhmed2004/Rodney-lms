import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CommunityService } from './community.service';

const createPost = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const result = await CommunityService.createPost(
    userId,
    req.body.content,
    req.body.image,
  );
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

const getFlaggedPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getFlaggedPosts(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Flagged posts retrieved successfully',
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
  getFlaggedPosts,
};
