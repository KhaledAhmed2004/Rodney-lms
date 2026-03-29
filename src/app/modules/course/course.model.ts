import { model, Schema } from 'mongoose';
import {
  ICourse,
  CourseModel,
  ILesson,
  LessonModel,
  COURSE_STATUS,
  LESSON_TYPE,
  VIDEO_PROCESSING_STATUS,
} from './course.interface';

// ==================== MODULE SUB-SCHEMA (Embedded) ====================

const CourseModuleSchema = new Schema(
  {
    moduleId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// ==================== COURSE SCHEMA ====================

const courseSchema = new Schema<ICourse, CourseModel>(
  {
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
      enum: Object.values(COURSE_STATUS),
      default: COURSE_STATUS.DRAFT,
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
  },
  { timestamps: true }
);

// Indexes
courseSchema.index({ status: 1 });
courseSchema.index({ slug: 1 }, { unique: true });

// Statics
courseSchema.statics.isExistCourseById = async function (id: string) {
  return await this.findById(id);
};

courseSchema.statics.isExistCourseBySlug = async function (slug: string) {
  return await this.findOne({ slug });
};

export const Course = model<ICourse, CourseModel>('Course', courseSchema);

// ==================== ATTACHMENT SUB-SCHEMA ====================

const LessonAttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
    mime: { type: String },
  },
  { _id: false }
);

// ==================== VIDEO META SUB-SCHEMA ====================

const VideoMetaSchema = new Schema(
  {
    url: { type: String, required: true },
    duration: { type: Number },
    size: { type: Number },
    processingStatus: {
      type: String,
      enum: Object.values(VIDEO_PROCESSING_STATUS),
      default: VIDEO_PROCESSING_STATUS.PENDING,
    },
    thumbnailUrl: { type: String },
  },
  { _id: false }
);

// ==================== LESSON SCHEMA ====================

const lessonSchema = new Schema<ILesson, LessonModel>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
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
      enum: Object.values(LESSON_TYPE),
      required: true,
    },
    description: { type: String, maxlength: 10000 },
    learningObjectives: { type: [String], default: [] },
    order: { type: Number, required: true, default: 0 },
    isVisible: { type: Boolean, default: true },
    prerequisiteLesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    video: { type: VideoMetaSchema },
    contentFile: { type: LessonAttachmentSchema },
    readingContent: { type: String },
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    attachments: { type: [LessonAttachmentSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes
lessonSchema.index({ courseId: 1, moduleId: 1, order: 1 });
lessonSchema.index({ courseId: 1, type: 1 });
lessonSchema.index({ prerequisiteLesson: 1 });

// Statics
lessonSchema.statics.isExistLessonById = async function (id: string) {
  return await this.findById(id);
};

export const Lesson = model<ILesson, LessonModel>('Lesson', lessonSchema);
