"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentBadge = exports.Badge = exports.PointsLedger = void 0;
const mongoose_1 = require("mongoose");
const gamification_interface_1 = require("./gamification.interface");
const pointsLedgerSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    points: { type: Number, required: true },
    reason: {
        type: String,
        enum: Object.values(gamification_interface_1.POINTS_REASON),
        required: true,
    },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId },
    referenceType: { type: String },
    description: { type: String, required: true },
}, { timestamps: true });
pointsLedgerSchema.index({ student: 1, createdAt: -1 });
pointsLedgerSchema.index({ reason: 1 });
exports.PointsLedger = (0, mongoose_1.model)('PointsLedger', pointsLedgerSchema);
const BadgeCriteriaSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(gamification_interface_1.BADGE_CRITERIA),
        required: true,
    },
    threshold: { type: Number, required: true },
}, { _id: false });
const badgeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    criteria: { type: BadgeCriteriaSchema, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
badgeSchema.index({ isActive: 1 });
exports.Badge = (0, mongoose_1.model)('Badge', badgeSchema);
// ==================== STUDENT BADGE ====================
const studentBadgeSchema = new mongoose_1.Schema({
    student: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    badge: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Badge',
        required: true,
    },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });
studentBadgeSchema.index({ student: 1, badge: 1 }, { unique: true });
studentBadgeSchema.index({ badge: 1 });
exports.StudentBadge = (0, mongoose_1.model)('StudentBadge', studentBadgeSchema);
