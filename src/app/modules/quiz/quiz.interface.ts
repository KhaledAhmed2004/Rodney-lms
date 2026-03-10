import { Model, Types } from 'mongoose';

export enum QUIZ_STATUS {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum QUESTION_TYPE {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export enum ATTEMPT_STATUS {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  TIMED_OUT = 'TIMED_OUT',
}

export type IOption = {
  optionId: string;
  text: string;
  isCorrect: boolean;
};

export type IQuestion = {
  questionId: string;
  type: QUESTION_TYPE;
  text: string;
  options: IOption[];
  correctAnswer?: string;
  marks: number;
  explanation?: string;
  order: number;
};

export type IQuizSettings = {
  timeLimit: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
};

export type IQuiz = {
  course: Types.ObjectId;
  lesson?: Types.ObjectId;
  title: string;
  description?: string;
  questions: IQuestion[];
  settings: IQuizSettings;
  status: QUIZ_STATUS;
  totalMarks: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type QuizModel = {
  isExistById(id: string): Promise<IQuiz | null>;
} & Model<IQuiz>;

// Quiz Attempt
export type IStudentAnswer = {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect: boolean;
  marksAwarded: number;
};

export type IQuizAttempt = {
  quiz: Types.ObjectId;
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  answers: IStudentAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
  attemptNumber: number;
  status: ATTEMPT_STATUS;
  createdAt?: Date;
  updatedAt?: Date;
};

export type QuizAttemptModel = Model<IQuizAttempt>;
