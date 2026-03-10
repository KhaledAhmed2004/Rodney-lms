import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { StudentHomeController } from './student-home.controller';

const router = express.Router();

router.get('/home', auth(USER_ROLES.STUDENT), StudentHomeController.getHome);
router.get(
  '/progress',
  auth(USER_ROLES.STUDENT),
  StudentHomeController.getProgress,
);

export const StudentHomeRoutes = router;
