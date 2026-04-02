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
exports.Lesson = exports.Course = void 0;
const mongoose_1 = require("mongoose");
const course_interface_1 = require("./course.interface");
// ==================== MODULE SUB-SCHEMA (Embedded) ====================
const CourseModuleSchema = new mongoose_1.Schema({
    moduleId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
}, { _id: false });
// ==================== COURSE SCHEMA ====================
const courseSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(course_interface_1.COURSE_STATUS),
        default: course_interface_1.COURSE_STATUS.DRAFT,
    },
    thumbnail: { type: String },
    publishScheduledAt: { type: Date },
    description: { type: String, maxlength: 5000 },
    modules: { type: [CourseModuleSchema], default: [] },
    totalLessons: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    enrollmentCount: { type: Number, default: 0 },
}, { timestamps: true });
// Indexes
courseSchema.index({ status: 1 });
courseSchema.index({ slug: 1 }, { unique: true });
// Statics
courseSchema.statics.isExistCourseById = function (id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.findById(id);
    });
};
courseSchema.statics.isExistCourseBySlug = function (slug) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.findOne({ slug });
    });
};
exports.Course = (0, mongoose_1.model)('Course', courseSchema);
// ==================== ATTACHMENT SUB-SCHEMA ====================
const LessonAttachmentSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
    mime: { type: String },
}, { _id: false });
// ==================== VIDEO META SUB-SCHEMA ====================
const VideoMetaSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    duration: { type: Number },
    size: { type: Number },
    processingStatus: {
        type: String,
        enum: Object.values(course_interface_1.VIDEO_PROCESSING_STATUS),
        default: course_interface_1.VIDEO_PROCESSING_STATUS.PENDING,
    },
    thumbnailUrl: { type: String },
}, { _id: false });
// ==================== LESSON SCHEMA ====================
const lessonSchema = new mongoose_1.Schema({
    courseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    moduleId: { type: String, required: true },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
    },
    type: {
        type: String,
        enum: Object.values(course_interface_1.LESSON_TYPE),
        required: true,
    },
    description: { type: String, maxlength: 10000 },
    learningObjectives: { type: [String], default: [] },
    order: { type: Number, required: true, default: 0 },
    isVisible: { type: Boolean, default: true },
    prerequisiteLesson: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lesson',
    },
    video: { type: VideoMetaSchema },
    contentFile: { type: LessonAttachmentSchema },
    readingContent: { type: String },
    quiz: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Quiz',
    },
    attachments: { type: [LessonAttachmentSchema], default: [] },
}, { timestamps: true });
// Indexes
lessonSchema.index({ courseId: 1, moduleId: 1, order: 1 });
lessonSchema.index({ courseId: 1, type: 1 });
lessonSchema.index({ prerequisiteLesson: 1 });
// Statics
lessonSchema.statics.isExistLessonById = function (id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.findById(id);
    });
};
exports.Lesson = (0, mongoose_1.model)('Lesson', lessonSchema);
