"use strict";
/**
 * JobStorage - MongoDB Persistence Layer for Jobs
 *
 * Handles all database operations for the job queue system.
 * Provides atomic operations for safe concurrent access.
 *
 * @module JobBuilder/JobStorage
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStorage = void 0;
const Job_model_1 = __importDefault(require("./Job.model"));
const builderTracing_1 = require("../builderTracing");
// ==================== HELPER FUNCTIONS ====================
/**
 * Parse duration string to milliseconds
 * Supports: '5m', '2h', '1d', '1w', '30s'
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}. Use: 30s, 5m, 2h, 1d, 1w`);
    }
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
}
// ==================== JOB STORAGE CLASS ====================
class JobStorage {
    // ==================== CREATE OPERATIONS ====================
    /**
     * Create a new job
     */
    static create(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'create', () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                (0, builderTracing_1.addSpanAttributes)({
                    'job.name': options.name,
                    'job.priority': options.priority || 5,
                    'job.scheduled': !!options.scheduledFor,
                });
                const job = yield Job_model_1.default.create({
                    name: options.name,
                    payload: options.payload,
                    priority: (_a = options.priority) !== null && _a !== void 0 ? _a : 5,
                    maxAttempts: (_b = options.maxAttempts) !== null && _b !== void 0 ? _b : 3,
                    scheduledFor: options.scheduledFor,
                    cronExpression: options.cronExpression,
                    timeout: options.timeout,
                    metadata: options.metadata,
                    status: options.scheduledFor ? 'scheduled' : 'pending',
                });
                (0, builderTracing_1.recordSpanEvent)('job_created', { jobId: job._id.toString() });
                return job;
            }));
        });
    }
    /**
     * Create multiple jobs (batch insert)
     */
    static createMany(optionsArray) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'createMany', () => __awaiter(this, void 0, void 0, function* () {
                (0, builderTracing_1.addSpanAttributes)({
                    'jobs.count': optionsArray.length,
                });
                const jobDocs = optionsArray.map(options => {
                    var _a, _b;
                    return ({
                        name: options.name,
                        payload: options.payload,
                        priority: (_a = options.priority) !== null && _a !== void 0 ? _a : 5,
                        maxAttempts: (_b = options.maxAttempts) !== null && _b !== void 0 ? _b : 3,
                        scheduledFor: options.scheduledFor,
                        cronExpression: options.cronExpression,
                        timeout: options.timeout,
                        metadata: options.metadata,
                        status: options.scheduledFor ? 'scheduled' : 'pending',
                    });
                });
                const jobs = yield Job_model_1.default.insertMany(jobDocs);
                (0, builderTracing_1.recordSpanEvent)('jobs_created', { count: jobs.length });
                return jobs;
            }));
        });
    }
    // ==================== READ OPERATIONS ====================
    /**
     * Find job by ID
     */
    static findById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Job_model_1.default.findById(jobId);
        });
    }
    /**
     * Find jobs by query options
     */
    static find() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const query = {};
            // Status filter
            if (options.status) {
                query.status = Array.isArray(options.status)
                    ? { $in: options.status }
                    : options.status;
            }
            // Name filter
            if (options.name) {
                query.name = Array.isArray(options.name)
                    ? { $in: options.name }
                    : options.name;
            }
            // Date range filters
            if (options.before) {
                query.createdAt = Object.assign(Object.assign({}, query.createdAt), { $lte: options.before });
            }
            if (options.after) {
                query.createdAt = Object.assign(Object.assign({}, query.createdAt), { $gte: options.after });
            }
            let queryBuilder = Job_model_1.default.find(query);
            // Sorting
            if (options.sort) {
                queryBuilder = queryBuilder.sort(options.sort);
            }
            else {
                queryBuilder = queryBuilder.sort({ createdAt: -1 });
            }
            // Pagination
            if (options.skip) {
                queryBuilder = queryBuilder.skip(options.skip);
            }
            if (options.limit) {
                queryBuilder = queryBuilder.limit(options.limit);
            }
            return queryBuilder;
        });
    }
    /**
     * Find pending jobs ready to process
     */
    static findPending() {
        return __awaiter(this, arguments, void 0, function* (limit = 10, jobTypes) {
            return Job_model_1.default.findReady(limit, jobTypes);
        });
    }
    /**
     * Find failed jobs
     */
    static findFailed() {
        return __awaiter(this, arguments, void 0, function* (limit = 10) {
            return Job_model_1.default.find({ status: 'failed' })
                .sort({ failedAt: -1 })
                .limit(limit);
        });
    }
    /**
     * Find scheduled jobs
     */
    static findScheduled() {
        return __awaiter(this, void 0, void 0, function* () {
            return Job_model_1.default.find({ cronExpression: { $ne: null } })
                .sort({ createdAt: -1 });
        });
    }
    // ==================== UPDATE OPERATIONS ====================
    /**
     * Claim the next available job atomically
     */
    static claimNext(jobTypes) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'claimNext', () => __awaiter(this, void 0, void 0, function* () {
                const job = yield Job_model_1.default.claimNext(jobTypes);
                if (job) {
                    (0, builderTracing_1.addSpanAttributes)({
                        'job.id': job._id.toString(),
                        'job.name': job.name,
                        'job.attempt': job.attempts,
                    });
                    (0, builderTracing_1.recordSpanEvent)('job_claimed');
                }
                return job;
            }));
        });
    }
    /**
     * Mark job as completed
     */
    static complete(jobId, result) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'complete', () => __awaiter(this, void 0, void 0, function* () {
                const job = yield Job_model_1.default.findByIdAndUpdate(jobId, {
                    $set: {
                        status: 'completed',
                        completedAt: new Date(),
                        result,
                    },
                }, { new: true });
                if (job) {
                    (0, builderTracing_1.recordSpanEvent)('job_completed', { jobId });
                }
                return job;
            }));
        });
    }
    /**
     * Mark job as failed
     */
    static fail(jobId_1, error_1) {
        return __awaiter(this, arguments, void 0, function* (jobId, error, shouldRetry = false) {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'fail', () => __awaiter(this, void 0, void 0, function* () {
                const job = yield Job_model_1.default.findById(jobId);
                if (!job)
                    return null;
                // Check if we should retry
                if (shouldRetry && job.attempts < job.maxAttempts) {
                    // Calculate retry delay (exponential backoff)
                    const baseDelay = 5000; // 5 seconds
                    const delay = baseDelay * Math.pow(2, job.attempts - 1);
                    const scheduledFor = new Date(Date.now() + delay);
                    const updatedJob = yield Job_model_1.default.findByIdAndUpdate(jobId, {
                        $set: {
                            status: 'pending',
                            lastError: error,
                            scheduledFor,
                            processedAt: null,
                        },
                    }, { new: true });
                    (0, builderTracing_1.recordSpanEvent)('job_retry_scheduled', {
                        jobId,
                        attempt: job.attempts,
                        nextRetry: scheduledFor.toISOString(),
                    });
                    return updatedJob;
                }
                // Max retries reached, mark as failed permanently
                const failedJob = yield Job_model_1.default.findByIdAndUpdate(jobId, {
                    $set: {
                        status: 'failed',
                        failedAt: new Date(),
                        lastError: error,
                    },
                }, { new: true });
                (0, builderTracing_1.recordSpanEvent)('job_failed_permanently', { jobId, error });
                return failedJob;
            }));
        });
    }
    /**
     * Retry a failed job
     */
    static retry(jobId, delay) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield Job_model_1.default.findById(jobId);
            if (!job || job.status !== 'failed') {
                return null;
            }
            return Job_model_1.default.findByIdAndUpdate(jobId, {
                $set: {
                    status: 'pending',
                    processedAt: null,
                    scheduledFor: delay ? new Date(Date.now() + delay) : null,
                },
                $inc: { attempts: 0 }, // Reset attempts? Or keep? Keeping for now
            }, { new: true });
        });
    }
    /**
     * Cancel a pending job
     */
    static cancel(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Job_model_1.default.findOneAndUpdate({
                _id: jobId,
                status: { $in: ['pending', 'scheduled'] },
            }, {
                $set: {
                    status: 'cancelled',
                    completedAt: new Date(),
                },
            }, { new: true });
        });
    }
    /**
     * Update job progress (for long-running jobs)
     */
    static updateProgress(jobId, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Job_model_1.default.findByIdAndUpdate(jobId, {
                $set: { 'metadata.progress': progress },
            });
        });
    }
    // ==================== DELETE OPERATIONS ====================
    /**
     * Delete a job by ID
     */
    static delete(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Job_model_1.default.deleteOne({ _id: jobId });
            return result.deletedCount > 0;
        });
    }
    /**
     * Purge jobs based on options
     */
    static purge(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobStorage', 'purge', () => __awaiter(this, void 0, void 0, function* () {
                const query = {};
                // Status filter
                if (options.status) {
                    query.status = Array.isArray(options.status)
                        ? { $in: options.status }
                        : options.status;
                }
                // Name filter
                if (options.name) {
                    query.name = options.name;
                }
                // Age filter
                if (options.olderThan) {
                    const threshold = typeof options.olderThan === 'string'
                        ? new Date(Date.now() - parseDuration(options.olderThan))
                        : options.olderThan;
                    query.createdAt = { $lt: threshold };
                }
                const result = yield Job_model_1.default.deleteMany(query);
                (0, builderTracing_1.addSpanAttributes)({
                    'purge.deleted': result.deletedCount,
                });
                return result.deletedCount;
            }));
        });
    }
    /**
     * Clear all jobs (use with caution!)
     */
    static clearAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Job_model_1.default.deleteMany({});
            return result.deletedCount;
        });
    }
    // ==================== STATS OPERATIONS ====================
    /**
     * Get queue statistics
     */
    static getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield Job_model_1.default.getStats();
            return stats;
        });
    }
    /**
     * Get detailed queue statistics
     */
    static getDetailedStats() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const baseStats = yield this.getStats();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Get today's completed and failed counts
            const [completedToday, failedToday, avgTime, oldestPending] = yield Promise.all([
                Job_model_1.default.countDocuments({
                    status: 'completed',
                    completedAt: { $gte: today },
                }),
                Job_model_1.default.countDocuments({
                    status: 'failed',
                    failedAt: { $gte: today },
                }),
                Job_model_1.default.aggregate([
                    { $match: { status: 'completed', processedAt: { $ne: null } } },
                    {
                        $project: {
                            duration: { $subtract: ['$completedAt', '$processedAt'] },
                        },
                    },
                    { $group: { _id: null, avg: { $avg: '$duration' } } },
                ]),
                Job_model_1.default.findOne({ status: 'pending' }).sort({ createdAt: 1 }).select('createdAt'),
            ]);
            return Object.assign(Object.assign({}, baseStats), { completedToday,
                failedToday, averageProcessingTime: ((_a = avgTime[0]) === null || _a === void 0 ? void 0 : _a.avg) || 0, oldestPending: oldestPending === null || oldestPending === void 0 ? void 0 : oldestPending.createdAt });
        });
    }
    /**
     * Count jobs by criteria
     */
    static count() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            return Job_model_1.default.countDocuments(query);
        });
    }
    // ==================== MAINTENANCE OPERATIONS ====================
    /**
     * Reset stuck processing jobs
     * Jobs that have been processing for too long
     */
    static resetStuckJobs() {
        return __awaiter(this, arguments, void 0, function* (timeout = 5 * 60 * 1000) {
            const threshold = new Date(Date.now() - timeout);
            const result = yield Job_model_1.default.updateMany({
                status: 'processing',
                processedAt: { $lt: threshold },
            }, {
                $set: {
                    status: 'pending',
                    processedAt: null,
                    lastError: 'Job timed out and was reset',
                },
            });
            return result.modifiedCount;
        });
    }
    /**
     * Activate scheduled jobs that are ready
     */
    static activateScheduledJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const result = yield Job_model_1.default.updateMany({
                status: 'scheduled',
                scheduledFor: { $lte: now },
            }, {
                $set: { status: 'pending' },
            });
            return result.modifiedCount;
        });
    }
}
exports.JobStorage = JobStorage;
exports.default = JobStorage;
