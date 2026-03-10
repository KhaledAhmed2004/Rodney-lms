"use strict";
/**
 * Job Model - MongoDB Schema for Background Jobs
 *
 * Stores all job data for the JobBuilder queue system.
 * Uses compound indexes for efficient job claiming and processing.
 *
 * @module JobBuilder/Job.model
 */
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
const mongoose_1 = require("mongoose");
// ==================== SCHEMA ====================
const JobSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Job name is required'],
        index: true,
        trim: true,
    },
    payload: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        default: {},
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'scheduled', 'cancelled'],
        default: 'pending',
        index: true,
    },
    priority: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxAttempts: {
        type: Number,
        default: 3,
        min: 1,
    },
    lastError: {
        type: String,
        default: null,
    },
    scheduledFor: {
        type: Date,
        default: null,
        index: true,
    },
    cronExpression: {
        type: String,
        default: null,
    },
    timeout: {
        type: Number,
        default: null,
    },
    result: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    processedAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    failedAt: {
        type: Date,
        default: null,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
    collection: 'jobs',
});
// ==================== INDEXES ====================
/**
 * Compound index for efficient job claiming
 * Worker queries: { status: 'pending', priority: -1, scheduledFor: { $lte: now } }
 */
JobSchema.index({ status: 1, priority: -1, scheduledFor: 1 }, { name: 'job_claiming_idx' });
/**
 * Index for finding jobs by name and status
 */
JobSchema.index({ name: 1, status: 1 }, { name: 'job_name_status_idx' });
/**
 * TTL index for automatic cleanup of completed jobs (7 days by default)
 * Only applies to completed and cancelled jobs
 */
JobSchema.index({ completedAt: 1 }, {
    name: 'job_ttl_completed_idx',
    expireAfterSeconds: 60 * 60 * 24 * 7, // 7 days
    partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } },
});
/**
 * Index for scheduled/cron jobs
 */
JobSchema.index({ cronExpression: 1 }, {
    name: 'job_cron_idx',
    partialFilterExpression: { cronExpression: { $ne: null } },
});
/**
 * Index for failed jobs lookup
 */
JobSchema.index({ status: 1, failedAt: -1 }, {
    name: 'job_failed_idx',
    partialFilterExpression: { status: 'failed' },
});
/**
 * Claim the next available job atomically
 */
JobSchema.statics.claimNext = function (jobTypes) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const query = {
            status: 'pending',
            $or: [
                { scheduledFor: null },
                { scheduledFor: { $lte: now } },
            ],
        };
        if (jobTypes && jobTypes.length > 0) {
            query.name = { $in: jobTypes };
        }
        return this.findOneAndUpdate(query, {
            $set: {
                status: 'processing',
                processedAt: now,
            },
            $inc: { attempts: 1 },
        }, {
            new: true,
            sort: { priority: -1, createdAt: 1 },
        });
    });
};
/**
 * Get queue statistics
 */
JobSchema.statics.getStats = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const stats = yield this.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const result = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            scheduled: 0,
            cancelled: 0,
            total: 0,
        };
        for (const stat of stats) {
            result[stat._id] = stat.count;
            result.total += stat.count;
        }
        return result;
    });
};
/**
 * Find jobs ready to process
 */
JobSchema.statics.findReady = function () {
    return __awaiter(this, arguments, void 0, function* (limit = 10, jobTypes) {
        const now = new Date();
        const query = {
            status: 'pending',
            $or: [
                { scheduledFor: null },
                { scheduledFor: { $lte: now } },
            ],
        };
        if (jobTypes && jobTypes.length > 0) {
            query.name = { $in: jobTypes };
        }
        return this.find(query)
            .sort({ priority: -1, createdAt: 1 })
            .limit(limit);
    });
};
// ==================== INSTANCE METHODS ====================
/**
 * Mark job as completed
 */
JobSchema.methods.markCompleted = function (result) {
    return __awaiter(this, void 0, void 0, function* () {
        this.status = 'completed';
        this.completedAt = new Date();
        this.result = result;
        return this.save();
    });
};
/**
 * Mark job as failed
 */
JobSchema.methods.markFailed = function (error) {
    return __awaiter(this, void 0, void 0, function* () {
        this.status = 'failed';
        this.failedAt = new Date();
        this.lastError = error;
        return this.save();
    });
};
/**
 * Reset job for retry
 */
JobSchema.methods.retry = function (delay) {
    return __awaiter(this, void 0, void 0, function* () {
        this.status = 'pending';
        this.processedAt = null;
        if (delay) {
            this.scheduledFor = new Date(Date.now() + delay);
        }
        return this.save();
    });
};
// ==================== EXPORT ====================
const Job = (0, mongoose_1.model)('Job', JobSchema);
exports.default = Job;
