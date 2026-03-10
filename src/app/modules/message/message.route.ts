import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import { MessageController } from './message.controller';

const router = express.Router();

// Send message
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  fileHandler({
    maxFilesTotal: 10,
    enforceAllowedFields: ['image', 'media', 'doc'],
    perFieldMaxCount: { image: 5, media: 3, doc: 5 },
  }),
  MessageController.sendMessage,
);

// Mark all messages in a chat as read (fixed path BEFORE param path)
router.post(
  '/chat/:chatId/read',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  MessageController.markChatRead,
);

// Get messages by chat ID
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  MessageController.getMessage,
);

export const MessageRoutes = router;
