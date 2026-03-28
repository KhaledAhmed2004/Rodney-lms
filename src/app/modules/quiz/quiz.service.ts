import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { PipelineStage, Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  IQuiz,
  IQuizAttempt,
  QUESTION_TYPE,
} from './quiz.interface';
import { Quiz, QuizAttempt } from './quiz.model';
import { GamificationHelper } from '../../helpers/gamificationHelper';
import { POINTS_REASON } from '../gamification/gamification.interface';

// ==================== ADMIN SERVICES ====================

const createQuiz = async (payload: Record<string, unknown>): Promise<IQuiz> => {
  const quizData: Record<string, unknown> = {
    title: payload.title,
    description: payload.description,
    settings: payload.settings,
  };

  if (payload.questions && Array.isArray(payload.questions)) {
    quizData.questions = (payload.questions as any[]).map((q, index) => ({
      ...q,
      questionId: q.questionId || crypto.randomUUID(),
      order: q.order ?? index,
    }));
    quizData.totalMarks = (quizData.questions as any[]).reduce(
      (sum: number, q: any) => sum + (q.marks || 1),
      0,
    );
  }

  const result = await Quiz.create(quizData);
  return result;
};

const getAllQuizzes = async (query: Record<string, unknown>) => {
  const quizQuery = new QueryBuilder(Quiz.find(), query)
    .search(['title'])
    .filter()
    .sort()
    .paginate();

  const data = await quizQuery.modelQuery;
  const pagination = await quizQuery.getPaginationInfo();
  return { pagination, data };
};

const getQuizById = async (id: string): Promise<IQuiz> => {
  const result = await Quiz.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }
  return result;
};

const updateQuiz = async (
  id: string,
  payload: Partial<IQuiz>,
): Promise<IQuiz | null> => {
  const existing = await Quiz.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }
  const result = await Quiz.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteQuiz = async (id: string): Promise<void> => {
  const existing = await Quiz.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }
  await QuizAttempt.deleteMany({ quiz: id });
  await Quiz.findByIdAndDelete(id);
};

const addQuestion = async (
  quizId: string,
  questionData: Record<string, unknown>,
): Promise<IQuiz | null> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  if (!questionData.questionId) {
    questionData.questionId = crypto.randomUUID();
  }

  const marks = (questionData.marks as number) || 1;

  const result = await Quiz.findByIdAndUpdate(
    quizId,
    {
      $push: { questions: questionData },
      $inc: { totalMarks: marks },
    },
    { new: true },
  );
  return result;
};

const updateQuestion = async (
  quizId: string,
  questionId: string,
  payload: Record<string, unknown>,
): Promise<IQuiz | null> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  const questionIndex = quiz.questions.findIndex(
    q => q.questionId === questionId,
  );
  if (questionIndex === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Question not found');
  }

  const updateFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    updateFields[`questions.${questionIndex}.${key}`] = value;
  }

  const result = await Quiz.findByIdAndUpdate(
    quizId,
    { $set: updateFields },
    { new: true },
  );

  // Recalculate total marks
  if (result) {
    const totalMarks = result.questions.reduce((sum, q) => sum + q.marks, 0);
    await Quiz.findByIdAndUpdate(quizId, { totalMarks });
  }

  return result;
};

const deleteQuestion = async (
  quizId: string,
  questionId: string,
): Promise<IQuiz | null> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  const question = quiz.questions.find(q => q.questionId === questionId);
  if (!question) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Question not found');
  }

  const result = await Quiz.findByIdAndUpdate(
    quizId,
    {
      $pull: { questions: { questionId } },
      $inc: { totalMarks: -question.marks },
    },
    { new: true },
  );
  return result;
};

