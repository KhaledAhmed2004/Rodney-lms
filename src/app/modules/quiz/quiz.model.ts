import { model, Schema } from 'mongoose';
import {
  IQuiz,
  QuizModel,
  IQuizAttempt,
  QuizAttemptModel,
  QUESTION_TYPE,
  ATTEMPT_STATUS,
} from './quiz.interface';

// ==================== OPTION SUB-SCHEMA ====================
const OptionSchema = new Schema(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

// ==================== QUESTION SUB-SCHEMA ====================
const QuestionSchema = new Schema(
  {
    questionId: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(QUESTION_TYPE),
      required: true,
    },
    text: { type: String, required: true },
    options: { type: [OptionSchema], default: [] },
    marks: { type: Number, required: true, default: 1 },
    explanation: { type: String },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

// ==================== SETTINGS SUB-SCHEMA ====================
const SettingsSchema = new Schema(
  {
    timeLimit: { type: Number, default: 0 },
    passingScore: { type: Number, default: 60 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
  },
  { _id: false },
);

// ==================== QUIZ SCHEMA ====================
const quizSchema = new Schema<IQuiz, QuizModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    questions: { type: [QuestionSchema], default: [] },
    settings: {
      type: SettingsSchema,
      default: {},
    },
    totalMarks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

quizSchema.statics.isExistById = async function (id: string) {
  return await this.findById(id);
};

export const Quiz = model<IQuiz, QuizModel>('Quiz', quizSchema);

// ==================== STUDENT ANSWER SUB-SCHEMA ====================
const StudentAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

// ==================== QUIZ ATTEMPT SCHEMA ====================
const quizAttemptSchema = new Schema<IQuizAttempt, QuizAttemptModel>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    answers: { type: [StudentAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ATTEMPT_STATUS),
      default: ATTEMPT_STATUS.IN_PROGRESS,
    },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ quiz: 1, student: 1, course: 1 });

export const QuizAttempt = model<IQuizAttempt, QuizAttemptModel>(
  'QuizAttempt',
  quizAttemptSchema,
);
