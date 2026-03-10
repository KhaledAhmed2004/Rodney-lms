"use strict";
/**
 * JobWorker - Background Job Processing Engine
 *
 * Polls MongoDB for pending jobs and processes them using registered handlers.
 * Supports concurrency, graceful shutdown, and event emission.
 *
 * @example
 * ```typescript
 * // Start worker with default options
 * JobWorker.start();
 *
 * // Start with custom options
 * JobWorker.start({
 *   concurrency: 5,
 *   pollInterval: 1000,
 *   jobTypes: ['sendEmail', 'generatePDF'],
 * });
 *
 * // Listen for events
 * JobWorker.on('job:complete', (event) => {
 *   console.log(`Job ${event.job.name} completed`);
 * });
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await JobWorker.stop();
 *   process.exit(0);
 * });
 * ```
 *
 * @module JobBuilder/JobWorker
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
exports.JobWorker = void 0;
const events_1 = require("events");
const JobStorage_1 = __importDefault(require("./JobStorage"));
const JobBuilder_1 = require("./JobBuilder");
const JobQueue_1 = __importDefault(require("./JobQueue"));
const builderTracing_1 = require("../builderTracing");
const builderConfig_1 = require("../builderConfig");
const logger_1 = __importDefault(require("../../../shared/logger"));
// ==================== CONSTANTS ====================
const DEFAULT_OPTIONS = {
    concurrency: 5,
    pollInterval: 1000,
    maxJobsPerPoll: 10,
    processScheduled: true,
    jobTypes: [],
};
// ==================== JOB WORKER CLASS ====================
class JobWorkerClass extends events_1.EventEmitter {
    constructor() {
        super();
        this.running = false;
        this.pollTimer = null;
        this.activeJobs = new Set();
        this.processedCount = 0;
        this.failedCount = 0;
        this.options = Object.assign({}, DEFAULT_OPTIONS);
    }
    // ==================== LIFECYCLE METHODS ====================
    /**
     * Start the worker
     *
     * @param options - Worker configuration
     */
    start(options = {}) {
        if (this.running) {
            logger_1.default.warn('JobWorker is already running');
            return;
        }
        // Merge options with defaults and config
        const config = (0, builderConfig_1.getBuilderConfig)();
        const jobConfig = 'job' in config ? config.job : {};
        this.options = Object.assign(Object.assign(Object.assign({}, DEFAULT_OPTIONS), { concurrency: jobConfig.defaultConcurrency || DEFAULT_OPTIONS.concurrency, pollInterval: jobConfig.pollInterval || DEFAULT_OPTIONS.pollInterval }), options);
        this.running = true;
        this.startedAt = new Date();
        this.processedCount = 0;
        this.failedCount = 0;
        logger_1.default.info('JobWorker started', {
            concurrency: this.options.concurrency,
            pollInterval: this.options.pollInterval,
            jobTypes: this.options.jobTypes.length > 0 ? this.options.jobTypes : 'all',
        });
        this.emitEvent('worker:start');
        // Start polling
        this.poll();
    }
    /**
     * Stop the worker gracefully
     *
     * Waits for active jobs to complete before stopping.
     *
     * @param timeoutMs - Maximum wait time for active jobs (default: 30s)
     */
    stop() {
        return __awaiter(this, arguments, void 0, function* (timeoutMs = 30000) {
            if (!this.running) {
                return;
            }
            logger_1.default.info('JobWorker stopping...', {
                activeJobs: this.activeJobs.size,
            });
            this.running = false;
            // Clear poll timer
            if (this.pollTimer) {
                clearTimeout(this.pollTimer);
                this.pollTimer = null;
            }
            // Wait for active jobs to complete
            const startTime = Date.now();
            while (this.activeJobs.size > 0 && Date.now() - startTime < timeoutMs) {
                yield new Promise(resolve => setTimeout(resolve, 100));
            }
            if (this.activeJobs.size > 0) {
                logger_1.default.warn('JobWorker stopped with active jobs', {
                    activeJobs: this.activeJobs.size,
                });
            }
            this.emitEvent('worker:stop');
            logger_1.default.info('JobWorker stopped', {
                processed: this.processedCount,
                failed: this.failedCount,
                uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
            });
        });
    }
    /**
     * Check if worker is running
     */
    isRunning() {
        return this.running;
    }
    /**
     * Get worker status
     */
    getStatus() {
        return {
            running: this.running,
            activeJobs: this.activeJobs.size,
            processedCount: this.processedCount,
            failedCount: this.failedCount,
            startedAt: this.startedAt,
        };
    }
    // ==================== POLLING METHODS ====================
    /**
     * Poll for jobs and process them
     */
    poll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                return;
            }
            try {
                // Activate scheduled jobs first
                if (this.options.processScheduled) {
                    yield JobQueue_1.default.activateScheduled();
                }
                // Calculate available slots
                const availableSlots = this.options.concurrency - this.activeJobs.size;
                if (availableSlots > 0) {
                    // Claim and process jobs
                    const jobsToClaim = Math.min(availableSlots, this.options.maxJobsPerPoll);
                    for (let i = 0; i < jobsToClaim; i++) {
                        const job = yield JobStorage_1.default.claimNext(this.options.jobTypes.length > 0 ? this.options.jobTypes : undefined);
                        if (job) {
                            // Process job asynchronously (don't await)
                            this.processJob(job).catch(error => {
                                logger_1.default.error('Error processing job', {
                                    jobId: job._id.toString(),
                                    error: error.message,
                                });
                            });
                        }
                        else {
                            // No more jobs available
                            break;
                        }
                    }
                }
            }
            catch (error) {
                logger_1.default.error('Error in poll cycle', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            // Schedule next poll
            if (this.running) {
                this.pollTimer = setTimeout(() => this.poll(), this.options.pollInterval);
            }
        });
    }
    // ==================== JOB PROCESSING ====================
    /**
     * Process a single job
     */
    processJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = job._id.toString();
            // Track active job
            this.activeJobs.add(jobId);
            return (0, builderTracing_1.traceOperation)('JobWorker', 'processJob', () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                (0, builderTracing_1.addSpanAttributes)({
                    'job.id': jobId,
                    'job.name': job.name,
                    'job.attempt': job.attempts,
                    'job.priority': job.priority,
                });
                this.emitEvent('job:start', job);
                const startTime = Date.now();
                try {
                    // Get handler
                    const handler = JobBuilder_1.JobBuilder.getHandler(job.name);
                    if (!handler) {
                        throw new Error(`No handler registered for job type: ${job.name}`);
                    }
                    // Set up timeout
                    let timeoutId;
                    const timeout = job.timeout || ((_a = (0, builderConfig_1.getBuilderConfig)().job) === null || _a === void 0 ? void 0 : _a.jobTimeout) || 60000;
                    const timeoutPromise = new Promise((_, reject) => {
                        timeoutId = setTimeout(() => {
                            reject(new Error(`Job timed out after ${timeout}ms`));
                        }, timeout);
                    });
                    // Execute handler with timeout
                    const result = yield Promise.race([
                        handler(job.payload, job),
                        timeoutPromise,
                    ]);
                    // Clear timeout
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    // Mark as completed
                    yield JobStorage_1.default.complete(jobId, result);
                    const duration = Date.now() - startTime;
                    this.processedCount++;
                    (0, builderTracing_1.recordSpanEvent)('job_completed', {
                        jobId,
                        duration,
                        result: JSON.stringify(result).slice(0, 100),
                    });
                    logger_1.default.info('Job completed', {
                        jobId,
                        name: job.name,
                        duration,
                        attempt: job.attempts,
                    });
                    this.emitEvent('job:complete', job, result);
                    // Handle job chaining
                    yield this.handleJobChain(job, result);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const duration = Date.now() - startTime;
                    // Determine if we should retry
                    const shouldRetry = job.attempts < job.maxAttempts;
                    // Get backoff configuration
                    const backoffConfig = ((_b = job.metadata) === null || _b === void 0 ? void 0 : _b.backoff) || { strategy: 'exponential' };
                    const retryDelay = this.calculateRetryDelay(job.attempts, backoffConfig.strategy, backoffConfig);
                    // Mark as failed (with potential retry)
                    yield JobStorage_1.default.fail(jobId, errorMessage, shouldRetry);
                    if (shouldRetry) {
                        this.failedCount++; // Still count as processed
                        (0, builderTracing_1.recordSpanEvent)('job_retry', {
                            jobId,
                            attempt: job.attempts,
                            nextRetry: new Date(Date.now() + retryDelay).toISOString(),
                            error: errorMessage,
                        });
                        logger_1.default.warn('Job failed, will retry', {
                            jobId,
                            name: job.name,
                            attempt: job.attempts,
                            maxAttempts: job.maxAttempts,
                            nextRetryIn: retryDelay,
                            error: errorMessage,
                        });
                        this.emitEvent('job:retry', job, undefined, error instanceof Error ? error : new Error(errorMessage));
                    }
                    else {
                        this.failedCount++;
                        (0, builderTracing_1.recordSpanEvent)('job_failed', {
                            jobId,
                            duration,
                            error: errorMessage,
                        });
                        logger_1.default.error('Job failed permanently', {
                            jobId,
                            name: job.name,
                            attempts: job.attempts,
                            error: errorMessage,
                        });
                        this.emitEvent('job:failed', job, undefined, error instanceof Error ? error : new Error(errorMessage));
                    }
                }
                finally {
                    // Remove from active jobs
                    this.activeJobs.delete(jobId);
                }
            }));
        });
    }
    /**
     * Process a specific job by ID (for testing)
     */
    processJobById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield JobStorage_1.default.findById(jobId);
            if (!job) {
                throw new Error(`Job not found: ${jobId}`);
            }
            // Claim the job first
            if (job.status === 'pending') {
                yield JobStorage_1.default.claimNext();
                const claimedJob = yield JobStorage_1.default.findById(jobId);
                if (claimedJob) {
                    yield this.processJob(claimedJob);
                }
            }
            else if (job.status === 'processing') {
                yield this.processJob(job);
            }
            else {
                throw new Error(`Cannot process job in status: ${job.status}`);
            }
        });
    }
    // ==================== HELPER METHODS ====================
    /**
     * Calculate retry delay based on backoff strategy
     */
    calculateRetryDelay(attempt, strategy, options) {
        const base = options.base || 5000;
        const maxDelay = options.maxDelay || 60 * 60 * 1000; // 1 hour max
        const multiplier = options.multiplier || 2;
        let delay;
        switch (strategy) {
            case 'fixed':
                delay = base;
                break;
            case 'linear':
                delay = base * attempt;
                break;
            case 'exponential':
            default:
                delay = base * Math.pow(multiplier, attempt - 1);
                break;
        }
        return Math.min(delay, maxDelay);
    }
    /**
     * Handle job chaining (onComplete)
     */
    handleJobChain(job, result) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const chain = (_a = job.metadata) === null || _a === void 0 ? void 0 : _a.chain;
            if (!chain) {
                return;
            }
            try {
                let payload;
                if (chain.payloadTransformer) {
                    // Transform result to payload
                    payload = chain.payloadTransformer(result);
                }
                else {
                    payload = chain.payload || {};
                }
                // Dispatch chained job
                yield new JobBuilder_1.JobBuilder()
                    .name(chain.handlerName)
                    .payload(payload)
                    .meta({ parentJobId: job._id.toString() })
                    .dispatch();
                logger_1.default.info('Chained job dispatched', {
                    parentJobId: job._id.toString(),
                    chainedHandler: chain.handlerName,
                });
            }
            catch (error) {
                logger_1.default.error('Failed to dispatch chained job', {
                    parentJobId: job._id.toString(),
                    chainedHandler: chain.handlerName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
    /**
     * Emit worker event
     */
    emitEvent(type, job, result, error) {
        const event = {
            type,
            job: job,
            result,
            error,
            timestamp: new Date(),
        };
        this.emit(type, event);
        this.emit('event', event); // Generic event listener
    }
    /**
     * Add event listener
     */
    on(event, listener) {
        return super.on(event, listener);
    }
    /**
     * Remove event listener
     */
    off(event, listener) {
        return super.off(event, listener);
    }
}
// ==================== SINGLETON EXPORT ====================
/**
 * Singleton JobWorker instance
 */
exports.JobWorker = new JobWorkerClass();
exports.default = exports.JobWorker;
