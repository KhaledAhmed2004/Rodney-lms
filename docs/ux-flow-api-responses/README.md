# UX Flow with API Responses

Screen-by-screen API flow for both the **Student App** and **Admin Dashboard**. Each screen lists the APIs called, their method/URL, auth requirement, and expected response shape.

> Base URL: `{{baseUrl}}` = `http://localhost:5000/api/v1`

---

## Standard Response Envelope

Every API follows this format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPage": 5 },
  "data": "..."
}
```

`pagination` only present on list endpoints. `data` shape varies per endpoint.

---

## Part 1: App APIs (Student-Facing)

| # | Screen | Description |
|---|--------|-------------|
| 1 | [Auth](./app-screens/01-auth.md) | Register, login, OTP verify, password reset, refresh token |
| 2 | [Welcome / Onboarding](./app-screens/02-welcome-onboarding.md) | Published courses list for onboarding flow |
| 3 | [Home](./app-screens/03-home.md) | Dashboard data — enrolled courses, streaks, recent activity |
| 4 | [Browse Courses](./app-screens/04-browse-courses.md) | Course catalog with filters, categories, search |
| 5 | [Course Content](./app-screens/05-course-content.md) | Course detail, modules, lessons, enrollment, progress tracking |
| 6 | [Progress](./app-screens/06-progress.md) | Learning progress, streaks, completion stats |
| 8 | [Community](./app-screens/08-community.md) | Community posts, comments, likes, bookmarks |
| 9 | [Notification](./app-screens/09-notification.md) | In-app notifications, mark read |
| 10 | [Profile](./app-screens/10-profile.md) | View/edit profile, preferences, settings |
| 11 | [Chat](./app-screens/11-chat.md) | Real-time messaging, chat rooms, Socket.IO events |

---

## Part 2: Dashboard APIs (Admin-Facing)

| # | Screen | Description |
|---|--------|-------------|
| 1 | [Auth](./dashboard-screens/01-auth.md) | Admin login, token management |
| 2 | [Overview](./dashboard-screens/02-overview.md) | Dashboard stats, counts, recent activity |
| 3 | [User Management](./dashboard-screens/03-user-management.md) | User CRUD, roles, export, status management |
| 4 | [Course](./dashboard-screens/04-course.md) | Course CRUD, modules, lessons, publishing |
| 5 | [Enrollment Management](./dashboard-screens/05-enrollment-management.md) | Enrollment list, approve/reject, batch operations |
| 6 | [Gradebook](./dashboard-screens/06-gradebook.md) | Student grades, quiz scores, progress overview |
| 7 | [Discussion](./dashboard-screens/07-discussion.md) | Discussion moderation, community management |
| 8 | [Quiz Builder](./dashboard-screens/08-quiz-builder.md) | Quiz CRUD, questions, settings |
| 9 | [Notification](./dashboard-screens/09-notification.md) | Send notifications, manage templates |
| 10 | [Analytics](./dashboard-screens/10-analytics.md) | Platform analytics, charts, reports |
| 11 | [Feedback](./dashboard-screens/11-feedback.md) | Student feedback, reviews, ratings |
| 12 | [Gamification](./dashboard-screens/12-gamification.md) | Badges, rewards, leaderboard management |
| 13 | [Legal](./dashboard-screens/13-legal.md) | Terms, privacy policy, legal pages |
| 14 | [Profile](./dashboard-screens/14-profile.md) | Admin profile management |
