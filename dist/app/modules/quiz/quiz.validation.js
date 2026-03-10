"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizValidation = void 0;
const zod_1 = require("zod");
const optionSchema = zod_1.z.object({
    optionId: zod_1.z.string(),
    text: zod_1.z.string().min(1),
    isCorrect: zod_1.z.boolean(),
});
const questionSchema = zod_1.z.object({
    questionId: zod_1.z.string(),
    type: zod_1.z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
    text: zod_1.z.string().min(1),
    options: zod_1.z.array(optionSchema).optional(),
    correctAnswer: zod_1.z.string().optional(),
    marks: zod_1.z.number().min(0).default(1),
    explanation: zod_1.z.string().optional(),
    order: zod_1.z.number().min(0),
});
const settingsSchema = zod_1.z.object({
    timeLimit: zod_1.z.number().min(0).optional(),
    maxAttempts: zod_1.z.number().min(0).optional(),
    passingScore: zod_1.z.number().min(0).max(100).optional(),
    shuffleQuestions: zod_1.z.boolean().optional(),
    shuffleOptions: zod_1.z.boolean().optional(),
    showResults: zod_1.z.boolean().optional(),
});
const createQuiz = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        lessonId: zod_1.z.string().optional(),
        title: zod_1.z.string({ required_error: 'Title is required' }).min(1).max(200),
        description: zod_1.z.string().max(5000).optional(),
        questions: zod_1.z.array(questionSchema).optional(),
        settings: settingsSchema.optional(),
        status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
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
        status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    }),
});
const addQuestion = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Quiz ID is required' }),
    }),
    body: questionSchema,
});
const updateQuestion = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Quiz ID is required' }),
        questionId: zod_1.z.string({ required_error: 'Question ID is required' }),
    }),
    body: zod_1.z.object({
        type: zod_1.z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
        text: zod_1.z.string().min(1).optional(),
        options: zod_1.z.array(optionSchema).optional(),
        correctAnswer: zod_1.z.string().optional(),
        marks: zod_1.z.number().min(0).optional(),
        explanation: zod_1.z.string().optional(),
        order: zod_1.z.number().min(0).optional(),
    }),
});
const reorderQuestions = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Quiz ID is required' }),
    }),
    body: zod_1.z.object({
        questionIds: zod_1.z.array(zod_1.z.string()).min(1),
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
            textAnswer: zod_1.z.string().optional(),
        })),
    }),
});
exports.QuizValidation = {
    createQuiz,
    updateQuiz,
    addQuestion,
    updateQuestion,
    reorderQuestions,
    submitAttempt,
};
