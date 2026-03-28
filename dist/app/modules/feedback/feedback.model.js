"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feedback = void 0;
const mongoose_1 = require("mongoose");
const feedbackSchema = new mongoose_1.Schema({
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
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    review: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    adminResponse: { type: String },
    respondedAt: { type: Date },
}, { timestamps: true });
feedbackSchema.index({ student: 1, course: 1 }, { unique: true });
feedbackSchema.index({ course: 1 });
feedbackSchema.index({ rating: 1 });
exports.Feedback = (0, mongoose_1.model)('Feedback', feedbackSchema);
