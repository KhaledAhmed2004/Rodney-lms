"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const quiz_model_1 = require("./quiz.model");
const course_model_1 = require("../course/course.model");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const gamificationHelper_1 = require("../../helpers/gamificationHelper");
const gamification_interface_1 = require("../gamification/gamification.interface");
// ==================== ADMIN SERVICES ====================
const createQuiz = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const quizData = {
        title: payload.title,
        course: payload.course,
        description: payload.description,
        settings: payload.settings,
    };
    if (payload.questions && Array.isArray(payload.questions)) {
        quizData.questions = payload.questions.map((q, index) => {
            var _a;
            return (Object.assign(Object.assign({}, q), { questionId: q.questionId || crypto_1.default.randomUUID(), order: (_a = q.order) !== null && _a !== void 0 ? _a : index }));
        });
        quizData.totalMarks = quizData.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    }
    const created = yield quiz_model_1.Quiz.create(quizData);
    const result = yield quiz_model_1.Quiz.findById(created._id).select('-__v');
    return result;
});
const getAllQuizzes = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const quizQuery = new QueryBuilder_1.default(quiz_model_1.Quiz.find().populate('course', 'title').select('-questions'), query)
        .search(['title'])
        .filter()
        .sort()
        .paginate();
    const data = yield quizQuery.modelQuery;
    const pagination = yield quizQuery.getPaginationInfo();
    return { pagination, data };
});
const getQuizById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield quiz_model_1.Quiz.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    return result;
});
const updateQuiz = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const existing = yield quiz_model_1.Quiz.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    const updateData = {};
    if (payload.title !== undefined)
        updateData.title = payload.title;
    if (payload.description !== undefined)
        updateData.description = payload.description;
    if (payload.settings !== undefined) {
        updateData.settings = Object.assign(Object.assign({}, (_c = (_b = (_a = existing.settings).toObject) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : existing.settings), payload.settings);
    }
    // Questions array replace — auto-generate questionId + order, recalculate totalMarks
    if (payload.questions && Array.isArray(payload.questions)) {
        updateData.questions = payload.questions.map((q, index) => {
            var _a;
            return (Object.assign(Object.assign({}, q), { questionId: q.questionId || crypto_1.default.randomUUID(), order: (_a = q.order) !== null && _a !== void 0 ? _a : index }));
        });
        updateData.totalMarks = updateData.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    }
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(id, updateData, { new: true });
    return result;
});
const deleteQuiz = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield quiz_model_1.Quiz.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    yield quiz_model_1.QuizAttempt.deleteMany({ quiz: id });
    yield quiz_model_1.Quiz.findByIdAndDelete(id);
});
const getQuizAttempts = (quizId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const attemptQuery = new QueryBuilder_1.default(quiz_model_1.QuizAttempt.find({ quiz: quizId }).populate('student', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate();
    const data = yield attemptQuery.modelQuery;
    const pagination = yield attemptQuery.getPaginationInfo();
    return { pagination, data };
});
// ==================== STUDENT SERVICES ====================
// Fisher-Yates shuffle
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
const getStudentView = (quizId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
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
        questions = questions.map(q => (Object.assign(Object.assign({}, q), { options: shuffleArray(q.options) })));
    }
    return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questions: questions,
        settings: {
            timeLimit: quiz.settings.timeLimit,
            passingScore: quiz.settings.passingScore,
            shuffleQuestions: quiz.settings.shuffleQuestions,
            shuffleOptions: quiz.settings.shuffleOptions,
            showResults: quiz.settings.showResults,
        },
        totalMarks: quiz.totalMarks,
    };
});
const startAttempt = (quizId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    // Check if already attempted
    const existing = yield quiz_model_1.QuizAttempt.findOne({
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
            };
        }
        // Already completed — no retry
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Quiz already attempted');
    }
    yield quiz_model_1.QuizAttempt.create({
        quiz: quizId,
        student: studentId,
        maxScore: quiz.totalMarks,
    });
    const attempt = yield quiz_model_1.QuizAttempt.findOne({
        quiz: quizId,
        student: studentId,
        status: 'IN_PROGRESS',
    }).select('startedAt maxScore status');
    return attempt;
});
const submitAttempt = (attemptId, studentId, answers) => __awaiter(void 0, void 0, void 0, function* () {
    const attempt = yield quiz_model_1.QuizAttempt.findById(attemptId);
    if (!attempt) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Attempt not found');
    }
    if (attempt.student.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized');
    }
    if (attempt.status !== 'IN_PROGRESS') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Attempt already submitted');
    }
    const quiz = yield quiz_model_1.Quiz.findById(attempt.quiz);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    // Enforce time limit (30 sec grace period for network delay)
    if (quiz.settings.timeLimit > 0) {
        const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
        const limitSeconds = quiz.settings.timeLimit * 60 + 30;
        if (elapsedSeconds > limitSeconds) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Time limit exceeded. Quiz submission rejected.');
        }
    }
    // Grade answers
    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
        const question = quiz.questions.find(q => q.questionId === answer.questionId);
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
    const percentage = quiz.totalMarks > 0 ? Math.round((totalScore / quiz.totalMarks) * 100) : 0;
    const passed = percentage >= quiz.settings.passingScore;
    const timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
    const result = yield quiz_model_1.QuizAttempt.findByIdAndUpdate(attemptId, {
        $set: {
            answers: gradedAnswers,
            score: totalScore,
            percentage,
            passed,
            timeSpent,
            completedAt: new Date(),
            status: 'COMPLETED',
        },
    }, { new: true });
    // Gamification: award points for quiz pass/perfect
    if (passed) {
        try {
            const reason = percentage === 100 ? gamification_interface_1.POINTS_REASON.QUIZ_PERFECT : gamification_interface_1.POINTS_REASON.QUIZ_PASS;
            yield gamificationHelper_1.GamificationHelper.awardPoints(studentId, reason, attempt.quiz.toString(), 'Quiz');
            yield gamificationHelper_1.GamificationHelper.checkAndAwardBadges(studentId);
        }
        catch ( /* points failure should not block quiz submission */_a) { /* points failure should not block quiz submission */ }
        // Auto-complete QUIZ lesson on pass
        try {
            const lesson = yield course_model_1.Lesson.findOne({ quiz: attempt.quiz }).select('courseId');
            if (lesson) {
                const enrollment = yield enrollment_model_1.Enrollment.findOne({
                    student: studentId,
                    course: lesson.courseId,
                    status: 'ACTIVE',
                });
                if (enrollment) {
                    const alreadyCompleted = enrollment.progress.completedLessons.some(l => l.toString() === lesson._id.toString());
                    if (!alreadyCompleted) {
                        const totalLessons = yield course_model_1.Lesson.countDocuments({ courseId: lesson.courseId, isVisible: true });
                        const newCount = enrollment.progress.completedLessons.length + 1;
                        const completionPct = totalLessons > 0 ? Math.round((newCount / totalLessons) * 100) : 0;
                        const enrollUpdate = {
                            $addToSet: { 'progress.completedLessons': lesson._id },
                            $set: {
                                'progress.lastAccessedLesson': lesson._id,
                                'progress.lastAccessedAt': new Date(),
                                'progress.completionPercentage': completionPct,
                            },
                        };
                        if (completionPct >= 100) {
                            enrollUpdate.$set['status'] = 'COMPLETED';
                            enrollUpdate.$set['completedAt'] = new Date();
                        }
                        yield enrollment_model_1.Enrollment.findByIdAndUpdate(enrollment._id, enrollUpdate);
                        // Course complete points
                        if (completionPct >= 100) {
                            yield gamificationHelper_1.GamificationHelper.awardPoints(studentId, gamification_interface_1.POINTS_REASON.COURSE_COMPLETE, lesson.courseId.toString(), 'Course');
                        }
                    }
                }
            }
        }
        catch ( /* auto-complete failure should not block quiz submission */_b) { /* auto-complete failure should not block quiz submission */ }
    }
    return {
        _id: result._id,
        score: totalScore,
        maxScore: quiz.totalMarks,
        percentage,
        passed,
        timeSpent,
        completedAt: result.completedAt,
        answers: gradedAnswers,
    };
});
const getAttemptById = (attemptId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield quiz_model_1.QuizAttempt.findById(attemptId)
        .populate('quiz', 'title totalMarks settings.passingScore settings.showResults')
        .populate('student', 'name profilePicture')
        .select('quiz student score maxScore percentage passed timeSpent completedAt answers');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Attempt not found');
    }
    // Students can only view their own attempts
    if (userRole !== 'SUPER_ADMIN' && result.student._id.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized');
    }
    return result;
});
const getMyAttempts = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 10), 100);
    const skip = (page - 1) * limit;
    const pipeline = [
        { $match: { student: new mongoose_1.Types.ObjectId(studentId), status: 'COMPLETED' } },
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
                    { $sort: { completedAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ];
    const result = yield quiz_model_1.QuizAttempt.aggregate(pipeline);
    const data = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    const total = (_e = (_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.total[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
    return {
        pagination: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data,
    };
});
exports.QuizService = {
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
