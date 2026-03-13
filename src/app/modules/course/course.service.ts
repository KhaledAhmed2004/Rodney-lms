import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import crypto from 'crypto';
import slugify from 'slugify';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { deleteFile } from '../../middlewares/fileHandler';
import {
  ICourse,
  ILesson,
  COURSE_STATUS,
  LESSON_TYPE,
  VIDEO_PROCESSING_STATUS,
} from './course.interface';
import { Course, Lesson } from './course.model';

// ==================== HELPERS ====================

const generateUniqueSlug = async (title: string): Promise<string> => {
  let slug = slugify(title, { lower: true, strict: true });
  let existing = await Course.isExistCourseBySlug(slug);
  let counter = 1;
  while (existing) {
    slug = `${slugify(title, { lower: true, strict: true })}-${counter}`;
    existing = await Course.isExistCourseBySlug(slug);
    counter++;
  }
  return slug;
};

const findCourseOrThrow = async (courseId: string) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course not found');
  }
  return course;
};

const hasCircularPrerequisite = async (
  lessonId: string,
  prerequisiteId: string,
  courseId: string
): Promise<boolean> => {
  const visited = new Set<string>();
  let currentId: string | undefined = prerequisiteId;

  while (currentId) {
    if (currentId === lessonId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const lesson: { prerequisiteLesson?: Types.ObjectId } | null =
      await Lesson.findOne({
        _id: currentId,
        courseId,
      }).select('prerequisiteLesson');

    currentId = lesson?.prerequisiteLesson?.toString();
  }

  return false;
};

const buildAttachments = (attachmentUrls: string | string[] | undefined) => {
  if (!attachmentUrls) return [];
  const urls = Array.isArray(attachmentUrls) ? attachmentUrls : [attachmentUrls];
  return urls.map((url) => ({
    url,
    name: url.split('/').pop() || 'file',
  }));
};

// ==================== COURSE SERVICES ====================

const createCourse = async (payload: Partial<ICourse>): Promise<ICourse> => {
  const slug = await generateUniqueSlug(payload.title!);

  if (
    payload.status === COURSE_STATUS.SCHEDULED &&
    payload.publishScheduledAt
  ) {
    if (new Date(payload.publishScheduledAt) <= new Date()) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Scheduled publish date must be in the future'
      );
    }
  }

  const result = await Course.create({ ...payload, slug });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create course');
  }
  return result;
};

const getAllCourses = async (query: Record<string, unknown>) => {
  const courseQuery = new QueryBuilder(
    Course.find({ status: COURSE_STATUS.PUBLISHED }).select(
      'title thumbnail description totalLessons averageRating enrollmentCount'
    ),
    query
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await courseQuery.modelQuery;
  const pagination = await courseQuery.getPaginationInfo();
  return { pagination, data };
};

const getAdminCourses = async (query: Record<string, unknown>) => {
  const courseQuery = new QueryBuilder(Course.find().select('-modules'), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await courseQuery.modelQuery;
  const pagination = await courseQuery.getPaginationInfo();
  return { pagination, data };
};

const getCourseByIdentifier = async (identifier: string) => {
  const isObjectId = Types.ObjectId.isValid(identifier);
  const course = isObjectId
    ? await Course.findById(identifier)
    : await Course.findOne({ slug: identifier });

  if (!course) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Course not found');
  }

  // Fetch all lessons grouped by module
  const lessons = await Lesson.find({ courseId: course._id })
    .sort({ order: 1 })
    .populate('prerequisiteLesson', 'title');

  // Group lessons by moduleId
  const lessonsByModule: Record<string, ILesson[]> = {};
  for (const lesson of lessons) {
    const mid = lesson.moduleId;
    if (!lessonsByModule[mid]) lessonsByModule[mid] = [];
    lessonsByModule[mid].push(lesson);
  }

  // Build curriculum response
  const curriculum = course.modules
    .sort((a, b) => a.order - b.order)
    .map((mod) => ({
      moduleId: mod.moduleId,
      title: mod.title,
      order: mod.order,
      lessons: lessonsByModule[mod.moduleId] || [],
    }));

  return { ...course.toObject(), curriculum };
};

const updateCourse = async (
  courseId: string,
  payload: Partial<ICourse>
) => {
  const course = await findCourseOrThrow(courseId);

  // Regenerate slug if title changed
  if (payload.title && payload.title !== course.title) {
    payload.slug = await generateUniqueSlug(payload.title);
  }

  // Delete old thumbnail if new one provided
  if (payload.thumbnail && course.thumbnail) {
    deleteFile(course.thumbnail).catch(() => {});
  }

  // Validate before publishing
  if (payload.status === COURSE_STATUS.PUBLISHED) {
    if (course.modules.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot publish a course without modules'
      );
    }
    const visibleLessons = await Lesson.countDocuments({
      courseId,
      isVisible: true,
    });
    if (visibleLessons === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot publish a course without at least one visible lesson'
      );
    }
  }

  const result = await Course.findByIdAndUpdate(courseId, payload, {
    new: true,
  });
  return result;
};

