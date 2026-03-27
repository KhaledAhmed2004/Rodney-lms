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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizAttempt = exports.Quiz = void 0;
const mongoose_1 = require("mongoose");
const quiz_interface_1 = require("./quiz.interface");
// ==================== OPTION SUB-SCHEMA ====================
const OptionSchema = new mongoose_1.Schema({
    optionId: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true, default: false },
}, { _id: false });
// ==================== QUESTION SUB-SCHEMA ====================
const QuestionSchema = new mongoose_1.Schema({
    questionId: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(quiz_interface_1.QUESTION_TYPE),
        required: true,
    },
    text: { type: String, required: true },
    options: { type: [OptionSchema], default: [] },
    correctAnswer: { type: String },
    marks: { type: Number, required: true, default: 1 },
    explanation: { type: String },
    order: { type: Number, required: true, default: 0 },
}, { _id: false });
// ==================== SETTINGS SUB-SCHEMA ====================
const SettingsSchema = new mongoose_1.Schema({
    timeLimit: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 0 },
    passingScore: { type: Number, default: 60 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
}, { _id: false });
// ==================== QUIZ SCHEMA ====================
const quizSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
    },
    questions: { type: [QuestionSchema], default: [] },
    settings: {
        type: SettingsSchema,
        default: {},
    },
    totalMarks: { type: Number, default: 0 },
}, { timestamps: true });
quizSchema.statics.isExistById = function (id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.findById(id);
    });
};
exports.Quiz = (0, mongoose_1.model)('Quiz', quizSchema);
// ==================== STUDENT ANSWER SUB-SCHEMA ====================
const StudentAnswerSchema = new mongoose_1.Schema({
    questionId: { type: String, required: true },
    selectedOptionId: { type: String },
    textAnswer: { type: String },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
}, { _id: false });
// ==================== QUIZ ATTEMPT SCHEMA ====================
const quizAttemptSchema = new mongoose_1.Schema({
    quiz: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
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
    attemptNumber: { type: Number, default: 1 },
    status: {
        type: String,
        enum: Object.values(quiz_interface_1.ATTEMPT_STATUS),
        default: quiz_interface_1.ATTEMPT_STATUS.IN_PROGRESS,
    },
}, { timestamps: true });
quizAttemptSchema.index({ quiz: 1, student: 1 });
exports.QuizAttempt = (0, mongoose_1.model)('QuizAttempt', quizAttemptSchema);
