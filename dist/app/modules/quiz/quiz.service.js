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
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const quiz_interface_1 = require("./quiz.interface");
const quiz_model_1 = require("./quiz.model");
// ==================== ADMIN SERVICES ====================
const createQuiz = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const quizData = {
        title: payload.title,
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
    const result = yield quiz_model_1.Quiz.create(quizData);
    return result;
});
const getAllQuizzes = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const quizQuery = new QueryBuilder_1.default(quiz_model_1.Quiz.find(), query)
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
    const existing = yield quiz_model_1.Quiz.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(id, payload, { new: true });
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
const addQuestion = (quizId, questionData) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    if (!questionData.questionId) {
        questionData.questionId = crypto_1.default.randomUUID();
    }
    const marks = questionData.marks || 1;
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(quizId, {
        $push: { questions: questionData },
        $inc: { totalMarks: marks },
    }, { new: true });
    return result;
});
const updateQuestion = (quizId, questionId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    const questionIndex = quiz.questions.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Question not found');
    }
    const updateFields = {};
    for (const [key, value] of Object.entries(payload)) {
        updateFields[`questions.${questionIndex}.${key}`] = value;
    }
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(quizId, { $set: updateFields }, { new: true });
    // Recalculate total marks
    if (result) {
        const totalMarks = result.questions.reduce((sum, q) => sum + q.marks, 0);
        yield quiz_model_1.Quiz.findByIdAndUpdate(quizId, { totalMarks });
    }
    return result;
});
const deleteQuestion = (quizId, questionId) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    const question = quiz.questions.find(q => q.questionId === questionId);
    if (!question) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Question not found');
    }
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(quizId, {
        $pull: { questions: { questionId } },
        $inc: { totalMarks: -question.marks },
    }, { new: true });
    return result;
});
const reorderQuestions = (quizId, questionIds) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
    }
    const reorderedQuestions = questionIds.map((qId, index) => {
        const question = quiz.questions.find(q => q.questionId === qId);
        if (!question) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Question ${qId} not found`);
        }
        const questionObj = typeof question.toObject === 'function'
            ? question.toObject()
            : Object.assign({}, question);
        return Object.assign(Object.assign({}, questionObj), { order: index });
    });
    const result = yield quiz_model_1.Quiz.findByIdAndUpdate(quizId, { $set: { questions: reorderedQuestions } }, { new: true });
    return result;
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
const getStudentView = (quizId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const quiz = yield quiz_model_1.Quiz.findById(quizId);
    if (!quiz) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Quiz not found');
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
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questions: sanitizedQuestions,
        settings: {
            timeLimit: quiz.settings.timeLimit,
            maxAttempts: quiz.settings.maxAttempts,
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
    // Check max attempts
    if (quiz.settings.maxAttempts > 0) {
        const attemptCount = yield quiz_model_1.QuizAttempt.countDocuments({
            quiz: quizId,
            student: studentId,
        });
        if (attemptCount >= quiz.settings.maxAttempts) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Maximum attempts reached');
        }
    }
    // Check for in-progress attempt
    const inProgress = yield quiz_model_1.QuizAttempt.findOne({
        quiz: quizId,
        student: studentId,
        status: 'IN_PROGRESS',
    });
    if (inProgress) {
        return inProgress;
    }
    const attemptNumber = (yield quiz_model_1.QuizAttempt.countDocuments({ quiz: quizId, student: studentId })) +
        1;
    const attempt = yield quiz_model_1.QuizAttempt.create({
        quiz: quizId,
        student: studentId,
        maxScore: quiz.totalMarks,
        attemptNumber,
    });
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
    // Grade answers
    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
        const question = quiz.questions.find(q => q.questionId === answer.questionId);
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
        if (question.type === quiz_interface_1.QUESTION_TYPE.MCQ ||
            question.type === quiz_interface_1.QUESTION_TYPE.TRUE_FALSE) {
            const correctOption = question.options.find(o => o.isCorrect);
            if (correctOption && answer.selectedOptionId === correctOption.optionId) {
                isCorrect = true;
                marksAwarded = question.marks;
            }
        }
        else if (question.type === quiz_interface_1.QUESTION_TYPE.SHORT_ANSWER) {
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
    return result;
});
const getAttemptById = (attemptId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield quiz_model_1.QuizAttempt.findById(attemptId)
        .populate('quiz', 'title totalMarks settings')
        .populate('student', 'name email profilePicture');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Attempt not found');
    }
    return result;
});
const getMyAttempts = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const attemptQuery = new QueryBuilder_1.default(quiz_model_1.QuizAttempt.find({ student: studentId })
        .populate('quiz', 'title totalMarks'), query)
        .filter()
        .sort()
        .paginate();
    const data = yield attemptQuery.modelQuery;
    const pagination = yield attemptQuery.getPaginationInfo();
    return { pagination, data };
});
exports.QuizService = {
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
