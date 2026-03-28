---
paths:
  - "src/app/helpers/gamificationHelper.*"
  - "src/app/modules/gamification/**/*"
  - "src/app/modules/enrollment/enrollment.service.*"
  - "src/app/modules/quiz/quiz.service.*"
  - "src/app/modules/community/community.service.*"
  - "src/DB/seedBadges.*"
---

# Gamification & Points System Rules

## Reference Doc

Points system er complete flow doc ekhane: **`docs/decisions/gamification-points-flow.md`**

Ei doc e ache:
- Points award flow diagram
- Points table (kon event e koto point)
- Duplicate prevention rules
- Badge auto-award criteria
- Data storage map

## CRITICAL: Doc Update Rule

Ei files er **kono ekta** change korle `docs/decisions/gamification-points-flow.md` **MUST update**:

| File | Doc e ki update korte hobe |
|------|---------------------------|
| `gamificationHelper.ts` | Points map, duplicate logic, award flow |
| `gamification.interface.ts` | POINTS_REASON enum, BADGE_CRITERIA enum |
| `gamification.model.ts` | PointsLedger schema |
| `seedBadges.ts` | Badge table (threshold, criteria) |
| `enrollment.service.ts` | Enrollment-related points triggers |
| `quiz.service.ts` | Quiz-related points triggers |
| `community.service.ts` | Community post points trigger |

**Task complete mane doc o complete.** Code change kore doc update na korle task incomplete.

## Points Integration Pattern

Service function e gamification call add korar pattern:

```typescript
// After main action completes (DB save done)
try {
  await GamificationHelper.awardPoints(studentId, POINTS_REASON.XXX, referenceId, 'ReferenceType');
  await GamificationHelper.checkAndAwardBadges(studentId);
} catch { /* points failure should not block main action */ }
```

### Key Rules:
1. **try-catch mandatory** — gamification failure main action block korbe na
2. **After DB save** — main action shesh howar por call koro, age na
3. **referenceId** — duplicate prevention er jonno critical. Lesson e lessonId, quiz e quizId, course e courseId, post e postId
4. **checkAndAwardBadges** — awardPoints er por always call koro (badge evaluation)

## Duplicate Prevention

`awardPoints()` e built-in duplicate check ache:
- `PointsLedger.findOne({ student, reason, referenceId })` — match paile skip
- Community post exception — every post er unique postId, so naturally no duplicate

## Notun Points Event Add Korle

1. `POINTS_REASON` enum e new value add koro
2. `POINTS_MAP` e points value add koro
3. `descriptions` map e description add koro
4. Service function e integration call add koro (pattern follow koro)
5. **`docs/decisions/gamification-points-flow.md` update koro** — Points Table + Event Flow + Duplicate Rules
