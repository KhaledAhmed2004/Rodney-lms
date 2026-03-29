# Screen 8: Quiz Builder

> **Section**: Dashboard APIs (Admin-Facing)
> **Base URL**: `{{baseUrl}}` = `http://localhost:5000/api/v1`
> **Response format**: See [Standard Response Envelope](../README.md#standard-response-envelope)
> **Related screens**: [Course](./04-course.md)

## UX Flow

### Quiz List Page Load
1. Admin sidebar e "Quiz Builder" e click kore
2. Quiz list load hoy → `GET /quizzes?page=1&limit=10` (→ 8.1)
3. Table dekhay: title, course name, total marks, settings summary (time limit, passing score), created date
4. Search bar e `searchTerm` diye quiz title search kora jay

### Create Quiz
1. Admin "Create Quiz" button e click kore
2. **Step 1 — Basic Info:**
   - **Course select kore** (mandatory) — dropdown theke existing course choose kore
   - Title likhe (e.g. "Module 1 Quiz")
   - Description likhe (optional)
3. **Step 2 — Settings configure kore:**
   - `timeLimit` — quiz er jonno koto minute time (0 = no limit)
   - `maxAttempts` — student koibar dite parbe (0 = unlimited)
   - `passingScore` — pass mark percentage (e.g. 70)
   - `shuffleQuestions` — question order random korbe kina
   - `shuffleOptions` — MCQ option order random korbe kina
   - `showResults` — submit er por student result dekhbe kina
4. **Step 3 — Questions add kore (optional at creation):**
   - "Add Question" button e click kore
   - Question type select kore: MCQ / TRUE_FALSE
   - **MCQ**: question text + min 2 ta option + exactly 1 ta correct mark + marks + explanation (optional)
   - **TRUE_FALSE**: question text + True/False option + 1 ta correct mark + marks + explanation
   - Multiple questions add korte parbe create form e
5. Submit → `POST /quizzes` (→ 8.2)
6. Success → quiz detail page e redirect — newly created quiz dekhay

> Quiz questions chara-o create kora jay — age quiz banao, por e edit page theke questions add koro. `questionId` ar `order` server auto-generate kore.

### View Quiz Detail
1. Admin quiz list theke kono quiz e click kore
2. Quiz detail load hoy → `GET /quizzes/:id` (→ 8.3) — includes questions with `isCorrect` answers
3. Detail page e 2 ta section: quiz info (title, course, settings) + questions list (ordered)

### Edit Quiz (Single Save)
1. Admin quiz detail page e "Edit" button e click kore
2. Edit page e **shob kichu eksathe dekhay**: title, description, settings, questions list
3. Admin je kichu change korte chay kore:
   - Title / description / settings edit kore
   - Existing question er text, options, marks edit kore
   - "Add Question" diye new question add kore (type select → form fill)
   - Question delete kore (UI theke remove)
   - Drag-and-drop diye question reorder kore
4. **Ekta "Save" button** e click kore → `PATCH /quizzes/:id` (→ 8.4)
5. Frontend page er **full current state** pathay (title + settings + questions array)
6. Server atomic update kore — shob eksathe save hoy ba kichui hoy na
7. Success → updated quiz detail dekhay

> **"Page e ja dekhchho tai Save e jay"** — frontend diff track kore na, pura current state pathay. `questions` omit korle questions untouched thake (shudhu title/settings update). `questions` pathale server pura array replace kore — new question e `questionId` auto-generate, deleted question automatically gone, reorder automatic by array position.

### Delete Quiz
1. Admin quiz list / detail page theke delete icon e click kore
2. Confirm dialog dekhay — warning: quiz er shob student attempts cascade delete hobe
3. Confirm → `DELETE /quizzes/:id` (→ 8.5)
4. Success → quiz list e redirect

---

### 8.1 Get All Quizzes

```
GET /quizzes?page=1&limit=10&searchTerm=
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Response:**
```json
{
  "success": true,
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPage": 1 },
  "data": [
    {
      "_id": "664d...",
      "title": "Module 1 Quiz",
      "course": { "_id": "664a...", "title": "Introduction to Web Development" },
      "description": "Test your knowledge of web development basics",
      "totalMarks": 7,
      "settings": { "timeLimit": 30, "maxAttempts": 3, "passingScore": 70 },
      "createdAt": "2026-03-14T10:00:00Z"
    },
    {
      "_id": "664e...",
      "title": "JavaScript Fundamentals",
      "course": { "_id": "664b...", "title": "Advanced JavaScript Patterns" },
      "description": "Core JavaScript concepts — variables, functions, and scope",
      "totalMarks": 25,
      "settings": { "timeLimit": 45, "maxAttempts": 2, "passingScore": 60 },
      "createdAt": "2026-03-12T08:30:00Z"
    },
    {
      "_id": "664f...",
      "title": "React Basics Assessment",
      "course": { "_id": "664c...", "title": "React & Next.js Masterclass" },
      "description": "Components, props, state, and lifecycle",
      "totalMarks": 30,
      "settings": { "timeLimit": 0, "maxAttempts": 0, "passingScore": 50 },
      "createdAt": "2026-03-10T14:15:00Z"
    }
  ]
}
```

> `questions` array list response e **excluded** — list page e questions dorkar nai, payload choto thake. Detail dekhte `GET /quizzes/:id` (→ 8.3) use koro.
> `course` populated — raw ObjectId er bodole `{ _id, title }` return hoy.
> `settings.timeLimit: 0` = no time limit. `settings.maxAttempts: 0` = unlimited attempts.

---

### 8.2 Create Quiz

```
POST /quizzes
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

**Request Body:**
```json
{
  "title": "Module 1 Quiz",
  "course": "664a1b2c3d4e5f6789abcdef",
  "description": "Test your knowledge of web development basics",
  "settings": {
    "timeLimit": 30,
    "maxAttempts": 3,
    "passingScore": 70,
    "shuffleQuestions": true,
    "shuffleOptions": true,
    "showResults": true
  },
  "questions": [
    {
      "type": "MCQ",
      "text": "What is Node.js?",
      "options": [
        { "optionId": "A", "text": "A runtime environment", "isCorrect": true },
        { "optionId": "B", "text": "A database", "isCorrect": false },
        { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
        { "optionId": "D", "text": "A text editor", "isCorrect": false }
      ],
      "marks": 5,
      "explanation": "Node.js is a JavaScript runtime built on Chrome's V8 engine.",
      "order": 0
    },
    {
      "type": "TRUE_FALSE",
      "text": "JavaScript is a statically typed language.",
      "options": [
        { "optionId": "T", "text": "True", "isCorrect": false },
        { "optionId": "F", "text": "False", "isCorrect": true }
      ],
      "marks": 2,
      "explanation": "JavaScript is dynamically typed — variable types are determined at runtime.",
      "order": 1
    }
  ]
}
```

> **Question types**: `MCQ` — multiple choice (min 2 options, exactly 1 correct), `TRUE_FALSE` — exactly 2 options (T/F, 1 correct). Server auto-generates `questionId` + `order`.

**Response (201):**
```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "_id": "664d...",
    "title": "Module 1 Quiz",
    "course": "664a1b2c3d4e5f6789abcdef",
    "description": "Test your knowledge of web development basics",
    "totalMarks": 7,
    "settings": {
      "timeLimit": 30,
      "maxAttempts": 3,
      "passingScore": 70,
      "shuffleQuestions": true,
      "shuffleOptions": true,
      "showResults": true
    },
    "questions": [
      {
        "questionId": "a1b2c3d4-...",
        "text": "What is Node.js?",
        "type": "MCQ",
        "marks": 5,
        "order": 0,
        "explanation": "Node.js is a JavaScript runtime built on Chrome's V8 engine.",
        "options": [
          { "optionId": "A", "text": "A runtime environment", "isCorrect": true },
          { "optionId": "B", "text": "A database", "isCorrect": false },
          { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
          { "optionId": "D", "text": "A text editor", "isCorrect": false }
        ]
      },
      {
        "questionId": "e5f6g7h8-...",
        "text": "JavaScript is a statically typed language.",
        "type": "TRUE_FALSE",
        "marks": 2,
        "order": 1,
        "explanation": "JavaScript is dynamically typed — variable types are determined at runtime.",
        "options": [
          { "optionId": "T", "text": "True", "isCorrect": false },
          { "optionId": "F", "text": "False", "isCorrect": true }
        ]
      }
    ],
    "createdAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 8.3 Get Quiz by ID

```
GET /quizzes/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Admin view — includes `isCorrect` on options. Student view (`GET /quizzes/:id/student-view`) e backend `isCorrect` strip kore — frontend er kono kaaj nai, alag endpoint alag response.

**Response:**
```json
{
  "success": true,
  "message": "Quiz retrieved successfully",
  "data": {
    "_id": "664d...",
    "title": "Module 1 Quiz",
    "course": "664a1b2c3d4e5f6789abcdef",
    "description": "Test your knowledge of web development basics",
    "totalMarks": 7,
    "settings": {
      "timeLimit": 30,
      "maxAttempts": 3,
      "passingScore": 70,
      "shuffleQuestions": true,
      "shuffleOptions": true,
      "showResults": true
    },
    "questions": [
      {
        "questionId": "a1b2c3d4-...",
        "text": "What is Node.js?",
        "type": "MCQ",
        "marks": 5,
        "order": 0,
        "explanation": "Node.js is a JavaScript runtime built on Chrome's V8 engine.",
        "options": [
          { "optionId": "A", "text": "A runtime environment", "isCorrect": true },
          { "optionId": "B", "text": "A database", "isCorrect": false },
          { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
          { "optionId": "D", "text": "A text editor", "isCorrect": false }
        ]
      },
      {
        "questionId": "e5f6g7h8-...",
        "text": "JavaScript is a statically typed language.",
        "type": "TRUE_FALSE",
        "marks": 2,
        "order": 1,
        "explanation": "JavaScript is dynamically typed — variable types are determined at runtime.",
        "options": [
          { "optionId": "T", "text": "True", "isCorrect": false },
          { "optionId": "F", "text": "False", "isCorrect": true }
        ]
      }
    ],
    "createdAt": "2026-03-14T10:00:00Z",
    "updatedAt": "2026-03-14T10:00:00Z"
  }
}
```

---

### 8.4 Update Quiz (Single Save)

```
PATCH /quizzes/:id
Content-Type: application/json
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Ekta Save button → ekta API call. Frontend page er full current state pathay. Server atomic update kore.

**How it works:**
| `questions` field | Behavior |
|-------------------|----------|
| Omit (na pathale) | Questions untouched — shudhu title/description/settings update |
| Send (pathale) | Full questions array **replace** — add/edit/delete/reorder shob ekta call e |

**Question handling:**
| Scenario | Ki korbe |
|----------|----------|
| Existing question (`questionId` ache) | Keep — update hoy |
| New question (`questionId` nai) | Server auto-generate kore UUID |
| Question array theke bade dile | Deleted — array te nai = gone |
| Array er order change korle | Reordered — `order` auto-assign by index |
| `totalMarks` | Server auto-recalculate kore |

**Settings merge**: Partial settings pathale existing settings er shathe merge hoy — data loss hoy na. E.g. shudhu `{ timeLimit: 45 }` pathale baki settings (passingScore, shuffleQuestions etc.) same thake.

**Example 1 — Shudhu title + settings update (questions touch koro na):**
```json
{
  "title": "Module 1 Quiz (Updated)",
  "settings": {
    "timeLimit": 45,
    "passingScore": 60
  }
}
```

**Example 2 — Full save (title + settings + questions eksathe):**
```json
{
  "title": "Module 1 Quiz (Updated)",
  "settings": {
    "timeLimit": 45,
    "passingScore": 60
  },
  "questions": [
    {
      "questionId": "a1b2c3d4-...",
      "type": "MCQ",
      "text": "What is Node.js used for?",
      "options": [
        { "optionId": "A", "text": "Server-side JavaScript", "isCorrect": true },
        { "optionId": "B", "text": "A database", "isCorrect": false },
        { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
        { "optionId": "D", "text": "A text editor", "isCorrect": false }
      ],
      "marks": 8,
      "explanation": "Node.js runs JavaScript on the server."
    },
    {
      "type": "TRUE_FALSE",
      "text": "Express.js is a backend framework.",
      "options": [
        { "optionId": "T", "text": "True", "isCorrect": true },
        { "optionId": "F", "text": "False", "isCorrect": false }
      ],
      "marks": 3,
      "explanation": "Express is a minimal Node.js web framework."
    }
  ]
}
```

> Example 2 te: Q1 existing (questionId ache → updated), Q2 new (questionId nai → auto-generated), purano Q2 + Q3 array te nai → deleted. `totalMarks` = 8 + 3 = 11 auto-calculated.

**Response:**
```json
{
  "success": true,
  "message": "Quiz updated successfully",
  "data": {
    "_id": "664d...",
    "title": "Module 1 Quiz (Updated)",
    "course": "664a1b2c3d4e5f6789abcdef",
    "description": "Test your knowledge of web development basics",
    "totalMarks": 11,
    "settings": {
      "timeLimit": 45,
      "maxAttempts": 3,
      "passingScore": 60,
      "shuffleQuestions": true,
      "shuffleOptions": true,
      "showResults": true
    },
    "questions": [
      {
        "questionId": "a1b2c3d4-...",
        "text": "What is Node.js used for?",
        "type": "MCQ",
        "marks": 8,
        "order": 0,
        "explanation": "Node.js runs JavaScript on the server.",
        "options": [
          { "optionId": "A", "text": "Server-side JavaScript", "isCorrect": true },
          { "optionId": "B", "text": "A database", "isCorrect": false },
          { "optionId": "C", "text": "A CSS framework", "isCorrect": false },
          { "optionId": "D", "text": "A text editor", "isCorrect": false }
        ]
      },
      {
        "questionId": "x7y8z9w0-...",
        "text": "Express.js is a backend framework.",
        "type": "TRUE_FALSE",
        "marks": 3,
        "order": 1,
        "explanation": "Express is a minimal Node.js web framework.",
        "options": [
          { "optionId": "T", "text": "True", "isCorrect": true },
          { "optionId": "F", "text": "False", "isCorrect": false }
        ]
      }
    ],
    "createdAt": "2026-03-14T10:00:00Z",
    "updatedAt": "2026-03-15T09:30:00Z"
  }
}
```

#### Validation Rules

| Type | Options | isCorrect |
|------|---------|-----------|
| `MCQ` | Min 2 options required | Exactly 1 `isCorrect: true` |
| `TRUE_FALSE` | Exactly 2 options (T/F) | Exactly 1 `isCorrect: true` |

---

### 8.5 Delete Quiz

```
DELETE /quizzes/:id
Auth: Bearer {{accessToken}} (SUPER_ADMIN)
```

> Cascade delete — quiz er shob `QuizAttempt` records o delete hoy.

**Response:**
```json
{
  "success": true,
  "message": "Quiz deleted successfully"
}
```

---

## Audit & Review Log

### Round 1 — Quiz Builder Audit (2026-03-29) — All Fixed

**1. [CRITICAL] getAttemptById — any student can view any attempt**
- **Problem:** `GET /quizzes/attempts/:attemptId` route e `STUDENT + SUPER_ADMIN` both allowed, but ownership check chilo na. Student A, Student B er attempt details (answers, score, questions) dekhte parto — privacy violation
- **Fix:** Service e ownership check add kora hoise: `if (role !== 'SUPER_ADMIN' && attempt.student._id !== userId) → 403 Forbidden`. Admin shob dekhte pare, student shudhu nijer attempt
- **Affected:** `GET /quizzes/attempts/:attemptId`

**2. [HIGH] getAllQuizzes — course populate nai + questions list e ashche**
- **Problem:** (a) `Quiz.find()` e `.populate('course')` chilo na — response e raw ObjectId ashto, course name dekhano jeto na. Doc e populated dekhay but code e chilo na (b) Full questions array list response e ashto — 50 question er quiz list e huge payload
- **Fix:** `.populate('course', 'title')` + `.select('-questions')` add kora hoise
- **Affected:** `GET /quizzes` (8.1)

**3. [HIGH] submitAttempt — time limit enforce hoy na**
- **Problem:** `settings.timeLimit: 30` (min) set korleo student 2 ghonta por submit korte parto. Server-side time check chilo na — frontend-only enforcement cheating e bypass hoy
- **Fix:** Submit e server-side check add kora hoise: `elapsedSeconds > (timeLimit * 60 + 30)` → 400 error "Time limit exceeded". 30 sec grace period for network delay. `timeLimit: 0` = no limit, check skip hoy
- **Affected:** `PATCH /quizzes/attempts/:attemptId/submit`

**4. [HIGH] updateQuiz — settings partial send e data loss**
- **Problem:** `settings: { timeLimit: 45 }` pathale pura settings object replace hoto — baki fields (passingScore, shuffleQuestions etc.) lost hoto
- **Fix:** Settings merge add kora hoise: `{ ...existing.settings, ...payload.settings }` — partial pathale baki fields safe thake
- **Affected:** `PATCH /quizzes/:id` (8.4)

**5. [HIGH] Validation — type-specific rules chilo na**
- **Problem:** MCQ 0 options e create hoto, TRUE_FALSE 3 options e pass hoto, SHORT_ANSWER e options accept korto. `correctAnswer` dead field chilo (kothao use hoto na). `questionId` required chilo but server auto-generate korto (validation conflict)
- **Fix:** `superRefine` diye type-specific validation: MCQ min 2 options + exactly 1 correct, TRUE_FALSE exactly 2 options + 1 correct, SHORT_ANSWER no options. `correctAnswer` removed, `questionId` + `order` optional kora hoise
- **Affected:** `POST /quizzes` (8.2), `PATCH /quizzes/:id` (8.4)

**6. [MEDIUM] Quiz update redesign — Single Save pattern**
- **Problem:** 4 ta individual question endpoint chilo (add/update/delete/reorder). Edit page e ekta Save button — frontend ke diff track kore multiple call fire korte hoto. Partial failure risk, complex frontend logic
- **Fix:** `PATCH /quizzes/:id` extend kora hoise `questions` array accept korte. Full replace — add/edit/delete/reorder shob ekta call e. Individual 4 ta endpoint removed (route + controller + service + validation)
- **Affected:** Quiz edit flow completely simplified — 1 save = 1 call

**7. [MEDIUM] Quiz course field — mandatory kora hoise**
- **Problem:** Quiz model e `course` field optional chilo, validation e chilo na, service e save hoto na. Quiz ke course er shathe link korar upay chilo na
- **Fix:** Interface e required, model e `required: true`, validation e `course: z.string({ required_error })`, service createQuiz e `course: payload.course` add kora hoise
- **Affected:** `POST /quizzes` (8.2), quiz model, quiz interface

**Files Modified:**
| File | Changes |
|------|---------|
| `quiz.service.ts` | `updateQuiz` — questions array replace + settings merge + totalMarks recalc; `getAllQuizzes` — course populate + select -questions; `getAttemptById` — ownership check; `submitAttempt` — time limit enforce; 4 ta question function removed |
| `quiz.controller.ts` | `getAttemptById` — userId + role pass to service; 4 ta question controller removed |
| `quiz.route.ts` | 4 ta question route removed |
| `quiz.validation.ts` | Type-specific validation (superRefine); `questionId`/`order` optional; `correctAnswer` removed; updateQuiz accepts `questions`; 3 ta question validation removed |
| `quiz.interface.ts` | `course` required |
| `quiz.model.ts` | `course` required: true |

---

### Round 2 — Cleanup & Feature Fixes (2026-03-29) — All Fixed

**8. [MEDIUM] `SHORT_ANSWER` question type removed**
- **Problem:** SHORT_ANSWER type er auto-grading chilo na (always 0 marks, "manual grading" bolto but manual grading system-i nai). Dead feature — student er jonno confusing, admin er jonno useless
- **Fix:** `SHORT_ANSWER` enum, validation, grading logic, `textAnswer` field shob removed. Shudhu MCQ + TRUE_FALSE thakbe
- **Affected:** interface, model, validation, service — full cleanup

**9. [LOW] `correctAnswer` dead field removed**
- **Problem:** `correctAnswer` field interface + model e chilo but kothao use hoto na. Grading `options[].isCorrect` diye hoy. Confusing dead field
- **Fix:** Interface + model theke removed
- **Affected:** `quiz.interface.ts`, `quiz.model.ts`

**10. [MEDIUM] `shuffleQuestions` / `shuffleOptions` server-side apply hocchilo na**
- **Problem:** Settings e `shuffleQuestions: true` set korleo student-view e questions original order e ashto. Anti-cheating feature effectively broken — client-side shuffle e student inspect korle original order dekhte parto
- **Fix:** `getStudentView` e Fisher-Yates shuffle add kora hoise: `shuffleQuestions` on hole questions array shuffle, `shuffleOptions` on hole protita question er options shuffle. Server-side — student response e already shuffled ashe
- **Affected:** `GET /quizzes/:id/student-view`

**11. [LOW] `Quiz.create()` raw response cleanup**
- **Problem:** `Quiz.create()` raw Mongoose document return korto — `__v` internal field included. CLAUDE.md rule: "Raw `.create()` result NEVER return koro"
- **Fix:** Create er por `Quiz.findById(id).select('-__v')` diye re-fetch kora hoise
- **Affected:** `POST /quizzes` (8.2)

**Files Modified:**
| File | Changes |
|------|---------|
| `quiz.interface.ts` | `SHORT_ANSWER` enum removed, `correctAnswer` removed from IQuestion, `textAnswer` removed from IStudentAnswer |
| `quiz.model.ts` | `correctAnswer` removed from QuestionSchema, `textAnswer` removed from StudentAnswerSchema |
| `quiz.validation.ts` | `SHORT_ANSWER` removed from enums + superRefine, `textAnswer` removed from submitAttempt |
| `quiz.service.ts` | SHORT_ANSWER grading removed, `shuffleArray` + server-side shuffle in getStudentView, `createQuiz` re-fetch with `-__v` |

---
