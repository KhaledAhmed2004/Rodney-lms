"use strict";
/**
 * JobQueue - Queue Management API
 *
 * Provides high-level queue operations like stats, retry, cancel, purge.
 * Acts as a facade over JobStorage for queue management tasks.
 *
 * @example
 * ```typescript
 * // Get queue statistics
 * const stats = await JobQueue.getStats();
 * console.log(`Pending: ${stats.pending}, Processing: ${stats.processing}`);
 *
 * // Get failed jobs
 * const failed = await JobQueue.getFailed({ limit: 10 });
 *
 * // Retry a failed job
 * await JobQueue.retry(jobId);
 *
 * // Purge old completed jobs
 * await JobQueue.purge({ status: 'completed', olderThan: '7d' });
 * ```
 *
 * @module JobBuilder/JobQueue
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
exports.JobQueue = void 0;
const JobStorage_1 = __importDefault(require("./JobStorage"));
const Job_model_1 = __importDefault(require("./Job.model"));
const builderTracing_1 = require("../builderTracing");
// ==================== JOB QUEUE CLASS ====================
class JobQueue {
    // ==================== STATS METHODS ====================
    /**
     * Get queue statistics
     *
     * @returns Queue stats with counts per status
     *
     * @example
     * ```typescript
     * const stats = await JobQueue.getStats();
     * // { pending: 50, processing: 5, completed: 1000, failed: 3, ... }
     * ```
     */
    static getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.getStats();
        });
    }
    /**
     * Get detailed queue statistics
     *
     * @returns Detailed stats with today's counts and averages
     */
    static getDetailedStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.getDetailedStats();
        });
    }
    /**
     * Get count of jobs by status
     *
     * @param status - Job status to count
     */
    static count(status) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = status ? { status } : {};
            return JobStorage_1.default.count(query);
        });
    }
    // ==================== QUERY METHODS ====================
    /**
     * Get pending jobs
     *
     * @param options - Query options
     */
    static getPending() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return JobStorage_1.default.find({
                status: 'pending',
                name: options.name,
                limit: options.limit || 20,
                sort: { priority: -1, createdAt: 1 },
            });
        });
    }
    /**
     * Get processing jobs
     *
     * @param options - Query options
     */
    static getProcessing() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return JobStorage_1.default.find({
                status: 'processing',
                limit: options.limit || 20,
                sort: { processedAt: -1 },
            });
        });
    }
    /**
     * Get completed jobs
     *
     * @param options - Query options
     */
    static getCompleted() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return JobStorage_1.default.find({
                status: 'completed',
                name: options.name,
                limit: options.limit || 20,
                sort: { completedAt: -1 },
            });
        });
    }
    /**
     * Get failed jobs
     *
     * @param options - Query options
     */
    static getFailed() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return JobStorage_1.default.find({
                status: 'failed',
                name: options.name,
                limit: options.limit || 20,
                sort: { failedAt: -1 },
            });
        });
    }
    /**
     * Get scheduled jobs (cron jobs)
     */
    static getScheduled() {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.findScheduled();
        });
    }
    /**
     * Find jobs by name
     *
     * @param name - Handler name
     * @param options - Query options
     */
    static findByName(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, options = {}) {
            return JobStorage_1.default.find({
                name,
                status: options.status,
                limit: options.limit || 20,
            });
        });
    }
    /**
     * Find job by ID
     *
     * @param jobId - Job ID
     */
    static findById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.findById(jobId);
        });
    }
    // ==================== ACTION METHODS ====================
    /**
     * Retry a failed job
     *
     * @param jobId - Job ID to retry
     * @param delay - Optional delay before retry (e.g., '5m')
     * @returns Updated job or null if not found/not failed
     */
    static retry(jobId, delay) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'retry', () => __awaiter(this, void 0, void 0, function* () {
                let delayMs;
                if (delay) {
                    const match = delay.match(/^(\d+)(s|m|h|d)$/);
                    if (match) {
                        const value = parseInt(match[1]);
                        const unit = match[2];
                        const multipliers = {
                            s: 1000,
                            m: 60 * 1000,
                            h: 60 * 60 * 1000,
                            d: 24 * 60 * 60 * 1000,
                        };
                        delayMs = value * multipliers[unit];
                    }
                }
                (0, builderTracing_1.addSpanAttributes)({
                    'job.id': jobId,
                    'job.retryDelay': delayMs || 0,
                });
                return JobStorage_1.default.retry(jobId, delayMs);
            }));
        });
    }
    /**
     * Retry all failed jobs
     *
     * @param options - Filter options
     * @returns Number of jobs retried
     */
    static retryAll() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'retryAll', () => __awaiter(this, void 0, void 0, function* () {
                const query = { status: 'failed' };
                if (options.name) {
                    query.name = options.name;
                }
                const result = yield Job_model_1.default.updateMany(query, {
                    $set: {
                        status: 'pending',
                        processedAt: null,
                    },
                });
                (0, builderTracing_1.addSpanAttributes)({
                    'jobs.retried': result.modifiedCount,
                });
                return result.modifiedCount;
            }));
        });
    }
    /**
     * Cancel a pending/scheduled job
     *
     * @param jobId - Job ID to cancel
     * @returns Cancelled job or null
     */
    static cancel(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'cancel', () => __awaiter(this, void 0, void 0, function* () {
                (0, builderTracing_1.addSpanAttributes)({ 'job.id': jobId });
                return JobStorage_1.default.cancel(jobId);
            }));
        });
    }
    /**
     * Cancel all pending jobs by name
     *
     * @param name - Handler name
     * @returns Number of jobs cancelled
     */
    static cancelByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'cancelByName', () => __awaiter(this, void 0, void 0, function* () {
                const result = yield Job_model_1.default.updateMany({
                    name,
                    status: { $in: ['pending', 'scheduled'] },
                }, {
                    $set: {
                        status: 'cancelled',
                        completedAt: new Date(),
                    },
                });
                (0, builderTracing_1.addSpanAttributes)({
                    'jobs.cancelled': result.modifiedCount,
                    'jobs.name': name,
                });
                return result.modifiedCount;
            }));
        });
    }
    /**
     * Delete a job by ID
     *
     * @param jobId - Job ID to delete
     */
    static delete(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.delete(jobId);
        });
    }
    // ==================== CLEANUP METHODS ====================
    /**
     * Purge jobs based on criteria
     *
     * @param options - Purge options
     * @returns Number of jobs deleted
     *
     * @example
     * ```typescript
     * // Purge completed jobs older than 7 days
     * await JobQueue.purge({ status: 'completed', olderThan: '7d' });
     *
     * // Purge all failed jobs
     * await JobQueue.purge({ status: 'failed' });
     *
     * // Purge specific job type older than 1 day
     * await JobQueue.purge({ name: 'sendEmail', olderThan: '1d' });
     * ```
     */
    static purge(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'purge', () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const deleted = yield JobStorage_1.default.purge(options);
                (0, builderTracing_1.addSpanAttributes)({
                    'purge.deleted': deleted,
                    'purge.status': ((_a = options.status) === null || _a === void 0 ? void 0 : _a.toString()) || 'all',
                    'purge.olderThan': ((_b = options.olderThan) === null || _b === void 0 ? void 0 : _b.toString()) || 'none',
                });
                return deleted;
            }));
        });
    }
    /**
     * Purge all completed jobs older than specified duration
     *
     * @param olderThan - Duration string (e.g., '7d', '24h')
     */
    static purgeCompleted() {
        return __awaiter(this, arguments, void 0, function* (olderThan = '7d') {
            return this.purge({ status: 'completed', olderThan });
        });
    }
    /**
     * Purge all failed jobs older than specified duration
     *
     * @param olderThan - Duration string
     */
    static purgeFailed() {
        return __awaiter(this, arguments, void 0, function* (olderThan = '30d') {
            return this.purge({ status: 'failed', olderThan });
        });
    }
    /**
     * Purge all cancelled jobs older than specified duration
     *
     * @param olderThan - Duration string
     */
    static purgeCancelled() {
        return __awaiter(this, arguments, void 0, function* (olderThan = '1d') {
            return this.purge({ status: 'cancelled', olderThan });
        });
    }
    /**
     * Clear all jobs (DANGEROUS - use with caution!)
     *
     * @returns Number of jobs deleted
     */
    static clearAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.clearAll();
        });
    }
    // ==================== MAINTENANCE METHODS ====================
    /**
     * Reset stuck processing jobs
     *
     * Jobs that have been processing for too long are reset to pending.
     *
     * @param timeoutMs - Timeout threshold in milliseconds (default: 5 minutes)
     * @returns Number of jobs reset
     */
    static resetStuckJobs() {
        return __awaiter(this, arguments, void 0, function* (timeoutMs = 5 * 60 * 1000) {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'resetStuckJobs', () => __awaiter(this, void 0, void 0, function* () {
                const reset = yield JobStorage_1.default.resetStuckJobs(timeoutMs);
                (0, builderTracing_1.addSpanAttributes)({
                    'maintenance.stuckReset': reset,
                    'maintenance.timeout': timeoutMs,
                });
                return reset;
            }));
        });
    }
    /**
     * Activate scheduled jobs that are ready
     *
     * @returns Number of jobs activated
     */
    static activateScheduled() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'activateScheduled', () => __awaiter(this, void 0, void 0, function* () {
                const activated = yield JobStorage_1.default.activateScheduledJobs();
                (0, builderTracing_1.addSpanAttributes)({
                    'maintenance.activated': activated,
                });
                return activated;
            }));
        });
    }
    /**
     * Run maintenance tasks
     *
     * - Reset stuck jobs
     * - Activate scheduled jobs
     * - Purge old completed jobs
     *
     * @returns Maintenance summary
     */
    static runMaintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobQueue', 'runMaintenance', () => __awaiter(this, void 0, void 0, function* () {
                const [stuckReset, activated, purged] = yield Promise.all([
                    this.resetStuckJobs(),
                    this.activateScheduled(),
                    this.purgeCompleted('7d'),
                ]);
                return { stuckReset, activated, purged };
            }));
        });
    }
    // ==================== UTILITY METHODS ====================
    /**
     * Check if queue is healthy
     *
     * @returns Health check result
     */
    static healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.getStats();
            const issues = [];
            // Check for stuck jobs
            const stuckThreshold = 5 * 60 * 1000; // 5 minutes
            const stuckCount = yield Job_model_1.default.countDocuments({
                status: 'processing',
                processedAt: { $lt: new Date(Date.now() - stuckThreshold) },
            });
            if (stuckCount > 0) {
                issues.push(`${stuckCount} jobs appear stuck in processing`);
            }
            // Check for high failure rate
            const recentWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
            const [recentCompleted, recentFailed] = yield Promise.all([
                Job_model_1.default.countDocuments({ status: 'completed', completedAt: { $gte: recentWindow } }),
                Job_model_1.default.countDocuments({ status: 'failed', failedAt: { $gte: recentWindow } }),
            ]);
            const totalRecent = recentCompleted + recentFailed;
            if (totalRecent > 0 && recentFailed / totalRecent > 0.1) {
                issues.push(`High failure rate: ${((recentFailed / totalRecent) * 100).toFixed(1)}%`);
            }
            // Check for large pending queue
            if (stats.pending > 1000) {
                issues.push(`Large pending queue: ${stats.pending} jobs`);
            }
            return {
                healthy: issues.length === 0,
                stats,
                issues,
            };
        });
    }
}
exports.JobQueue = JobQueue;
exports.default = JobQueue;
