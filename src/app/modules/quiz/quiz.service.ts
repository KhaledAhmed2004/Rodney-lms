import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { PipelineStage, Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IQuiz, IQuizAttempt } from './quiz.interface';
import { Quiz, QuizAttempt } from './quiz.model';
import { Lesson } from '../course/course.model';
import { Enrollment } from '../enrollment/enrollment.model';
import { GamificationHelper } from '../../helpers/gamificationHelper';
import { POINTS_REASON } from '../gamification/gamification.interface';

// ==================== ADMIN SERVICES ====================

const createQuiz = async (payload: Record<string, unknown>): Promise<IQuiz> => {
  const quizData: Record<string, unknown> = {
    title: payload.title,
    course: payload.course,
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

  const created = await Quiz.create(quizData);
  const result = await Quiz.findById(created._id).select('-__v');
  return result!;
};

const getAllQuizzes = async (query: Record<string, unknown>) => {
  const quizQuery = new QueryBuilder(
    Quiz.find().populate('course', 'title').select('-questions'),
    query,
  )
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
  payload: Record<string, unknown>,
): Promise<IQuiz | null> => {
  const existing = await Quiz.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  const updateData: Record<string, unknown> = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.settings !== undefined) {
    updateData.settings = {
      ...(existing.settings as any).toObject?.() ?? existing.settings,
      ...(payload.settings as Record<string, unknown>),
    };
  }

  // Questions array replace — auto-generate questionId + order, recalculate totalMarks
  if (payload.questions && Array.isArray(payload.questions)) {
    updateData.questions = (payload.questions as any[]).map((q, index) => ({
      ...q,
      questionId: q.questionId || crypto.randomUUID(),
      order: q.order ?? index,
    }));
    updateData.totalMarks = (updateData.questions as any[]).reduce(
      (sum: number, q: any) => sum + (q.marks || 1),
      0,
    );
  }

  const result = await Quiz.findByIdAndUpdate(id, updateData, { new: true });
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

// Fisher-Yates shuffle
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getStudentView = async (
  quizId: string,
  studentId: string,
): Promise<Partial<IQuiz>> => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Quiz not found');
  }

  // Strip correct answers + explanation
  let questions = quiz.questions.map(q => ({
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

  // Server-side shuffle (anti-cheating)
  if (quiz.settings.shuffleQuestions) {
    questions = shuffleArray(questions);
  }
  if (quiz.settings.shuffleOptions) {
    questions = questions.map(q => ({
      ...q,
      options: shuffleArray(q.options),
    }));
  }

  return {
    _id: (quiz as any)._id,
    title: quiz.title,
    description: quiz.description,
    questions: questions as any,
    settings: {
      timeLimit: quiz.settings.timeLimit,
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

  // Check if already attempted
  const existing = await QuizAttempt.findOne({
    quiz: quizId,
    student: studentId,
  });
  if (existing) {
    // In-progress — return existing to continue
    if (existing.status === 'IN_PROGRESS') {
      return {
        _id: existing._id,
        startedAt: existing.startedAt,
        maxScore: existing.maxScore,
        status: existing.status,
      } as unknown as IQuizAttempt;
    }
    // Already completed — no retry
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Quiz already attempted');
  }

  await QuizAttempt.create({
    quiz: quizId,
    student: studentId,
    maxScore: quiz.totalMarks,
  });

  const attempt = await QuizAttempt.findOne({
    quiz: quizId,
    student: studentId,
    status: 'IN_PROGRESS',
  }).select('startedAt maxScore status');

  return attempt!;
};

const submitAttempt = async (
  attemptId: string,
  studentId: string,
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
  }>,
) => {
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

  // Enforce time limit (30 sec grace period for network delay)
  if (quiz.settings.timeLimit > 0) {
    const elapsedSeconds = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000,
    );
    const limitSeconds = quiz.settings.timeLimit * 60 + 30;
    if (elapsedSeconds > limitSeconds) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Time limit exceeded. Quiz submission rejected.',
      );
    }
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
        isCorrect: false,
        marksAwarded: 0,
      };
    }

    let isCorrect = false;
    let marksAwarded = 0;

    const correctOption = question.options.find(o => o.isCorrect);
    if (correctOption && answer.selectedOptionId === correctOption.optionId) {
      isCorrect = true;
      marksAwarded = question.marks;
    }

    totalScore += marksAwarded;

    return {
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
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

    // Auto-complete QUIZ lesson on pass
    try {
      const lesson = await Lesson.findOne({ quiz: attempt.quiz }).select('courseId');
      if (lesson) {
        const enrollment = await Enrollment.findOne({
          student: studentId,
          course: lesson.courseId,
          status: 'ACTIVE',
        });
        if (enrollment) {
          const alreadyCompleted = enrollment.progress.completedLessons.some(
            l => l.toString() === lesson._id.toString(),
          );
          if (!alreadyCompleted) {
            const totalLessons = await Lesson.countDocuments({ courseId: lesson.courseId, isVisible: true });
            const newCount = enrollment.progress.completedLessons.length + 1;
            const completionPct = totalLessons > 0 ? Math.round((newCount / totalLessons) * 100) : 0;

            const enrollUpdate: Record<string, unknown> = {
              $addToSet: { 'progress.completedLessons': lesson._id },
              $set: {
                'progress.lastAccessedLesson': lesson._id,
                'progress.lastAccessedAt': new Date(),
                'progress.completionPercentage': completionPct,
              },
            };
            if (completionPct >= 100) {
              (enrollUpdate.$set as Record<string, unknown>)['status'] = 'COMPLETED';
              (enrollUpdate.$set as Record<string, unknown>)['completedAt'] = new Date();
            }
            await Enrollment.findByIdAndUpdate(enrollment._id, enrollUpdate);

            // Course complete points
            if (completionPct >= 100) {
              await GamificationHelper.awardPoints(studentId, POINTS_REASON.COURSE_COMPLETE, lesson.courseId.toString(), 'Course');
            }
          }
        }
      }
    } catch { /* auto-complete failure should not block quiz submission */ }
  }

  return {
    _id: result!._id,
    score: totalScore,
    maxScore: quiz.totalMarks,
    percentage,
    passed,
    timeSpent,
    completedAt: result!.completedAt,
    answers: gradedAnswers,
  };
};

const getAttemptById = async (
  attemptId: string,
  userId: string,
  userRole: string,
) => {
  const result = await QuizAttempt.findById(attemptId)
    .populate('quiz', 'title totalMarks settings.passingScore settings.showResults')
    .populate('student', 'name profilePicture')
    .select('quiz student score maxScore percentage passed timeSpent completedAt answers');
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Attempt not found');
  }

  // Students can only view their own attempts
  if (userRole !== 'SUPER_ADMIN' && result.student._id.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized');
  }

  return result;
};

const getMyAttempts = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Math.max(1, Number(query.limit) || 10), 100);
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
  getQuizAttempts,
  getStudentView,
  startAttempt,
  submitAttempt,
  getAttemptById,
  getMyAttempts,
};
