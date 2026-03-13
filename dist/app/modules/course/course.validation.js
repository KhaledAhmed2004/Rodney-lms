"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseValidation = void 0;
const zod_1 = require("zod");
const course_interface_1 = require("./course.interface");
// ==================== COURSE ====================
const createCourseZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string({ required_error: 'Course title is required' })
            .min(3, 'Title must be at least 3 characters')
            .max(200, 'Title cannot exceed 200 characters'),
        description: zod_1.z.string().max(5000).optional(),
        status: zod_1.z.enum([course_interface_1.COURSE_STATUS.DRAFT, course_interface_1.COURSE_STATUS.PUBLISHED, course_interface_1.COURSE_STATUS.SCHEDULED]).optional(),
        publishScheduledAt: zod_1.z
            .string()
            .datetime('Invalid date format')
            .refine((val) => new Date(val) > new Date(), {
            message: 'Scheduled publish date must be in the future',
        })
            .optional(),
        thumbnail: zod_1.z.string().optional(),
    }),
});
const updateCourseZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3).max(200).optional(),
        description: zod_1.z.string().max(5000).optional(),
        status: zod_1.z
            .enum([
            course_interface_1.COURSE_STATUS.DRAFT,
            course_interface_1.COURSE_STATUS.PUBLISHED,
            course_interface_1.COURSE_STATUS.SCHEDULED,
        ])
            .optional(),
        publishScheduledAt: zod_1.z.string().datetime().optional(),
        thumbnail: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
// ==================== MODULE ====================
const addModuleZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string({ required_error: 'Module title is required' })
            .min(1, 'Module title cannot be empty')
            .max(200),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
const updateModuleZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        moduleId: zod_1.z.string({ required_error: 'Module ID is required' }),
    }),
});
const reorderModulesZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        moduleOrder: zod_1.z
            .array(zod_1.z.string(), { required_error: 'Module order array is required' })
            .min(1),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
    }),
});
// ==================== LESSON ====================
const createLessonZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string({ required_error: 'Lesson title is required' })
            .min(1)
            .max(300),
        type: zod_1.z.enum([course_interface_1.LESSON_TYPE.VIDEO, course_interface_1.LESSON_TYPE.READING, course_interface_1.LESSON_TYPE.ASSIGNMENT], { required_error: 'Lesson type is required' }),
        description: zod_1.z.string().max(10000).optional(),
        learningObjectives: zod_1.z.array(zod_1.z.string().max(500)).max(20).optional(),
        isVisible: zod_1.z.coerce.boolean().optional(),
        prerequisiteLesson: zod_1.z.string().optional(),
        readingContent: zod_1.z.string().optional(),
        assignmentInstructions: zod_1.z.string().optional(),
        contentFile: zod_1.z.string().optional(),
        attachments: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        moduleId: zod_1.z.string({ required_error: 'Module ID is required' }),
    }),
});
const updateLessonZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(300).optional(),
        type: zod_1.z
            .enum([course_interface_1.LESSON_TYPE.VIDEO, course_interface_1.LESSON_TYPE.READING, course_interface_1.LESSON_TYPE.ASSIGNMENT])
            .optional(),
        description: zod_1.z.string().max(10000).optional(),
        learningObjectives: zod_1.z.array(zod_1.z.string().max(500)).max(20).optional(),
        isVisible: zod_1.z.coerce.boolean().optional(),
        prerequisiteLesson: zod_1.z.string().nullable().optional(),
        readingContent: zod_1.z.string().optional(),
        assignmentInstructions: zod_1.z.string().optional(),
        contentFile: zod_1.z.string().optional(),
        attachments: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        moduleId: zod_1.z.string({ required_error: 'Module ID is required' }),
        lessonId: zod_1.z.string({ required_error: 'Lesson ID is required' }),
    }),
});
const reorderLessonsZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonOrder: zod_1.z
            .array(zod_1.z.string(), { required_error: 'Lesson order array is required' })
            .min(1),
    }),
    params: zod_1.z.object({
        courseId: zod_1.z.string({ required_error: 'Course ID is required' }),
        moduleId: zod_1.z.string({ required_error: 'Module ID is required' }),
    }),
});
exports.CourseValidation = {
    createCourseZodSchema,
    updateCourseZodSchema,
    addModuleZodSchema,
    updateModuleZodSchema,
    reorderModulesZodSchema,
    createLessonZodSchema,
    updateLessonZodSchema,
    reorderLessonsZodSchema,
};
