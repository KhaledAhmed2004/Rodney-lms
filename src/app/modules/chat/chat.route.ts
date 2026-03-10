import express from 'express';
import auth from '../../middlewares/auth';
import { ChatController } from './chat.controller';
import { USER_ROLES } from '../../../enums/user';
const router = express.Router();

router.post(
  '/:otherUserId',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  ChatController.createChat
);

router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  ChatController.getChat
);

export const ChatRoutes = router;
