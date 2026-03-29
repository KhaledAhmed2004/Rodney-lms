import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { CommunityController } from './community.controller';
import { CommunityValidation } from './community.validation';

const router = express.Router();

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

// Static route BEFORE /:id
router.get(
  '/posts/my-posts',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.getMyPosts,
);

router.get(
  '/posts/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.getPostById,
);

router.patch(
  '/posts/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  fileHandler(['image']),
  validateRequest(CommunityValidation.updatePost),
  CommunityController.updatePost,
);

router.delete(
  '/posts/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.deletePost,
);

// Likes
router.patch(
  '/posts/:id/like',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(CommunityValidation.toggleLike),
  CommunityController.toggleLike,
);

// Replies
router.post(
  '/posts/:id/replies',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(CommunityValidation.createReply),
  CommunityController.createReply,
);

router.patch(
  '/replies/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  validateRequest(CommunityValidation.updateReply),
  CommunityController.updateReply,
);

router.delete(
  '/replies/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  CommunityController.deleteReply,
);

export const CommunityRoutes = router;
