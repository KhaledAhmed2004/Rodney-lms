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
exports.GradebookService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const enrollmentHelper_1 = require("../../helpers/enrollmentHelper");
const enrollment_model_1 = require("../enrollment/enrollment.model");
const enrollment_interface_1 = require("../enrollment/enrollment.interface");
const gradebook_interface_1 = require("./gradebook.interface");
const gradebook_model_1 = require("./gradebook.model");
const submitAssignment = (lessonId, studentId, courseId, content, attachments) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify enrollment
    const enrollment = yield enrollmentHelper_1.EnrollmentHelper.verifyEnrollment(studentId, courseId);
    // Check for existing submission
    const existing = yield gradebook_model_1.AssignmentSubmission.findOne({
        student: studentId,
        lesson: lessonId,
        status: { $in: ['SUBMITTED', 'GRADED'] },
    });
    if (existing) {
        // Allow resubmission if returned
        if (existing.status === 'GRADED') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Assignment already graded');
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Assignment already submitted');
    }
    const attachmentData = (attachments || []).map((url) => ({
        url,
        name: url.split('/').pop() || 'file',
    }));
    const submission = yield gradebook_model_1.AssignmentSubmission.create({
        student: studentId,
        course: courseId,
        lesson: lessonId,
        enrollment: enrollment._id,
        content: content || '',
        attachments: attachmentData,
    });
    return submission;
});
const getMyGrades = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const gradeQuery = new QueryBuilder_1.default(gradebook_model_1.Grade.find({ student: studentId }).populate('course', 'title slug thumbnail'), query)
        .filter()
        .sort()
        .paginate();
    const data = yield gradeQuery.modelQuery;
    const pagination = yield gradeQuery.getPaginationInfo();
    return { pagination, data };
});
const buildGradebookMatchConditions = (query) => {
    const conditions = {};
    if (query.status) {
        conditions.status = query.status;
    }
    else {
        conditions.status = enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE;
    }
    if (query.courseId) {
        conditions.course = new mongoose_1.Types.ObjectId(String(query.courseId));
    }
    return conditions;
};
const buildGradebookPipeline = (query) => {
    const matchConditions = buildGradebookMatchConditions(query);
    const pipeline = [
        { $match: matchConditions },
        // Lookup student info
        {
            $lookup: {
                from: 'users',
                localField: 'student',
                foreignField: '_id',
                as: 'studentInfo',
            },
        },
        { $unwind: '$studentInfo' },
        { $match: { 'studentInfo.status': { $ne: 'DELETE' } } },
        // Lookup course info
        {
            $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'courseInfo',
            },
        },
        { $unwind: '$courseInfo' },
        // Lookup quiz grades (pipeline lookup for filtered join)
        {
            $lookup: {
                from: 'grades',
                let: { studentId: '$student', courseId: '$course' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$student', '$$studentId'] },
                                    { $eq: ['$course', '$$courseId'] },
                                    { $eq: ['$assessmentType', gradebook_interface_1.ASSESSMENT_TYPE.QUIZ] },
                                    { $eq: ['$status', gradebook_interface_1.GRADE_STATUS.GRADED] },
                                ],
                            },
                        },
                    },
                    {
                        $project: {
                            title: '$assessmentTitle',
                            percentage: 1,
                            _id: 0,
                        },
                    },
                    { $sort: { title: 1 } },
                ],
                as: 'quizzes',
            },
        },
        // Calculate overall quiz % and flatten fields
        {
            $addFields: {
                overallQuizPercentage: {
                    $cond: [
                        { $gt: [{ $size: '$quizzes' }, 0] },
                        { $round: [{ $avg: '$quizzes.percentage' }, 2] },
                        0,
                    ],
                },
            },
        },
        // Project final shape
        {
            $project: {
                _id: 1,
                studentName: '$studentInfo.name',
                studentEmail: '$studentInfo.email',
                studentAvatar: '$studentInfo.profilePicture',
                courseTitle: '$courseInfo.title',
                quizzes: 1,
                overallQuizPercentage: 1,
                completionPercentage: '$progress.completionPercentage',
                enrolledAt: 1,
            },
        },
    ];
    // Search filter (after lookups)
    if (query.searchTerm) {
        const sanitized = (0, escape_string_regexp_1.default)(String(query.searchTerm));
        pipeline.push({
            $match: {
                $or: [
                    { studentName: { $regex: sanitized, $options: 'i' } },
                    { studentEmail: { $regex: sanitized, $options: 'i' } },
                ],
            },
        });
    }
    return pipeline;
};
const getAllStudentGradebook = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const pipeline = buildGradebookPipeline(query);
    // Add $facet for pagination
    pipeline.push({
        $facet: {
            data: [
                { $sort: { completionPercentage: -1 } },
                { $skip: skip },
                { $limit: limit },
            ],
            total: [{ $count: 'count' }],
        },
    });
    const result = yield enrollment_model_1.Enrollment.aggregate(pipeline);
    const data = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    const total = (_e = (_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.total[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
    const totalPage = Math.ceil(total / limit);
    return {
        pagination: { page, limit, totalPage, total },
        data,
    };
});
const exportStudentGradebook = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const pipeline = buildGradebookPipeline(query);
    pipeline.push({ $sort: { studentName: 1 } });
    const data = yield enrollment_model_1.Enrollment.aggregate(pipeline);
    // Format quizzes array into readable string for export
    return data.map((row) => (Object.assign(Object.assign({}, row), { quizScores: row.quizzes
            .map(q => `${q.title}: ${q.percentage}%`)
            .join(', ') || 'N/A' })));
});
exports.GradebookService = {
    submitAssignment,
    getMyGrades,
    getAllStudentGradebook,
    exportStudentGradebook,
};