const deleteCourse = async (courseId: string) => {
  await findCourseOrThrow(courseId);

  // Delete all lessons
  const lessons = await Lesson.find({ courseId });
  for (const lesson of lessons) {
    if (lesson.video?.url) deleteFile(lesson.video.url).catch(() => {});
    if (lesson.contentFile?.url) deleteFile(lesson.contentFile.url).catch(() => {});
    for (const att of lesson.attachments) {
      deleteFile(att.url).catch(() => {});
    }
  }
  await Lesson.deleteMany({ courseId });

  // Delete course thumbnail
  const course = await Course.findById(courseId);
  if (course?.thumbnail) deleteFile(course.thumbnail).catch(() => {});

  await Course.findByIdAndDelete(courseId);
};

// ==================== MODULE SERVICES ====================

const addModule = async (
  courseId: string,
  payload: { title: string }
) => {
  const course = await findCourseOrThrow(courseId);

  const newModule = {
    moduleId: crypto.randomUUID(),
    title: payload.title,
    order: course.modules.length,
  };

  await Course.findByIdAndUpdate(courseId, {
    $push: { modules: newModule },
  });
  return newModule;
};

const updateModule = async (
  courseId: string,
  moduleId: string,
  payload: { title?: string }
) => {
  await findCourseOrThrow(courseId);

  const updateFields: Record<string, unknown> = {};
  if (payload.title) updateFields['modules.$.title'] = payload.title;

  const result = await Course.findOneAndUpdate(
    { _id: courseId, 'modules.moduleId': moduleId },
    { $set: updateFields },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Module not found');
  }
  return result.modules.find((m) => m.moduleId === moduleId);
};

