import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { NotificationRoutes } from '../app/modules/notification/notification.route';
import { CourseRoutes } from '../app/modules/course/course.route';
import { EnrollmentRoutes } from '../app/modules/enrollment/enrollment.route';
import { ActivityRoutes } from '../app/modules/activity/activity.route';
import { LegalRoutes } from '../app/modules/legal/legal.route';
import { QuizRoutes } from '../app/modules/quiz/quiz.route';
import { GradebookRoutes } from '../app/modules/gradebook/gradebook.route';
import { CommunityRoutes } from '../app/modules/community/community.route';
import { FeedbackRoutes } from '../app/modules/feedback/feedback.route';
import { GamificationRoutes } from '../app/modules/gamification/gamification.route';
import { DashboardRoutes } from '../app/modules/dashboard/dashboard.route';
import { AnalyticsRoutes } from '../app/modules/analytics/analytics.route';
import { StudentHomeRoutes } from '../app/modules/student-home/student-home.route';

const router = express.Router();

const apiRoutes = [
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/chats',
    route: ChatRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/courses',
    route: CourseRoutes,
  },
  {
    path: '/enrollments',
    route: EnrollmentRoutes,
  },
  {
    path: '/activity',
    route: ActivityRoutes,
  },
  {
    path: '/legal',
    route: LegalRoutes,
  },
  {
    path: '/quizzes',
    route: QuizRoutes,
  },
  {
    path: '/gradebook',
    route: GradebookRoutes,
  },
  {
    path: '/community',
    route: CommunityRoutes,
  },
  {
    path: '/feedback',
    route: FeedbackRoutes,
  },
  {
    path: '/gamification',
    route: GamificationRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
  {
    path: '/analytics',
    route: AnalyticsRoutes,
  },
  {
    path: '/student',
    route: StudentHomeRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
