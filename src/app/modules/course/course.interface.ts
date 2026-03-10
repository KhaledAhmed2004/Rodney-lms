import { Model, Types } from 'mongoose';

export enum COURSE_STATUS {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  SCHEDULED = 'SCHEDULED',
}

export enum LESSON_TYPE {
  VIDEO = 'VIDEO',
  READING = 'READING',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum VIDEO_PROCESSING_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}


export type ICourseModule = {
  moduleId: string;
  title: string;
  order: number;
};

export type ILessonAttachment = {
  url: string;
  name: string;
  size?: number;
  mime?: string;
};

export type IVideoMeta = {
  url: string;
  duration?: number;
  size?: number;
  processingStatus: VIDEO_PROCESSING_STATUS;
  thumbnailUrl?: string;
};

export type ICourse = {
  title: string;
  slug: string;
  status: COURSE_STATUS;
  thumbnail?: string;
  publishScheduledAt?: Date;
  description?: string;
  modules: ICourseModule[];
  totalLessons: number;
  totalDuration: number;
  averageRating: number;
  ratingsCount: number;
  enrollmentCount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CourseModel = {
  isExistCourseById(id: string): Promise<ICourse | null>;
  isExistCourseBySlug(slug: string): Promise<ICourse | null>;
} & Model<ICourse>;

// ==================== LESSON ====================

export type ILesson = {
  courseId: Types.ObjectId;
  moduleId: string;
  title: string;
  type: LESSON_TYPE;
  description?: string;
  learningObjectives?: string[];
  order: number;
  isVisible: boolean;
  prerequisiteLesson?: Types.ObjectId;
  video?: IVideoMeta;
  contentFile?: ILessonAttachment;
  readingContent?: string;
  assignmentInstructions?: string;
  attachments: ILessonAttachment[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type LessonModel = {
  isExistLessonById(id: string): Promise<ILesson | null>;
} & Model<ILesson>;
