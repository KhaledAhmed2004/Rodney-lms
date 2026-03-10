---
paths:
  - "src/app/modules/**/*.service.ts"
  - "src/app/modules/**/*.controller.ts"
---

# API Response Design Rules

## 1. Role-based Field Projection
- Jokhon ekta Model multiple role serve kore (e.g. User model for ADMIN + STUDENT), API response e role-irrelevant fields exclude koro
- Mongoose `.select()` use koro DB level e filtering er jonno
- Example: Admin profile theke student-specific fields (`averageRating`, `streak`, `achievements`) exclude koro

```typescript
// GOOD — DB level e filter
const query = User.findById(id);
if (user.role !== USER_ROLES.STUDENT) {
  query.select('-averageRating -streak -achievements');
}

// BAD — application level e delete
const user = await User.findById(id);
delete user.averageRating; // Don't do this
```

## 2. DB-level Filtering Always
- Response shaping always Mongoose `.select()` ba `.lean()` + projection diye koro
- Application level e manually field delete koro na — performant na + error-prone

## 3. Consistency Across Related Endpoints
- Ekta endpoint e response fix korle (e.g. GET /profile), shob related endpoints eO same fix apply koro:
  - GET endpoint fix korle → PATCH/PUT endpoint eO check koro
  - List endpoint fix korle → single item endpoint eO check koro
- Half-baked fix never acceptable — shob jaygay same behavior thakbe

## 4. Principle of Least Privilege
- API response e shudhu relevant data return koro
- Unnecessary fields expose kora = security risk + cluttered response
- Senior engineer mindset: "ei field ki ei role er jonno dorkar?" — na hole exclude koro

## 5. DRY Check
- Same field list / select string multiple jaygay repeat hole → constant hisebe extract koro
- But over-engineer koro na jodi scope choto hoy (2-3 jaygay repeat hole constant banao)