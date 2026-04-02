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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const crypto_1 = __importDefault(require("crypto"));
const slugify_1 = __importDefault(require("slugify"));
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const course_interface_1 = require("./course.interface");
const course_model_1 = require("./course.model");
// ==================== HELPERS ====================
const generateUniqueSlug = (title) => __awaiter(void 0, void 0, void 0, function* () {
    let slug = (0, slugify_1.default)(title, { lower: true, strict: true });
    let existing = yield course_model_1.Course.isExistCourseBySlug(slug);
    let counter = 1;
    while (existing) {
        slug = `${(0, slugify_1.default)(title, { lower: true, strict: true })}-${counter}`;
        existing = yield course_model_1.Course.isExistCourseBySlug(slug);
        counter++;
    }
    return slug;
});
const findCourseOrThrow = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const course = yield course_model_1.Course.findById(courseId);
    if (!course) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
    }
    return course;
});
const hasCircularPrerequisite = (lessonId, prerequisiteId, courseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const visited = new Set();
    let currentId = prerequisiteId;
    while (currentId) {
        if (currentId === lessonId)
            return true;
        if (visited.has(currentId))
            return false;
        visited.add(currentId);
        const lesson = yield course_model_1.Lesson.findOne({
            _id: currentId,
            courseId,
        }).select('prerequisiteLesson');
        currentId = (_a = lesson === null || lesson === void 0 ? void 0 : lesson.prerequisiteLesson) === null || _a === void 0 ? void 0 : _a.toString();
    }
    return false;
});
const buildAttachments = (attachmentUrls) => {
    if (!attachmentUrls)
        return [];
    const urls = Array.isArray(attachmentUrls) ? attachmentUrls : [attachmentUrls];
    return urls.map((url) => ({
        url,
        name: url.split('/').pop() || 'file',
    }));
};
// ==================== COURSE SERVICES ====================
const createCourse = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const slug = yield generateUniqueSlug(payload.title);
    if (payload.status === course_interface_1.COURSE_STATUS.SCHEDULED &&
        payload.publishScheduledAt) {
        if (new Date(payload.publishScheduledAt) <= new Date()) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Scheduled publish date must be in the future');
        }
    }
    const result = yield course_model_1.Course.create(Object.assign(Object.assign({}, payload), { slug }));
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create course');
    }
    return result;
});
const getAllCourses = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const courseQuery = new QueryBuilder_1.default(course_model_1.Course.find({ status: course_interface_1.COURSE_STATUS.PUBLISHED }).select('title thumbnail description totalLessons averageRating enrollmentCount'), query)
        .search(['title', 'description'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield courseQuery.modelQuery;
    const pagination = yield courseQuery.getPaginationInfo();
    return { pagination, data };
});
const getAdminCourses = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const courseQuery = new QueryBuilder_1.default(course_model_1.Course.find().select('-modules'), query)
        .search(['title', 'description'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield courseQuery.modelQuery;
    const pagination = yield courseQuery.getPaginationInfo();
    return { pagination, data };
});
const getCourseByIdentifier = (identifier) => __awaiter(void 0, void 0, void 0, function* () {
    const isObjectId = mongoose_1.Types.ObjectId.isValid(identifier);
    const course = isObjectId
        ? yield course_model_1.Course.findById(identifier)
        : yield course_model_1.Course.findOne({ slug: identifier });
    if (!course) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
    }
    // Fetch all lessons grouped by module
    const lessons = yield course_model_1.Lesson.find({ courseId: course._id })
        .sort({ order: 1 })
        .populate('prerequisiteLesson', 'title');
    // Group lessons by moduleId
    const lessonsByModule = {};
    for (const lesson of lessons) {
        const mid = lesson.moduleId;
        if (!lessonsByModule[mid])
            lessonsByModule[mid] = [];
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
    return Object.assign(Object.assign({}, course.toObject()), { curriculum });
});
const updateCourse = (courseId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const course = yield findCourseOrThrow(courseId);
    // Regenerate slug if title changed
    if (payload.title && payload.title !== course.title) {
        payload.slug = yield generateUniqueSlug(payload.title);
    }
    // Delete old thumbnail if new one provided
    if (payload.thumbnail && course.thumbnail) {
        (0, fileHandler_1.deleteFile)(course.thumbnail).catch(() => { });
    }
    // Validate before publishing
    if (payload.status === course_interface_1.COURSE_STATUS.PUBLISHED) {
        if (course.modules.length === 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot publish a course without modules');
        }
        const visibleLessons = yield course_model_1.Lesson.countDocuments({
            courseId,
            isVisible: true,
        });
        if (visibleLessons === 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot publish a course without at least one visible lesson');
        }
    }
    const result = yield course_model_1.Course.findByIdAndUpdate(courseId, payload, {
        new: true,
    });
    return result;
});
const deleteCourse = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    yield findCourseOrThrow(courseId);
    // Delete all lessons
    const lessons = yield course_model_1.Lesson.find({ courseId });
    for (const lesson of lessons) {
        if ((_a = lesson.video) === null || _a === void 0 ? void 0 : _a.url)
            (0, fileHandler_1.deleteFile)(lesson.video.url).catch(() => { });
        if ((_b = lesson.contentFile) === null || _b === void 0 ? void 0 : _b.url)
            (0, fileHandler_1.deleteFile)(lesson.contentFile.url).catch(() => { });
        for (const att of lesson.attachments) {
            (0, fileHandler_1.deleteFile)(att.url).catch(() => { });
        }
    }
    yield course_model_1.Lesson.deleteMany({ courseId });
    // Delete course thumbnail
    const course = yield course_model_1.Course.findById(courseId);
    if (course === null || course === void 0 ? void 0 : course.thumbnail)
        (0, fileHandler_1.deleteFile)(course.thumbnail).catch(() => { });
    yield course_model_1.Course.findByIdAndDelete(courseId);
});
// ==================== MODULE SERVICES ====================
const addModule = (courseId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const course = yield findCourseOrThrow(courseId);
    const newModule = {
        moduleId: crypto_1.default.randomUUID(),
        title: payload.title,
        order: course.modules.length,
    };
    yield course_model_1.Course.findByIdAndUpdate(courseId, {
        $push: { modules: newModule },
    });
    return newModule;
});
const updateModule = (courseId, moduleId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    yield findCourseOrThrow(courseId);
    const updateFields = {};
    if (payload.title)
        updateFields['modules.$.title'] = payload.title;
    const result = yield course_model_1.Course.findOneAndUpdate({ _id: courseId, 'modules.moduleId': moduleId }, { $set: updateFields }, { new: true });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Module not found');
    }
    return result.modules.find((m) => m.moduleId === moduleId);
});
const reorderModules = (courseId, moduleOrder) => __awaiter(void 0, void 0, void 0, function* () {
    const course = yield findCourseOrThrow(courseId);
    const moduleMap = new Map(course.modules.map((m) => [
        m.moduleId,
        typeof m.toObject === 'function' ? m.toObject() : Object.assign({}, m),
    ]));
    // Validate all moduleIds exist
    for (const id of moduleOrder) {
        if (!moduleMap.has(id)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Module ${id} not found`);
        }
    }
    // Rebuild modules with new order
    const reordered = moduleOrder.map((id, index) => (Object.assign(Object.assign({}, moduleMap.get(id)), { order: index })));
    yield course_model_1.Course.findByIdAndUpdate(courseId, {
        $set: { modules: reordered },
    });
    return reordered;
});
const deleteModule = (courseId, moduleId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    yield findCourseOrThrow(courseId);
    // Delete all lessons in this module
    const lessons = yield course_model_1.Lesson.find({ courseId, moduleId });
    for (const lesson of lessons) {
        if ((_a = lesson.video) === null || _a === void 0 ? void 0 : _a.url)
            (0, fileHandler_1.deleteFile)(lesson.video.url).catch(() => { });
        if ((_b = lesson.contentFile) === null || _b === void 0 ? void 0 : _b.url)
            (0, fileHandler_1.deleteFile)(lesson.contentFile.url).catch(() => { });
        for (const att of lesson.attachments) {
            (0, fileHandler_1.deleteFile)(att.url).catch(() => { });
        }
    }
    const deletedCount = yield course_model_1.Lesson.deleteMany({ courseId, moduleId });
    // Remove module from course and update totalLessons
    yield course_model_1.Course.findByIdAndUpdate(courseId, {
        $pull: { modules: { moduleId } },
        $inc: { totalLessons: -(deletedCount.deletedCount || 0) },
    });
});
// ==================== LESSON SERVICES ====================
const createLesson = (courseId, moduleId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const course = yield findCourseOrThrow(courseId);
    // Verify module exists
    const moduleExists = course.modules.some((m) => m.moduleId === moduleId);
    if (!moduleExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Module not found in this course');
    }
    // Validate prerequisite
    if (payload.prerequisiteLesson) {
        const prereq = yield course_model_1.Lesson.findOne({
            _id: payload.prerequisiteLesson,
            courseId,
        });
        if (!prereq) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Prerequisite lesson not found in this course');
        }
    }
    // Calculate order
    const maxOrderLesson = yield course_model_1.Lesson.findOne({ courseId, moduleId })
        .sort({ order: -1 })
        .select('order');
    const order = maxOrderLesson ? maxOrderLesson.order + 1 : 0;
    // Build main content file based on lesson type
    let videoMeta;
    let contentFile;
    if (payload.contentFile) {
        if (payload.type === course_interface_1.LESSON_TYPE.VIDEO) {
            videoMeta = {
                url: payload.contentFile,
                processingStatus: course_interface_1.VIDEO_PROCESSING_STATUS.COMPLETED,
            };
        }
        else {
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
        isVisible: (_a = payload.isVisible) !== null && _a !== void 0 ? _a : true,
        prerequisiteLesson: payload.prerequisiteLesson,
        video: videoMeta,
        contentFile,
        readingContent: payload.readingContent,
        quiz: payload.quiz,
        attachments,
    };
    const lesson = yield course_model_1.Lesson.create(lessonData);
    // Update course totalLessons
    yield course_model_1.Course.findByIdAndUpdate(courseId, { $inc: { totalLessons: 1 } });
    return lesson;
});
const getLessonsByModule = (courseId, moduleId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const lessonQuery = new QueryBuilder_1.default(course_model_1.Lesson.find({ courseId, moduleId }), query)
        .sort()
        .paginate()
        .fields();
    lessonQuery.modelQuery = lessonQuery.modelQuery.populate('prerequisiteLesson', 'title');
    const data = yield lessonQuery.modelQuery;
    const pagination = yield lessonQuery.getPaginationInfo();
    return { pagination, data };
});
const getLessonById = (courseId, lessonId) => __awaiter(void 0, void 0, void 0, function* () {
    const lesson = yield course_model_1.Lesson.findOne({ _id: lessonId, courseId, isVisible: true })
        .select('-order -isVisible -moduleId -courseId -__v -createdAt -updatedAt')
        .populate('prerequisiteLesson', 'title');
    if (!lesson) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Lesson not found');
    }
    // Strip processingStatus from video (admin concern)
    const lessonObj = lesson.toObject();
    if (lessonObj.video) {
        delete lessonObj.video.processingStatus;
    }
    return lessonObj;
});
const updateLesson = (courseId, moduleId, lessonId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    yield findCourseOrThrow(courseId);
    const lesson = yield course_model_1.Lesson.findOne({ _id: lessonId, courseId, moduleId });
    if (!lesson) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Lesson not found');
    }
    // Check circular prerequisite
    if (payload.prerequisiteLesson) {
        const isCircular = yield hasCircularPrerequisite(lessonId, payload.prerequisiteLesson.toString(), courseId);
        if (isCircular) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Circular prerequisite detected');
        }
        // Verify prerequisite exists in same course
        const prereq = yield course_model_1.Lesson.findOne({
            _id: payload.prerequisiteLesson,
            courseId,
        });
        if (!prereq) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Prerequisite lesson not found in this course');
        }
    }
    // Handle null prerequisite (remove)
    if (payload.prerequisiteLesson === null) {
        payload.prerequisiteLesson = undefined;
    }
    const updateData = {};
    if (payload.title !== undefined)
        updateData.title = payload.title;
    if (payload.type !== undefined)
        updateData.type = payload.type;
    if (payload.description !== undefined)
        updateData.description = payload.description;
    if (payload.learningObjectives !== undefined)
        updateData.learningObjectives = payload.learningObjectives;
    if (payload.isVisible !== undefined)
        updateData.isVisible = payload.isVisible;
    if (payload.prerequisiteLesson !== undefined)
        updateData.prerequisiteLesson = payload.prerequisiteLesson || null;
    if (payload.readingContent !== undefined)
        updateData.readingContent = payload.readingContent;
    if (payload.quiz !== undefined)
        updateData.quiz = payload.quiz;
    // Handle contentFile replacement based on lesson type
    if (payload.contentFile) {
        const effectiveType = payload.type || lesson.type;
        // Delete old main content file
        if ((_a = lesson.video) === null || _a === void 0 ? void 0 : _a.url)
            (0, fileHandler_1.deleteFile)(lesson.video.url).catch(() => { });
        if ((_b = lesson.contentFile) === null || _b === void 0 ? void 0 : _b.url)
            (0, fileHandler_1.deleteFile)(lesson.contentFile.url).catch(() => { });
        if (effectiveType === course_interface_1.LESSON_TYPE.VIDEO) {
            updateData.video = {
                url: payload.contentFile,
                processingStatus: course_interface_1.VIDEO_PROCESSING_STATUS.COMPLETED,
            };
            updateData.contentFile = null;
        }
        else {
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
    const result = yield course_model_1.Lesson.findByIdAndUpdate(lessonId, updateData, {
        new: true,
    });
    return result;
});
const deleteLesson = (courseId, moduleId, lessonId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    yield findCourseOrThrow(courseId);
    const lesson = yield course_model_1.Lesson.findOne({ _id: lessonId, courseId, moduleId });
    if (!lesson) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Lesson not found');
    }
    // Check if other lessons depend on this as prerequisite
    const dependent = yield course_model_1.Lesson.findOne({ prerequisiteLesson: lessonId });
    if (dependent) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot delete: lesson "${dependent.title}" depends on this as a prerequisite`);
    }
    // Delete files
    if ((_a = lesson.video) === null || _a === void 0 ? void 0 : _a.url)
        (0, fileHandler_1.deleteFile)(lesson.video.url).catch(() => { });
    if ((_b = lesson.contentFile) === null || _b === void 0 ? void 0 : _b.url)
        (0, fileHandler_1.deleteFile)(lesson.contentFile.url).catch(() => { });
    for (const att of lesson.attachments) {
        (0, fileHandler_1.deleteFile)(att.url).catch(() => { });
    }
    yield course_model_1.Lesson.findByIdAndDelete(lessonId);
    // Update denormalized counts
    const incFields = { totalLessons: -1 };
    if ((_c = lesson.video) === null || _c === void 0 ? void 0 : _c.duration) {
        incFields.totalDuration = -(lesson.video.duration);
    }
    yield course_model_1.Course.findByIdAndUpdate(courseId, { $inc: incFields });
});
const toggleLessonVisibility = (courseId, lessonId) => __awaiter(void 0, void 0, void 0, function* () {
    yield findCourseOrThrow(courseId);
    const lesson = yield course_model_1.Lesson.findOne({ _id: lessonId, courseId });
    if (!lesson) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Lesson not found');
    }
    const result = yield course_model_1.Lesson.findByIdAndUpdate(lessonId, { isVisible: !lesson.isVisible }, { new: true });
    return result;
});
const reorderLessons = (courseId, moduleId, lessonOrder) => __awaiter(void 0, void 0, void 0, function* () {
    yield findCourseOrThrow(courseId);
    // Validate all lessonIds belong to this module
    const lessons = yield course_model_1.Lesson.find({ courseId, moduleId }).select('_id');
    const lessonIds = new Set(lessons.map((l) => l._id.toString()));
    for (const id of lessonOrder) {
        if (!lessonIds.has(id)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Lesson ${id} not found in this module`);
        }
    }
    // Bulk update order
    const bulkOps = lessonOrder.map((id, index) => ({
        updateOne: {
            filter: { _id: id },
            update: { $set: { order: index } },
        },
    }));
    yield course_model_1.Lesson.bulkWrite(bulkOps);
    return course_model_1.Lesson.find({ courseId, moduleId }).sort({ order: 1 });
});
const getStudentCourseDetail = (identifier, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Round 1: Fetch course (only PUBLISHED)
    const isObjectId = mongoose_1.Types.ObjectId.isValid(identifier);
    const courseFilter = Object.assign(Object.assign({}, (isObjectId ? { _id: identifier } : { slug: identifier })), { status: course_interface_1.COURSE_STATUS.PUBLISHED });
    const course = yield course_model_1.Course.findOne(courseFilter)
        .select('title slug thumbnail description modules totalLessons totalDuration averageRating ratingsCount enrollmentCount')
        .lean();
    if (!course) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Course not found');
    }
    // Round 2: Visible lessons + enrollment in parallel
    const [lessons, enrollment] = yield Promise.all([
        course_model_1.Lesson.find({ courseId: course._id, isVisible: true })
            .select('title type order moduleId video.duration')
            .sort({ order: 1 })
            .lean(),
        enrollment_model_1.Enrollment.findOne({
            course: course._id,
            student: new mongoose_1.Types.ObjectId(studentId),
        })
            .select('status progress.completionPercentage progress.completedLessons progress.lastAccessedLesson enrolledAt')
            .lean(),
    ]);
    // Group lessons by module → build curriculum
    const lessonsByModule = {};
    for (const lesson of lessons) {
        const mid = lesson.moduleId;
        if (!lessonsByModule[mid])
            lessonsByModule[mid] = [];
        lessonsByModule[mid].push({
            _id: String(lesson._id),
            title: lesson.title,
            type: lesson.type,
            order: lesson.order,
            duration: (_b = (_a = lesson.video) === null || _a === void 0 ? void 0 : _a.duration) !== null && _b !== void 0 ? _b : null,
        });
    }
    const curriculum = course.modules
        .sort((a, b) => a.order - b.order)
        .map((mod) => ({
        moduleId: mod.moduleId,
        title: mod.title,
        order: mod.order,
        lessons: lessonsByModule[mod.moduleId] || [],
    }));
    // Shape enrollment
    const enrollmentData = enrollment
        ? {
            status: enrollment.status,
            completionPercentage: enrollment.progress.completionPercentage,
            completedLessons: enrollment.progress.completedLessons.map(String),
            lastAccessedLesson: enrollment.progress.lastAccessedLesson
                ? String(enrollment.progress.lastAccessedLesson)
                : null,
            enrolledAt: enrollment.enrolledAt,
        }
        : null;
    const { modules: _modules } = course, courseData = __rest(course, ["modules"]);
    return Object.assign(Object.assign({}, courseData), { curriculum, enrollment: enrollmentData });
});
const browseCourses = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 10), 100);
    const skip = (page - 1) * limit;
    const matchConditions = {
        status: course_interface_1.COURSE_STATUS.PUBLISHED,
    };
    if (query.searchTerm) {
        const sanitized = (0, escape_string_regexp_1.default)(String(query.searchTerm));
        matchConditions.$or = [
            { title: { $regex: sanitized, $options: 'i' } },
            { description: { $regex: sanitized, $options: 'i' } },
        ];
    }
    const pipeline = [
        { $match: matchConditions },
        {
            $lookup: {
                from: 'enrollments',
                let: { courseId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$course', '$$courseId'] },
                                    { $eq: ['$student', new mongoose_1.Types.ObjectId(studentId)] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                    {
                        $project: {
                            status: 1,
                            completionPercentage: '$progress.completionPercentage',
                            _id: 0,
                        },
                    },
                ],
                as: 'enrollmentData',
            },
        },
        {
            $addFields: {
                enrollment: {
                    $cond: {
                        if: { $gt: [{ $size: '$enrollmentData' }, 0] },
                        then: { $arrayElemAt: ['$enrollmentData', 0] },
                        else: null,
                    },
                },
            },
        },
    ];
    // Enrollment filter: active | completed | none | all (default)
    const enrollmentFilter = String(query.enrollment || 'all').toLowerCase();
    if (enrollmentFilter === 'active') {
        pipeline.push({ $match: { 'enrollment.status': 'ACTIVE' } });
    }
    else if (enrollmentFilter === 'completed') {
        pipeline.push({ $match: { 'enrollment.status': 'COMPLETED' } });
    }
    else if (enrollmentFilter === 'none') {
        pipeline.push({ $match: { enrollment: null } });
    }
    pipeline.push({
        $project: {
            title: 1,
            slug: 1,
            thumbnail: 1,
            description: 1,
            totalLessons: 1,
            averageRating: 1,
            enrollmentCount: 1,
            enrollment: 1,
        },
    }, {
        $facet: {
            data: [
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
            ],
            total: [{ $count: 'count' }],
        },
    });
    const result = yield course_model_1.Course.aggregate(pipeline);
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
const getCourseOptions = () => __awaiter(void 0, void 0, void 0, function* () {
    return course_model_1.Course.find({ status: course_interface_1.COURSE_STATUS.PUBLISHED })
        .select('_id title')
        .sort({ title: 1 })
        .lean();
});
exports.CourseService = {
    getCourseOptions,
    createCourse,
    getAllCourses,
    browseCourses,
    getStudentCourseDetail,
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
