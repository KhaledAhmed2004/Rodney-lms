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
    const created = yield gradebook_model_1.AssignmentSubmission.create({
        student: studentId,
        course: courseId,
        lesson: lessonId,
        enrollment: enrollment._id,
        content: content || '',
        attachments: attachmentData,
    });
    return gradebook_model_1.AssignmentSubmission.findById(created._id).select('content attachments status submittedAt createdAt');
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
        // Lookup student's graded quiz grades
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
                    { $project: { percentage: 1, _id: 0 } },
                ],
                as: 'quizGrades',
            },
        },
        // Total quizzes per course
        {
            $lookup: {
                from: 'quizzes',
                localField: 'course',
                foreignField: 'course',
                pipeline: [{ $project: { _id: 1 } }],
                as: 'courseQuizzes',
            },
        },
        // Student's assignment submissions
        {
            $lookup: {
                from: 'assignmentsubmissions',
                let: { studentId: '$student', courseId: '$course' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$student', '$$studentId'] },
                                    { $eq: ['$course', '$$courseId'] },
                                ],
                            },
                        },
                    },
                    { $project: { _id: 1 } },
                ],
                as: 'studentSubmissions',
            },
        },
        // Total assignment-type lessons per course
        {
            $lookup: {
                from: 'lessons',
                let: { courseId: '$course' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$courseId', '$$courseId'] },
                            type: 'ASSIGNMENT',
                        },
                    },
                    { $project: { _id: 1 } },
                ],
                as: 'courseAssignments',
            },
        },
        // Calculate summary fields
        {
            $addFields: {
                quizzesAttempted: { $size: '$quizGrades' },
                totalQuizzes: { $size: '$courseQuizzes' },
                overallQuizPercentage: {
                    $cond: [
                        { $gt: [{ $size: '$quizGrades' }, 0] },
                        { $round: [{ $avg: '$quizGrades.percentage' }, 2] },
                        0,
                    ],
                },
                assignmentsSubmitted: { $size: '$studentSubmissions' },
                totalAssignments: { $size: '$courseAssignments' },
                lastActivityDate: '$progress.lastAccessedAt',
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
                quizzesAttempted: 1,
                totalQuizzes: 1,
                overallQuizPercentage: 1,
                assignmentsSubmitted: 1,
                totalAssignments: 1,
                completionPercentage: '$progress.completionPercentage',
                lastActivityDate: 1,
                enrolledAt: 1,
            },
        },
    ];
    // Search filter (after lookups, capped at 200 chars)
    if (query.searchTerm) {
        const sanitized = (0, escape_string_regexp_1.default)(String(query.searchTerm).slice(0, 200));
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
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
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
    return enrollment_model_1.Enrollment.aggregate(pipeline);
});
// ==================== ADMIN SUMMARY (Stat Cards) ====================
const AT_RISK_COMPLETION_THRESHOLD = 20;
const AT_RISK_INACTIVE_DAYS = 14;
const getGradebookSummary = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);
    const inactiveCutoff = new Date(now.getTime() - AT_RISK_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
    const [allTimeQuizAvg, thisMonthQuizAvg, lastMonthQuizAvg, currentCompletionAvg, previousCompletionAvg, pendingAssignments, atRiskStudents,] = yield Promise.all([
        // All-time avg quiz score
        gradebook_model_1.Grade.aggregate([
            { $match: { assessmentType: gradebook_interface_1.ASSESSMENT_TYPE.QUIZ, status: gradebook_interface_1.GRADE_STATUS.GRADED } },
            { $group: { _id: null, avg: { $avg: '$percentage' } } },
        ]),
        // This month graded quizzes avg
        gradebook_model_1.Grade.aggregate([
            {
                $match: {
                    assessmentType: gradebook_interface_1.ASSESSMENT_TYPE.QUIZ,
                    status: gradebook_interface_1.GRADE_STATUS.GRADED,
                    createdAt: { $gte: startOfThisMonth },
                },
            },
            { $group: { _id: null, avg: { $avg: '$percentage' } } },
        ]),
        // Last month graded quizzes avg
        gradebook_model_1.Grade.aggregate([
            {
                $match: {
                    assessmentType: gradebook_interface_1.ASSESSMENT_TYPE.QUIZ,
                    status: gradebook_interface_1.GRADE_STATUS.GRADED,
                    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                },
            },
            { $group: { _id: null, avg: { $avg: '$percentage' } } },
        ]),
        // Current avg completion (all active enrollments)
        enrollment_model_1.Enrollment.aggregate([
            { $match: { status: enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE } },
            { $group: { _id: null, avg: { $avg: '$progress.completionPercentage' } } },
        ]),
        // Previous avg completion (active enrollments created before this month)
        enrollment_model_1.Enrollment.aggregate([
            { $match: { status: enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE, createdAt: { $lt: startOfThisMonth } } },
            { $group: { _id: null, avg: { $avg: '$progress.completionPercentage' } } },
        ]),
        // Pending assignment submissions (waiting for grading)
        gradebook_model_1.AssignmentSubmission.countDocuments({ status: gradebook_interface_1.SUBMISSION_STATUS.SUBMITTED }),
        // At-risk: active, low completion, inactive or never accessed
        enrollment_model_1.Enrollment.countDocuments({
            status: enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE,
            'progress.completionPercentage': { $lt: AT_RISK_COMPLETION_THRESHOLD },
            $or: [
                { 'progress.lastAccessedAt': { $lt: inactiveCutoff } },
                { 'progress.lastAccessedAt': null },
            ],
        }),
    ]);
    // Avg quiz score + growth (absolute delta like avgRating pattern)
    const quizValue = Math.round(((_b = (_a = allTimeQuizAvg[0]) === null || _a === void 0 ? void 0 : _a.avg) !== null && _b !== void 0 ? _b : 0) * 100) / 100;
    const thisMonthQuiz = (_d = (_c = thisMonthQuizAvg[0]) === null || _c === void 0 ? void 0 : _c.avg) !== null && _d !== void 0 ? _d : 0;
    const lastMonthQuiz = (_f = (_e = lastMonthQuizAvg[0]) === null || _e === void 0 ? void 0 : _e.avg) !== null && _f !== void 0 ? _f : 0;
    const hasLastMonthQuiz = lastMonthQuizAvg[0] != null;
    const quizDelta = hasLastMonthQuiz
        ? Math.round((thisMonthQuiz - lastMonthQuiz) * 10) / 10
        : 0;
    const quizGrowthType = quizDelta > 0 ? 'increase' : quizDelta < 0 ? 'decrease' : 'no_change';
    // Avg completion + growth (absolute delta)
    const completionValue = Math.round(((_h = (_g = currentCompletionAvg[0]) === null || _g === void 0 ? void 0 : _g.avg) !== null && _h !== void 0 ? _h : 0) * 100) / 100;
    const prevCompletion = (_k = (_j = previousCompletionAvg[0]) === null || _j === void 0 ? void 0 : _j.avg) !== null && _k !== void 0 ? _k : 0;
    const hasPrevCompletion = previousCompletionAvg[0] != null;
    const completionDelta = hasPrevCompletion
        ? Math.round((completionValue - prevCompletion) * 10) / 10
        : 0;
    const completionGrowthType = completionDelta > 0
        ? 'increase'
        : completionDelta < 0
            ? 'decrease'
            : 'no_change';
    return {
        avgQuizScore: {
            value: quizValue,
            growth: Math.abs(quizDelta),
            growthType: quizGrowthType,
        },
        avgCompletion: {
            value: completionValue,
            growth: Math.abs(completionDelta),
            growthType: completionGrowthType,
        },
        pendingAssignments,
        atRiskStudents,
    };
});
exports.GradebookService = {
    submitAssignment,
    getMyGrades,
    getAllStudentGradebook,
    exportStudentGradebook,
    getGradebookSummary,
};
