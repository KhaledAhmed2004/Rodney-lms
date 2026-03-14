import { z } from 'zod';

const optionSchema = z.object({
  optionId: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  questionId: z.string(),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
  text: z.string().min(1),
  options: z.array(optionSchema).optional(),
  correctAnswer: z.string().optional(),
  marks: z.number().min(0).default(1),
  explanation: z.string().optional(),
  order: z.number().min(0),
});

const settingsSchema = z.object({
  timeLimit: z.number().min(0).optional(),
  maxAttempts: z.number().min(0).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
});

const createQuiz = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1).max(200),
    description: z.string().max(5000).optional(),
    questions: z
      .array(
        z.object({
          type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
          text: z.string().min(1),
          options: z.array(optionSchema).optional(),
          correctAnswer: z.string().optional(),
          marks: z.number().min(0).default(1),
          explanation: z.string().optional(),
          questionId: z.string().optional(),
          order: z.number().min(0).optional(),
        }),
      )
      .optional(),
    settings: settingsSchema.optional(),
  }),
});

const updateQuiz = z.object({
  params: z.object({
    id: z.string({ required_error: 'Quiz ID is required' }),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    settings: settingsSchema.optional(),
  }),
});

const addQuestion = z.object({
  params: z.object({
    id: z.string({ required_error: 'Quiz ID is required' }),
  }),
  body: questionSchema,
});

const updateQuestion = z.object({
  params: z.object({
    id: z.string({ required_error: 'Quiz ID is required' }),
    questionId: z.string({ required_error: 'Question ID is required' }),
  }),
  body: z.object({
    type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
    text: z.string().min(1).optional(),
    options: z.array(optionSchema).optional(),
    correctAnswer: z.string().optional(),
    marks: z.number().min(0).optional(),
    explanation: z.string().optional(),
    order: z.number().min(0).optional(),
  }),
});

const reorderQuestions = z.object({
  params: z.object({
    id: z.string({ required_error: 'Quiz ID is required' }),
  }),
  body: z.object({
    questionIds: z.array(z.string()).min(1),
  }),
});

const submitAttempt = z.object({
  params: z.object({
    attemptId: z.string({ required_error: 'Attempt ID is required' }),
  }),
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string(),
        selectedOptionId: z.string().optional(),
        textAnswer: z.string().optional(),
      }),
    ),
  }),
});

export const QuizValidation = {
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  reorderQuestions,
  submitAttempt,
};
