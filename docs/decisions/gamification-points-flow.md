# Gamification — Points Award Flow

> **Date**: 2026-03-28
> **Status**: Implemented
> **Module**: `src/app/helpers/gamificationHelper.ts` + service integrations

---

## How Points Work

Student kono action korle (lesson complete, quiz pass, etc.) → service function automatically points dey → PointsLedger e audit record rakhe → User.totalPoints increment hoy → badge eligibility check hoy.

```
Student Action (lesson complete / quiz pass / course complete / etc.)
     │
     ▼
Service function (enrollment / quiz / community)
     │
     ├── GamificationHelper.awardPoints(studentId, reason, referenceId)
     │       │
     │       ├── Duplicate check (PointsLedger e same reason + referenceId ache kina)
     │       │     ├── Already exists → SKIP (no double points)
     │       │     └── New → continue
     │       │
     │       ├── PointsLedger.create() — audit trail record
     │       ├── User.totalPoints $inc — running total increment
     │       └── DailyActivity.pointsEarned $inc — daily tracking
     │
     └── GamificationHelper.checkAndAwardBadges(studentId)
             │
             └── Shob active badge er criteria evaluate → qualify korle auto-award
```

---

## Points Table

| Event | Reason Enum | Points | Trigger Location |
|-------|-------------|:------:|------------------|
| Lesson complete | `LESSON_COMPLETE` | 10 | `enrollment.service.ts` → `completeLesson()` |
| Quiz pass (not perfect) | `QUIZ_PASS` | 25 | `quiz.service.ts` → `submitAttempt()` |
| Quiz perfect score (100%) | `QUIZ_PERFECT` | 50 | `quiz.service.ts` → `submitAttempt()` |
| Course complete | `COURSE_COMPLETE` | 100 | `enrollment.service.ts` → `completeLesson()` (auto) / `updateStatus()` (manual) |
| First enrollment | `FIRST_ENROLLMENT` | 5 | `enrollment.service.ts` → `enrollInCourse()` |
| Streak bonus | `STREAK_BONUS` | 15 | _Not wired yet — future milestone feature_ |
| Community post | `COMMUNITY_POST` | 5 | `community.service.ts` → `createPost()` |

> **Quiz scoring**: Perfect (100%) = 50 pts, Pass (not perfect) = 25 pts. **Mutually exclusive** — perfect hole 50 pabe, 75 na.

---

## Event Flows (Detail)

### 1. Lesson Complete → 10 pts

```
Student lesson progress 100% korlo (completeLesson)
  → Duplicate check: PointsLedger e reason=LESSON_COMPLETE + referenceId=lessonId ache kina?
  → Na → 10 points award
  → Haan → skip (already earned for this lesson)
```

### 2. Quiz Submit → 25 or 50 pts

```
Student quiz submit korlo (submitAttempt), result calculated:
  ├── Perfect score (100%) → 50 pts (QUIZ_PERFECT)
  ├── Pass (but not 100%) → 25 pts (QUIZ_PASS)
  └── Fail → 0 pts (no points)

  Duplicate check: PointsLedger e reason + referenceId=quizId ache kina?
  → Na → award
  → Haan → skip (retry te abar points nai)
```

### 3. Course Complete → 100 pts

```
Enrollment status → COMPLETED (auto via completeLesson or manual via updateStatus)
  → Duplicate check: reason=COURSE_COMPLETE + referenceId=courseId ache kina?
  → Na → 100 points award
  → Haan → skip
```

### 4. First Enrollment → 5 pts

```
Student course e enroll korlo (enrollInCourse)
  → Check: student er total enrollment count === 1 (ei enroll er por)
  → Haan (first ever) → 5 points award
  → Na (already has other enrollments) → skip
```

### 5. Community Post → 5 pts

```
Student community post create korlo (createPost)
  → 5 points award (per post)
  → referenceId = post._id (unique per post, so no duplicate issue)
  → Every post earns points — content creation encourage kora hoy
```

### 6. Streak Bonus → 15 pts (Future)

```
Student consecutive days active (7, 14, 30, 60, 90 din milestone)
  → Each milestone → 15 points
  → Duplicate check: reason=STREAK_BONUS + referenceId=milestone identifier
  → Not implemented yet — requires activityHelper.updateStreak() enhancement
```

---

## Duplicate Prevention Rules

| Event | Duplicate Rule | referenceId | Behavior |
|-------|---------------|-------------|----------|
| Lesson complete | **Once per lesson** | `lessonId` | Same lesson revisit e points nai |
| Quiz pass/perfect | **Once per quiz** | `quizId` | Retry te abar points nai |
| Course complete | **Once per course** | `courseId` | Re-enrollment e abar 100 pts nai |
| First enrollment | **Once per lifetime** | `courseId` (first) | Enrollment count check |
| Community post | **Every post** | `postId` (unique) | Each post = new referenceId, so naturally unique |
| Streak bonus | **Once per milestone** | Milestone key | Same milestone e abar bonus nai |

**Implementation**: `awardPoints()` e `PointsLedger.findOne({ student, reason, referenceId })` check ache. Match paile skip kore.

---

## Badge Auto-Award (After Points)

Points award er por `checkAndAwardBadges()` shob active badge evaluate kore:

