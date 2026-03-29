import { z } from 'zod';

const optionSchema = z.object({
  optionId: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const settingsSchema = z.object({
  timeLimit: z.number().min(0).optional(),
  maxAttempts: z.number().min(0).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
});

// Shared question schema — createQuiz + updateQuiz both use this
const questionBodySchema = z
  .object({
    type: z.enum(['MCQ', 'TRUE_FALSE']),
    text: z.string().min(1),
    options: z.array(optionSchema).optional(),
    marks: z.number().min(0).default(1),
    explanation: z.string().optional(),
    questionId: z.string().optional(),
    order: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'MCQ') {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCQ requires at least 2 options',
          path: ['options'],
        });
      }
      const correctCount =
        data.options?.filter(o => o.isCorrect).length ?? 0;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MCQ requires exactly 1 correct option',
          path: ['options'],
        });
      }
    } else if (data.type === 'TRUE_FALSE') {
      if (!data.options || data.options.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'TRUE_FALSE requires exactly 2 options',
          path: ['options'],
        });
      }
      const correctCount =
        data.options?.filter(o => o.isCorrect).length ?? 0;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'TRUE_FALSE requires exactly 1 correct option',
          path: ['options'],
        });
      }
    }
  });

const createQuiz = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(1).max(200),
    course: z.string({ required_error: 'Course is required' }),
    description: z.string().max(5000).optional(),
    questions: z.array(questionBodySchema).optional(),
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
    questions: z.array(questionBodySchema).optional(),
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
      }),
    ),
  }),
});

export const QuizValidation = {
  createQuiz,
  updateQuiz,
  submitAttempt,
};