const reorderQuestions = async (
  quizId: string,
  questionIds: string[],
): Promise<IQuiz | null> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  const reorderedQuestions = questionIds.map((qId, index) => {
    const question = quiz.questions.find(q => q.questionId === qId);
    if (!question) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Question ${qId} not found`);
    }
    const questionObj =
      typeof (question as any).toObject === 'function'
        ? (question as any).toObject()
        : { ...question };
    return { ...questionObj, order: index };
  });

  const result = await Quiz.findByIdAndUpdate(
    quizId,
    { $set: { questions: reorderedQuestions } },
    { new: true },
  );
  return result;
};

const getQuizAttempts = async (
  quizId: string,
  query: Record<string, unknown>,
) => {
  const attemptQuery = new QueryBuilder(
    QuizAttempt.find({ quiz: quizId }).populate(
      'student',
      'name email profilePicture',
    ),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const data = await attemptQuery.modelQuery;
  const pagination = await attemptQuery.getPaginationInfo();
  return { pagination, data };
};

// ==================== STUDENT SERVICES ====================

const getStudentView = async (
  quizId: string,
  studentId: string,
): Promise<Partial<IQuiz>> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }
  // Strip correct answers
  const sanitizedQuestions = quiz.questions.map(q => ({
    questionId: q.questionId,
    type: q.type,
    text: q.text,
    options: q.options.map(o => ({
      optionId: o.optionId,
      text: o.text,
    })),
    marks: q.marks,
    order: q.order,
  }));

  return {
    _id: (quiz as any)._id,
    title: quiz.title,
    description: quiz.description,
    questions: sanitizedQuestions as any,
    settings: {
      timeLimit: quiz.settings.timeLimit,
      maxAttempts: quiz.settings.maxAttempts,
      passingScore: quiz.settings.passingScore,
      shuffleQuestions: quiz.settings.shuffleQuestions,
      shuffleOptions: quiz.settings.shuffleOptions,
      showResults: quiz.settings.showResults,
    },
    totalMarks: quiz.totalMarks,
  } as Partial<IQuiz>;
};

const startAttempt = async (
  quizId: string,
  studentId: string,
): Promise<IQuizAttempt> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }
  // Check max attempts
  if (quiz.settings.maxAttempts > 0) {
    const attemptCount = await QuizAttempt.countDocuments({
      quiz: quizId,
      student: studentId,
    });
    if (attemptCount >= quiz.settings.maxAttempts) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Maximum attempts reached');
    }
  }

  // Check for in-progress attempt
  const inProgress = await QuizAttempt.findOne({
    quiz: quizId,
    student: studentId,
    status: 'IN_PROGRESS',
  });
  if (inProgress) {
    return inProgress;
  }

  const attemptNumber =
    (await QuizAttempt.countDocuments({ quiz: quizId, student: studentId })) +
    1;

  const attempt = await QuizAttempt.create({
    quiz: quizId,
    student: studentId,
    maxScore: quiz.totalMarks,
    attemptNumber,
  });

  return attempt;
};

const submitAttempt = async (
  attemptId: string,
  studentId: string,
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string;
  }>,
): Promise<IQuizAttempt | null> => {
  const attempt = await QuizAttempt.findById(attemptId);
  if (!attempt) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Attempt not found');
  }
  if (attempt.student.toString() !== studentId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized');
  }
  if (attempt.status !== 'IN_PROGRESS') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Attempt already submitted');
  }

  const quiz = await Quiz.findById(attempt.quiz);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  // Grade answers
  let totalScore = 0;
  const gradedAnswers = answers.map(answer => {
    const question = quiz.questions.find(
      q => q.questionId === answer.questionId,
    );
    if (!question) {
      return {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        textAnswer: answer.textAnswer,
        isCorrect: false,
        marksAwarded: 0,
      };
    }

    let isCorrect = false;
    let marksAwarded = 0;

    if (
      question.type === QUESTION_TYPE.MCQ ||
      question.type === QUESTION_TYPE.TRUE_FALSE
    ) {
      const correctOption = question.options.find(o => o.isCorrect);
      if (correctOption && answer.selectedOptionId === correctOption.optionId) {
        isCorrect = true;
        marksAwarded = question.marks;
      }
    } else if (question.type === QUESTION_TYPE.SHORT_ANSWER) {
      // Short answer requires manual grading — mark as pending (0 marks for now)
      isCorrect = false;
      marksAwarded = 0;
    }

    totalScore += marksAwarded;

    return {
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      textAnswer: answer.textAnswer,
      isCorrect,
      marksAwarded,
    };
  });

  const percentage =
    quiz.totalMarks > 0 ? Math.round((totalScore / quiz.totalMarks) * 100) : 0;
  const passed = percentage >= quiz.settings.passingScore;
  const timeSpent = Math.floor(
    (Date.now() - attempt.startedAt.getTime()) / 1000,
  );

  const result = await QuizAttempt.findByIdAndUpdate(
    attemptId,
    {
      $set: {
        answers: gradedAnswers,
        score: totalScore,
        percentage,
        passed,
        timeSpent,
        completedAt: new Date(),
        status: 'COMPLETED',
      },
    },
    { new: true },
  );

  // Gamification: award points for quiz pass/perfect
  if (passed) {
    try {
      const reason = percentage === 100 ? POINTS_REASON.QUIZ_PERFECT : POINTS_REASON.QUIZ_PASS;
      await GamificationHelper.awardPoints(studentId, reason, attempt.quiz.toString(), 'Quiz');
      await GamificationHelper.checkAndAwardBadges(studentId);
    } catch { /* points failure should not block quiz submission */ }
  }

  return result;
};

const getAttemptById = async (attemptId: string): Promise<IQuizAttempt> => {
  const result = await QuizAttempt.findById(attemptId)
    .populate('quiz', 'title totalMarks settings')
    .populate('student', 'name email profilePicture');
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Attempt not found');
  }
  return result;
};

const getMyAttempts = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: { student: new Types.ObjectId(studentId), status: 'COMPLETED' } },
    {
      $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quizData',
        pipeline: [{ $project: { title: 1, course: 1 } }],
      },
    },
    { $unwind: '$quizData' },
    {
      $lookup: {
        from: 'courses',
        localField: 'quizData.course',
        foreignField: '_id',
        as: 'courseData',
        pipeline: [{ $project: { title: 1 } }],
      },
    },
    { $unwind: { path: '$courseData', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        quizTitle: '$quizData.title',
        courseName: { $ifNull: ['$courseData.title', null] },
        percentage: 1,
        passed: 1,
        completedAt: 1,
      },
    },
    {
      $facet: {
        data: [
          { $sort: { completedAt: -1 as const } },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await QuizAttempt.aggregate(pipeline);
  const data = result[0]?.data ?? [];
  const total = result[0]?.total[0]?.count ?? 0;

  return {
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

export const QuizService = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuizAttempts,
  getStudentView,
  startAttempt,
  submitAttempt,
  getAttemptById,
  getMyAttempts,
};
