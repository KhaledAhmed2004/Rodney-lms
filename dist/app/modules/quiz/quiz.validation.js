"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizValidation = void 0;
const zod_1 = require("zod");
const optionSchema = zod_1.z.object({
    optionId: zod_1.z.string(),
    text: zod_1.z.string().min(1),
    isCorrect: zod_1.z.boolean(),
});
const settingsSchema = zod_1.z.object({
    timeLimit: zod_1.z.number().min(0).optional(),
    passingScore: zod_1.z.number().min(0).max(100).optional(),
    shuffleQuestions: zod_1.z.boolean().optional(),
    shuffleOptions: zod_1.z.boolean().optional(),
    showResults: zod_1.z.boolean().optional(),
});
// Shared question schema — createQuiz + updateQuiz both use this
const questionBodySchema = zod_1.z
    .object({
    type: zod_1.z.enum(['MCQ', 'TRUE_FALSE']),
    text: zod_1.z.string().min(1),
    options: zod_1.z.array(optionSchema).optional(),
    marks: zod_1.z.number().min(0).default(1),
    explanation: zod_1.z.string().optional(),
    questionId: zod_1.z.string().optional(),
    order: zod_1.z.number().min(0).optional(),
})
    .superRefine((data, ctx) => {
    var _a, _b, _c, _d;
    if (data.type === 'MCQ') {
        if (!data.options || data.options.length < 2) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'MCQ requires at least 2 options',
                path: ['options'],
            });
        }
        const correctCount = (_b = (_a = data.options) === null || _a === void 0 ? void 0 : _a.filter(o => o.isCorrect).length) !== null && _b !== void 0 ? _b : 0;
        if (correctCount !== 1) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'MCQ requires exactly 1 correct option',
                path: ['options'],
            });
        }
    }
    else if (data.type === 'TRUE_FALSE') {
        if (!data.options || data.options.length !== 2) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'TRUE_FALSE requires exactly 2 options',
                path: ['options'],
            });
        }
        const correctCount = (_d = (_c = data.options) === null || _c === void 0 ? void 0 : _c.filter(o => o.isCorrect).length) !== null && _d !== void 0 ? _d : 0;
        if (correctCount !== 1) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'TRUE_FALSE requires exactly 1 correct option',
                path: ['options'],
            });
        }
    }
});
const createQuiz = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string({ required_error: 'Title is required' }).min(1).max(200),
        course: zod_1.z.string({ required_error: 'Course is required' }),
        description: zod_1.z.string().max(5000).optional(),
        questions: zod_1.z.array(questionBodySchema).optional(),
        settings: settingsSchema.optional(),
    }),
});
const updateQuiz = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Quiz ID is required' }),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().max(5000).optional(),
        settings: settingsSchema.optional(),
        questions: zod_1.z.array(questionBodySchema).optional(),
    }),
});
const submitAttempt = zod_1.z.object({
    params: zod_1.z.object({
        attemptId: zod_1.z.string({ required_error: 'Attempt ID is required' }),
    }),
    body: zod_1.z.object({
        answers: zod_1.z.array(zod_1.z.object({
            questionId: zod_1.z.string(),
            selectedOptionId: zod_1.z.string().optional(),
        })),
    }),
});
exports.QuizValidation = {
    createQuiz,
    updateQuiz,
    submitAttempt,
};
