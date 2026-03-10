"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentSubmission = exports.Grade = void 0;
const mongoose_1 = require("mongoose");
const gradebook_interface_1 = require("./gradebook.interface");
// ==================== GRADE SCHEMA ====================
const gradeSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    enrollment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true,
    },
    assessmentType: {
        type: String,
        enum: Object.values(gradebook_interface_1.ASSESSMENT_TYPE),
        required: true,
    },
    assessmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    assessmentTitle: {
        type: String,
        required: true,
    },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    status: {
        type: String,
        enum: Object.values(gradebook_interface_1.GRADE_STATUS),
        default: gradebook_interface_1.GRADE_STATUS.PENDING,
    },
    gradedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    gradedAt: { type: Date },
    feedback: { type: String },
}, { timestamps: true });
gradeSchema.index({ student: 1, course: 1 });
gradeSchema.index({ enrollment: 1 });
gradeSchema.index({ assessmentType: 1, assessmentId: 1 });
exports.Grade = (0, mongoose_1.model)('Grade', gradeSchema);
// ==================== ATTACHMENT SUB-SCHEMA ====================
const AttachmentSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
}, { _id: false });
// ==================== ASSIGNMENT SUBMISSION SCHEMA ====================
const assignmentSubmissionSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    lesson: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
    },
    enrollment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true,
    },
    content: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    status: {
        type: String,
        enum: Object.values(gradebook_interface_1.SUBMISSION_STATUS),
        default: gradebook_interface_1.SUBMISSION_STATUS.SUBMITTED,
    },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
assignmentSubmissionSchema.index({ student: 1, lesson: 1 });
assignmentSubmissionSchema.index({ course: 1 });
assignmentSubmissionSchema.index({ enrollment: 1 });
exports.AssignmentSubmission = (0, mongoose_1.model)('AssignmentSubmission', assignmentSubmissionSchema);
