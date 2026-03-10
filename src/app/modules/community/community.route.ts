import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { CommunityController } from './community.controller';
import { CommunityValidation } from './community.validation';

const router = express.Router();

// Admin
router.get(
  '/admin/flagged',
  auth(USER_ROLES.SUPER_ADMIN),
  CommunityController.getFlaggedPosts,
);

// Posts
router.post(
  '/posts',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  fileHandler(['image']),
  validateRequest(CommunityValidation.createPost),
  CommunityController.createPost,
);

router.get(
  '/posts',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.getAllPosts,
);

router.get(
  '/posts/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.getPostById,
);

router.delete(
  '/posts/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.deletePost,
);

// Likes
router.post(
  '/posts/:id/like',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.toggleLike,
);

// Replies
router.post(
  '/posts/:id/replies',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(CommunityValidation.createReply),
  CommunityController.createReply,
);

router.delete(
  '/replies/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.deleteReply,
);

export const CommunityRoutes = router;
