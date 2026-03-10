"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyActivity = void 0;
const mongoose_1 = require("mongoose");
const dailyActivitySchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    lessonsCompleted: {
        type: Number,
        default: 0,
    },
    quizzesTaken: {
        type: Number,
        default: 0,
    },
    pointsEarned: {
        type: Number,
        default: 0,
    },
    timeSpent: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// Indexes
dailyActivitySchema.index({ student: 1, date: 1 }, { unique: true });
dailyActivitySchema.index({ student: 1, date: -1 });
exports.DailyActivity = (0, mongoose_1.model)('DailyActivity', dailyActivitySchema);