| Badge Criteria | How Evaluated |
|---------------|---------------|
| `POINTS_THRESHOLD` | PointsLedger aggregate → total points >= threshold |
| `COURSES_COMPLETED` | Enrollment count where status = COMPLETED |
| `QUIZZES_PASSED` | QuizAttempt count where passed = true |
| `PERFECT_QUIZ` | QuizAttempt count where percentage = 100 |
| `STREAK_DAYS` | User.streak.longest >= threshold |

### All 17 Badges (Auto-Seeded)

Server startup e `seedBadges()` (`src/DB/seedBadges.ts`) automatically shob badge create kore jodi missing thake. Admin er changes (description, threshold, isActive) **preserve thake** — overwrite hoy na.

#### Points Badges (4)

| Badge | Icon | Threshold | Description | Auto-awarded when |
|-------|------|:---------:|-------------|-------------------|
| Rising Star | `rising-star` | 100 pts | Earn 100 points to prove you are on the rise | `PointsLedger` sum >= 100 |
| Point Collector | `point-collector` | 500 pts | Earn 500 points — you are building serious momentum | `PointsLedger` sum >= 500 |
| Point Master | `point-master` | 1,000 pts | Earn 1000 points — mastery in the making | `PointsLedger` sum >= 1,000 |
| Point Legend | `point-legend` | 5,000 pts | Earn 5000 points — legendary dedication | `PointsLedger` sum >= 5,000 |

#### Course Completion Badges (4)

| Badge | Icon | Threshold | Description | Auto-awarded when |
|-------|------|:---------:|-------------|-------------------|
| First Steps | `first-steps` | 1 course | Complete your first course | `Enrollment` count (COMPLETED) >= 1 |
| Course Explorer | `course-explorer` | 3 courses | Complete 3 courses — exploring new horizons | `Enrollment` count (COMPLETED) >= 3 |
| Course Master | `course-master` | 5 courses | Complete 5 courses — a true master of learning | `Enrollment` count (COMPLETED) >= 5 |
| Course Legend | `course-legend` | 10 courses | Complete 10 courses — unstoppable learner | `Enrollment` count (COMPLETED) >= 10 |

#### Quiz Badges (3)

| Badge | Icon | Threshold | Description | Auto-awarded when |
|-------|------|:---------:|-------------|-------------------|
| Quiz Starter | `quiz-starter` | 1 quiz | Pass your first quiz | `QuizAttempt` count (passed=true) >= 1 |
| Quiz Master | `quiz-master` | 10 quizzes | Pass 10 quizzes — sharp mind | `QuizAttempt` count (passed=true) >= 10 |
| Quiz Champion | `quiz-champion` | 25 quizzes | Pass 25 quizzes — champion level knowledge | `QuizAttempt` count (passed=true) >= 25 |

#### Perfect Quiz Badges (2)

| Badge | Icon | Threshold | Description | Auto-awarded when |
|-------|------|:---------:|-------------|-------------------|
| Perfect Score | `perfect-score` | 1 perfect | Get 100% on a quiz — flawless | `QuizAttempt` count (percentage=100) >= 1 |
| Perfectionist | `perfectionist` | 5 perfects | Get 100% on 5 quizzes — precision is your middle name | `QuizAttempt` count (percentage=100) >= 5 |

#### Streak Badges (3)

| Badge | Icon | Threshold | Description | Auto-awarded when |
|-------|------|:---------:|-------------|-------------------|
| Consistent Learner | `consistent-learner` | 7 days | 7-day learning streak — building the habit | `User.streak.longest` >= 7 |
| Streak Champion | `streak-champion` | 30 days | 30-day streak — dedication at its finest | `User.streak.longest` >= 30 |
| Streak Legend | `streak-legend` | 100 days | 100-day streak — unstoppable force | `User.streak.longest` >= 100 |

#### Custom Badges (1)

| Badge | Icon | Threshold | Description | How Awarded |
|-------|------|:---------:|-------------|-------------|
| Early Adopter | `early-adopter` | 0 | One of the first learners on the platform | Admin manually awards (no auto-evaluation) |

### Badge Seed Behavior

```
Server starts → seedBadges() runs
    ↓
Badge.find() → existing badge names collect kore
    ↓
DEFAULT_BADGES filter → jegula DB te nai shegula = missing
    ↓
missing.length > 0 → Badge.insertMany(missing)
    ↓
Log: "🏅 3 default badge(s) seeded: First Steps, Quiz Starter, ..."
```

**Key behaviors:**
- **Missing badges auto-create** — server restart e missing badge recreate hoy
- **Existing badges untouched** — admin er description/threshold/isActive change preserve thake
- **Deleted badges recreate** — admin jodi DB theke badge delete kore, next restart e oi badge abar create hobe
- **Name = unique identifier** — seed matching `name` field diye hoy

**File**: `src/DB/seedBadges.ts` — badge definitions + seed logic
**Called from**: `src/server.ts` — after MongoDB connect, before server listen

---

## Data Storage

| Collection | Field | Purpose |
|------------|-------|---------|
| `pointsledgers` | Full document | Audit trail — who, how many, why, when, reference |
| `users` | `totalPoints` | Cumulative lifetime total (fast read for leaderboard) |
| `dailyactivities` | `pointsEarned` | Daily points tracking (for activity calendar) |

---

## Error Safety

Gamification calls are wrapped in try-catch in service functions. Points award failure **does not block** the main action (lesson complete, quiz submit still succeeds).

```typescript
try {
  await GamificationHelper.awardPoints(studentId, reason, referenceId, type);
  await GamificationHelper.checkAndAwardBadges(studentId);
} catch {
  // Points failure silent — main action unaffected
}
```