const reorderModules = async (
  courseId: string,
  moduleOrder: string[]
) => {
  const course = await findCourseOrThrow(courseId);

  const moduleMap = new Map(
    course.modules.map((m) => [m.moduleId, m])
  );

  // Validate all moduleIds exist
  for (const id of moduleOrder) {
    if (!moduleMap.has(id)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Module ${id} not found`);
    }
  }

  // Rebuild modules with new order
  const reordered = moduleOrder.map((id, index) => ({
    ...moduleMap.get(id)!,
    order: index,
  }));

  await Course.findByIdAndUpdate(courseId, {
    $set: { modules: reordered },
  });
  return reordered;
};

const deleteModule = async (
  courseId: string,
  moduleId: string
) => {
  await findCourseOrThrow(courseId);

  // Delete all lessons in this module
  const lessons = await Lesson.find({ courseId, moduleId });
  for (const lesson of lessons) {
    if (lesson.video?.url) deleteFile(lesson.video.url).catch(() => {});
    if (lesson.contentFile?.url) deleteFile(lesson.contentFile.url).catch(() => {});
    for (const att of lesson.attachments) {
      deleteFile(att.url).catch(() => {});
    }
  }
  const deletedCount = await Lesson.deleteMany({ courseId, moduleId });

  // Remove module from course and update totalLessons
  await Course.findByIdAndUpdate(courseId, {
    $pull: { modules: { moduleId } },
    $inc: { totalLessons: -(deletedCount.deletedCount || 0) },
  });
};

// ==================== LESSON SERVICES ====================

const createLesson = async (
  courseId: string,
  moduleId: string,
  payload: Partial<ILesson> & { contentFile?: string; attachments?: string | string[] }
) => {
  const course = await findCourseOrThrow(courseId);

  // Verify module exists
  const moduleExists = course.modules.some((m) => m.moduleId === moduleId);
  if (!moduleExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Module not found in this course');
  }

  // Validate prerequisite
  if (payload.prerequisiteLesson) {
    const prereq = await Lesson.findOne({
      _id: payload.prerequisiteLesson,
      courseId,
    });
    if (!prereq) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Prerequisite lesson not found in this course'
      );
    }
  }

  // Calculate order
  const maxOrderLesson = await Lesson.findOne({ courseId, moduleId })
    .sort({ order: -1 })
    .select('order');
  const order = maxOrderLesson ? maxOrderLesson.order + 1 : 0;

  // Build main content file based on lesson type
  let videoMeta;
  let contentFile;
  if (payload.contentFile) {
    if (payload.type === LESSON_TYPE.VIDEO) {
      videoMeta = {
        url: payload.contentFile,
        processingStatus: VIDEO_PROCESSING_STATUS.COMPLETED,
      };
    } else {
      contentFile = {
        url: payload.contentFile,
        name: payload.contentFile.split('/').pop() || 'file',
      };
    }
  }

  // Build attachments
  const attachments = buildAttachments(payload.attachments);

  const lessonData = {
    courseId,
    moduleId,
    title: payload.title,
    type: payload.type,
    description: payload.description,
    learningObjectives: payload.learningObjectives || [],
    order,
    isVisible: payload.isVisible ?? true,
    prerequisiteLesson: payload.prerequisiteLesson,
    video: videoMeta,
    contentFile,
    readingContent: payload.readingContent,
    assignmentInstructions: payload.assignmentInstructions,
    attachments,
  };

  const lesson = await Lesson.create(lessonData);

  // Update course totalLessons
  await Course.findByIdAndUpdate(courseId, { $inc: { totalLessons: 1 } });

  return lesson;
};

const getLessonsByModule = async (
  courseId: string,
  moduleId: string,
  query: Record<string, unknown>
) => {
  const lessonQuery = new QueryBuilder(
    Lesson.find({ courseId, moduleId }),
    query
  )
    .sort()
    .paginate()
    .fields();

  lessonQuery.modelQuery = lessonQuery.modelQuery.populate(
    'prerequisiteLesson',
    'title'
  );

  const data = await lessonQuery.modelQuery;
  const pagination = await lessonQuery.getPaginationInfo();
  return { pagination, data };
};

const getLessonById = async (courseId: string, lessonId: string) => {
  const lesson = await Lesson.findOne({ _id: lessonId, courseId }).populate(
    'prerequisiteLesson',
    'title'
  );
  if (!lesson) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lesson not found');
  }
  return lesson;
};

const updateLesson = async (
  courseId: string,
  moduleId: string,
  lessonId: string,
  payload: Partial<ILesson> & { contentFile?: string; attachments?: string | string[] }
) => {
  await findCourseOrThrow(courseId);

  const lesson = await Lesson.findOne({ _id: lessonId, courseId, moduleId });
  if (!lesson) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lesson not found');
  }

  // Check circular prerequisite
  if (payload.prerequisiteLesson) {
    const isCircular = await hasCircularPrerequisite(
      lessonId,
      payload.prerequisiteLesson.toString(),
      courseId
    );
    if (isCircular) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Circular prerequisite detected'
      );
    }

    // Verify prerequisite exists in same course
    const prereq = await Lesson.findOne({
      _id: payload.prerequisiteLesson,
      courseId,
    });
    if (!prereq) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Prerequisite lesson not found in this course'
      );
    }
  }

  // Handle null prerequisite (remove)
  if (payload.prerequisiteLesson === null) {
    payload.prerequisiteLesson = undefined;
  }

  const updateData: Record<string, unknown> = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.type !== undefined) updateData.type = payload.type;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.learningObjectives !== undefined) updateData.learningObjectives = payload.learningObjectives;
  if (payload.isVisible !== undefined) updateData.isVisible = payload.isVisible;
  if (payload.prerequisiteLesson !== undefined) updateData.prerequisiteLesson = payload.prerequisiteLesson || null;
  if (payload.readingContent !== undefined) updateData.readingContent = payload.readingContent;
  if (payload.assignmentInstructions !== undefined) updateData.assignmentInstructions = payload.assignmentInstructions;

  // Handle contentFile replacement based on lesson type
  if (payload.contentFile) {
    const effectiveType = payload.type || lesson.type;

    // Delete old main content file
    if (lesson.video?.url) deleteFile(lesson.video.url).catch(() => {});
    if (lesson.contentFile?.url) deleteFile(lesson.contentFile.url).catch(() => {});

    if (effectiveType === LESSON_TYPE.VIDEO) {
      updateData.video = {
        url: payload.contentFile,
        processingStatus: VIDEO_PROCESSING_STATUS.COMPLETED,
      };
      updateData.contentFile = null;
    } else {
      updateData.contentFile = {
        url: payload.contentFile,
        name: payload.contentFile.split('/').pop() || 'file',
      };
      updateData.video = null;
    }
  }
  // Type change WITHOUT new file: keep existing data — frontend handles display

  // Update attachments
  if (payload.attachments) {
    updateData.attachments = buildAttachments(payload.attachments);
  }

  const result = await Lesson.findByIdAndUpdate(lessonId, updateData, {
    new: true,
  });
  return result;
};

const deleteLesson = async (
  courseId: string,
  moduleId: string,
  lessonId: string
) => {
  await findCourseOrThrow(courseId);

  const lesson = await Lesson.findOne({ _id: lessonId, courseId, moduleId });
  if (!lesson) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lesson not found');
  }

  // Check if other lessons depend on this as prerequisite
  const dependent = await Lesson.findOne({ prerequisiteLesson: lessonId });
  if (dependent) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot delete: lesson "${dependent.title}" depends on this as a prerequisite`
    );
  }

  // Delete files
  if (lesson.video?.url) deleteFile(lesson.video.url).catch(() => {});
  if (lesson.contentFile?.url) deleteFile(lesson.contentFile.url).catch(() => {});
  for (const att of lesson.attachments) {
    deleteFile(att.url).catch(() => {});
  }

  await Lesson.findByIdAndDelete(lessonId);

  // Update denormalized counts
  const incFields: Record<string, number> = { totalLessons: -1 };
  if (lesson.video?.duration) {
    incFields.totalDuration = -(lesson.video.duration);
  }
  await Course.findByIdAndUpdate(courseId, { $inc: incFields });
};

const toggleLessonVisibility = async (
  courseId: string,
  lessonId: string
) => {
  await findCourseOrThrow(courseId);

  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lesson not found');
  }

  const result = await Lesson.findByIdAndUpdate(
    lessonId,
    { isVisible: !lesson.isVisible },
    { new: true }
  );
  return result;
};

const reorderLessons = async (
  courseId: string,
  moduleId: string,
  lessonOrder: string[]
) => {
  await findCourseOrThrow(courseId);

  // Validate all lessonIds belong to this module
  const lessons = await Lesson.find({ courseId, moduleId }).select('_id');
  const lessonIds = new Set(lessons.map((l) => l._id.toString()));

  for (const id of lessonOrder) {
    if (!lessonIds.has(id)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Lesson ${id} not found in this module`
      );
    }
  }

  // Bulk update order
  const bulkOps = lessonOrder.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order: index } },
    },
  }));

  await Lesson.bulkWrite(bulkOps);

  return Lesson.find({ courseId, moduleId }).sort({ order: 1 });
};

export const CourseService = {
  createCourse,
  getAllCourses,
  getAdminCourses,
  getCourseByIdentifier,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  reorderModules,
  deleteModule,
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
  toggleLessonVisibility,
  reorderLessons,
};
