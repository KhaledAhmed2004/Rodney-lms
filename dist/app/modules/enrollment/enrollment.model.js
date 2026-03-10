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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Enrollment = void 0;
const mongoose_1 = require("mongoose");
const enrollment_interface_1 = require("./enrollment.interface");
const enrollmentProgressSchema = new mongoose_1.Schema({
    completedLessons: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Lesson' }],
    lastAccessedLesson: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lesson' },
    lastAccessedAt: { type: Date },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
}, { _id: false });
const enrollmentSchema = new mongoose_1.Schema({
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
    enrolledAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: Object.values(enrollment_interface_1.ENROLLMENT_STATUS),
        default: enrollment_interface_1.ENROLLMENT_STATUS.ACTIVE,
    },
    progress: {
        type: enrollmentProgressSchema,
        default: {
            completedLessons: [],
            completionPercentage: 0,
        },
    },
    completedAt: { type: Date },
}, { timestamps: true });
// Indexes
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ student: 1, status: 1 });
// Statics
enrollmentSchema.statics.isExistById = function (id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.findById(id);
    });
};
exports.Enrollment = (0, mongoose_1.model)('Enrollment', enrollmentSchema);
