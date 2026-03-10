---
paths:
  - "src/app/modules/**/*"
---

# Module Update/Feature Workflow

Jokhon user kono module e update, new feature, ba change ante bolbe — ei steps follow koro:

## Step 1 — Understand (Bujhe Nao)

- User er request carefully poro
- UX flow bujhe nao — user 2 format e flow dite pare:

### Broad Flow (high-level):
User bolbe: "student course buy korbe, payment hobe, enrollment hobe"
→ Tumi details break down koro + missing pieces identify koro + clarify koro

### Screen-wise Flow (detailed):
User bolbe: "Payment Screen e student Buy Now click korbe → amount dekhbe → confirm korbe"
→ Tumi edge cases dhoro + missing states identify koro

### Important:
- User jokhon jei format e bolbe, sheta accept koro — force koro na specific format e
- Broad flow dile — tumi screen-level details ask koro jodi dorkar hoy
- Screen flow dile — tumi edge cases + error states identify koro
- Existing code poro — ki ache, ki change lagbe, ki reuse korte parbe
- Jodi UX flow unclear thake, IMMEDIATELY user ke ask koro — assume koro na

## Step 2 — Plan (Plan Banao)

- Implementation plan ready koro — ki files change hobe, ki order e
- Database schema change lagbe kina check koro
- API endpoint add/modify lagbe kina check koro
- Frontend impact consider koro (breaking changes?)

## Step 3 — Senior Engineer Review (Edge Cases Identify Koro)

Plan ready howar por, senior engineer er moto ei bishoygula check koro:

### Data & Consistency
- Race condition hote pare? (concurrent requests)
- Data orphan hobe na to? (parent delete korle child ki hobe?)
- Array size unbounded hote pare?
- Duplicate data create howar chance ache?

### Security
- Authorization check ache? (user nijer data e access korche to?)
- Input validation cover korche shob case?
- Sensitive data expose hocche na to?

### Edge Cases
- Empty state — kono data na thakle ki hobe?
- Boundary values — max limit, min limit, zero, negative
- Concurrent users — 2 jon same time e same action korle?
- Network failure — halfway operation fail korle rollback hobe?
- Large data — 1000+ items hole pagination/performance thik thakbe?

### Business Logic
- Existing feature break hobe na to?
- Notification/email pathanor dorkar ache?
- Real-time (Socket.IO) update lagbe?
- Permission/role check thik ache?

### API Design (koyta API lagbe?)
- Feature er jonno exactly koyta endpoint dorkar — list koro:
  ```
  1. POST   /features          — create (auth: ADMIN)
  2. GET    /features          — list all (public)
  3. GET    /features/:id      — get by id
  4. PATCH  /features/:id      — update (auth: ADMIN)
  5. DELETE /features/:id      — delete (auth: ADMIN)
  ```
- Kono existing endpoint reuse korte parbe kina check koro
- Duplicate/redundant endpoint banachcho kina check koro
- Route design rules follow hocche kina (route-design.md)

### JSON Structure (Request/Response body)
- Protita API er request body ki hobe — example dao:
  ```json
  // POST /features — Request Body
  {
    "title": "string (required)",
    "description": "string (optional)",
    "status": "ACTIVE | INACTIVE (default: ACTIVE)"
  }
  ```
- Response body ki return korbe — example dao:
  ```json
  // Response
  {
    "success": true,
    "message": "Created successfully",
    "data": { "id": "...", "title": "...", ... }
  }
  ```
- Pagination lagbe kina (GET list endpoints e)
- Nested/populated data ki ki include hobe response e

### Frontend Guidance
- Frontend e ki ki UI state dorkar? (loading, empty, error, success)
- Kono specific component pattern suggest koro jodi relevant hoy
- Flow mismatch check koro — backend response frontend er expectation match korche kina
- Optimistic UI dorkar kina (instant feedback before server response)
- Real-time update lagbe kina (Socket.IO event listen)

### Client/Stakeholder Clarification
- Business rule unclear thakle — client ke ki ask korte hobe list koro
- UX decision jeta developer decide kora uchit na — client ke bolte hobe
- Edge case er handling jeta business decision — client confirm dorkar
- Example: "Refund policy ki? Partial refund hobe? Time limit ache?"

## Step 4 — Ask Questions (Clear Koro)

- Step 3 er review theke jei questions ashe — user ke ask koro
- UX flow er jei part unclear — ask koro
- Edge case er handling ki hobe — user ke decide korte dao
- Client ke ki ask korte hobe — user ke list diye bolo
- NEVER assume business logic — always confirm

## Step 5 — Document (Note Koro)

Shob decisions + UX flow `docs/decisions/[module]-[feature].md` e note koro:

```markdown
# [Module] — [Feature Name]
**Date**: YYYY-MM-DD
**Status**: Planned / In Progress / Done

## UX Flow
1. User clicks X
2. System does Y
3. User sees Z

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /features | ADMIN | Create feature |
| GET | /features | Public | List all |

## JSON Structure
### POST /features — Request
​```json
{ "title": "string", "status": "ACTIVE" }
​```
### Response
​```json
{ "success": true, "data": { ... } }
​```

## Decisions
- [Decision 1]: [Reason]
- [Decision 2]: [Reason]

## Edge Cases Handled
- [Case 1]: [How handled]

## Client Clarification Needed
- [ ] [Question 1 for client]
- [ ] [Question 2 for client]
```

## Step 6 — Summary (Final Overview)

Implementation shuru korar age final summary dao:

```
📋 Summary:
- Ki change hobe: [list]
- Files affected: [list]
- API count: [X ta endpoint]
- Edge cases handled: [list]
- Client ke ask korte hobe: [list — jodi thake]
- Open questions: [jodi thake]
- Breaking changes: [jodi thake]
```

User confirm korle tokhon implement koro.