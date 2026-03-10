"use strict";
/**
 * JobBuilder - Chainable Job Creation API
 *
 * A fluent builder for creating and dispatching background jobs.
 * Similar API to EmailBuilder and NotificationBuilder.
 *
 * @example
 * ```typescript
 * // Simple job
 * await new JobBuilder()
 *   .name('sendEmail')
 *   .payload({ to: 'user@example.com' })
 *   .dispatch();
 *
 * // Delayed job with retries
 * await new JobBuilder()
 *   .name('processOrder')
 *   .payload({ orderId: '123' })
 *   .delay('5m')
 *   .priority(10)
 *   .retries(5)
 *   .dispatch();
 *
 * // Scheduled cron job
 * await new JobBuilder()
 *   .name('dailyReport')
 *   .payload({ type: 'sales' })
 *   .schedule('0 9 * * *')
 *   .dispatch();
 * ```
 *
 * @see doc/job-builder-complete-guide-bn.md for full documentation
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
exports.JobBuilder = void 0;
exports.dispatchJob = dispatchJob;
const JobStorage_1 = __importDefault(require("./JobStorage"));
const BuilderError_1 = require("../BuilderError");
const builderTracing_1 = require("../builderTracing");
const builderConfig_1 = require("../builderConfig");
// ==================== HELPER FUNCTIONS ====================
/**
 * Parse duration string to milliseconds
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
// ==================== HANDLER REGISTRY ====================
const handlerRegistry = new Map();
// ==================== JOB BUILDER CLASS ====================
class JobBuilder {
    // ==================== STATIC METHODS ====================
    /**
     * Register a job handler
     *
     * @param name - Handler name (used in .name())
     * @param handler - Async function to process the job
     *
     * @example
     * ```typescript
     * JobBuilder.registerHandler('sendEmail', async (payload) => {
     *   await emailService.send(payload.to, payload.subject);
     *   return { sent: true };
     * });
     * ```
     */
    static registerHandler(name, handler) {
        if (handlerRegistry.has(name)) {
            console.warn(`Handler "${name}" is being overwritten`);
        }
        handlerRegistry.set(name, handler);
    }
    /**
     * Get a registered handler
     */
    static getHandler(name) {
        return handlerRegistry.get(name);
    }
    /**
     * Check if handler exists
     */
    static hasHandler(name) {
        return handlerRegistry.has(name);
    }
    /**
     * List all registered handlers
     */
    static listHandlers() {
        return Array.from(handlerRegistry.keys());
    }
    /**
     * Dispatch multiple jobs at once
     *
     * @param jobs - Array of job definitions
     * @returns Batch dispatch result
     *
     * @example
     * ```typescript
     * await JobBuilder.dispatchBatch([
     *   { name: 'sendEmail', payload: { to: 'user1@example.com' } },
     *   { name: 'sendEmail', payload: { to: 'user2@example.com' } },
     *   { name: 'sendEmail', payload: { to: 'user3@example.com' } },
     * ]);
     * ```
     */
    static dispatchBatch(jobs) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobBuilder', 'dispatchBatch', () => __awaiter(this, void 0, void 0, function* () {
                (0, builderTracing_1.addSpanAttributes)({
                    'batch.size': jobs.length,
                });
                const results = [];
                const errors = [];
                const jobOptions = jobs.map((job, index) => {
                    var _a, _b;
                    try {
                        let scheduledFor;
                        if (job.delay) {
                            scheduledFor = new Date(Date.now() + parseDuration(job.delay));
                        }
                        return {
                            name: job.name,
                            payload: job.payload,
                            priority: (_a = job.priority) !== null && _a !== void 0 ? _a : 5,
                            maxAttempts: (_b = job.retries) !== null && _b !== void 0 ? _b : 3,
                            scheduledFor,
                        };
                    }
                    catch (error) {
                        errors.push({
                            index,
                            error: error instanceof Error ? error.message : String(error),
                        });
                        return null;
                    }
                }).filter(Boolean);
                if (jobOptions.length > 0) {
                    const createdJobs = yield JobStorage_1.default.createMany(jobOptions);
                    for (const job of createdJobs) {
                        results.push({
                            jobId: job._id.toString(),
                            status: job.status,
                            scheduledFor: job.scheduledFor,
                        });
                    }
                }
                (0, builderTracing_1.recordSpanEvent)('batch_dispatched', {
                    dispatched: results.length,
                    failed: errors.length,
                });
                return {
                    dispatched: results.length,
                    failed: errors.length,
                    jobs: results,
                    errors,
                };
            }));
        });
    }
    /**
     * Find a job by ID
     */
    static findById(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            return JobStorage_1.default.findById(jobId);
        });
    }
    /**
     * Cancel a pending job
     */
    static cancel(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield JobStorage_1.default.cancel(jobId);
            return result !== null;
        });
    }
    /**
     * Retry a failed job
     */
    static retry(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield JobStorage_1.default.retry(jobId);
            return result !== null;
        });
    }
    // ==================== CONSTRUCTOR ====================
    constructor() {
        // Job configuration
        this._name = '';
        this._payload = {};
        this._priority = 5;
        this._maxAttempts = 3;
        this._metadata = {};
        this._backoffStrategy = 'exponential';
        this._backoffOptions = {};
        // Load defaults from config
        const config = (0, builderConfig_1.getBuilderConfig)();
        if ('job' in config) {
            const jobConfig = config.job;
            this._priority = jobConfig.defaultPriority || 5;
            this._maxAttempts = jobConfig.maxRetries || 3;
            this._timeout = jobConfig.jobTimeout;
        }
    }
    // ==================== CHAINABLE METHODS ====================
    /**
     * Set job handler name
     *
     * @param name - Handler name (must be registered)
     */
    name(name) {
        this._name = name;
        return this;
    }
    /**
     * Set job payload data
     *
     * @param payload - Data to pass to handler
     */
    payload(payload) {
        this._payload = Object.assign(Object.assign({}, this._payload), payload);
        return this;
    }
    /**
     * Set job priority (1-10, higher = more priority)
     *
     * @param priority - Priority level
     */
    priority(priority) {
        if (priority < 1 || priority > 10) {
            throw new Error('Priority must be between 1 and 10');
        }
        this._priority = priority;
        return this;
    }
    /**
     * Set maximum retry attempts
     *
     * @param attempts - Max attempts (including first)
     */
    retries(attempts) {
        this._maxAttempts = Math.max(1, attempts);
        return this;
    }
    /**
     * Delay job execution
     *
     * @param duration - Delay duration (e.g., '5m', '2h', '1d')
     */
    delay(duration) {
        const ms = parseDuration(duration);
        this._scheduledFor = new Date(Date.now() + ms);
        return this;
    }
    /**
     * Schedule job for specific date/time
     *
     * @param date - When to execute
     */
    at(date) {
        this._scheduledFor = date;
        return this;
    }
    /**
     * Schedule recurring job with cron expression
     *
     * @param cronExpression - Cron syntax (e.g., '0 9 * * *')
     *
     * @example
     * ```typescript
     * // Every day at 9 AM
     * .schedule('0 9 * * *')
     *
     * // Every Monday at 10 AM
     * .schedule('0 10 * * 1')
     *
     * // Every 5 minutes
     * .schedule('*\/5 * * * *')
     * ```
     */
    schedule(cronExpression) {
        this._cronExpression = cronExpression;
        return this;
    }
    /**
     * Set job timeout
     *
     * @param duration - Timeout duration (e.g., '5m', '1h')
     */
    timeout(duration) {
        this._timeout = parseDuration(duration);
        return this;
    }
    /**
     * Set job metadata
     *
     * @param metadata - Additional metadata
     */
    meta(metadata) {
        this._metadata = Object.assign(Object.assign({}, this._metadata), metadata);
        return this;
    }
    /**
     * Set backoff strategy for retries
     *
     * @param strategy - 'fixed', 'exponential', or 'linear'
     * @param options - Backoff options
     */
    backoff(strategy, options = {}) {
        this._backoffStrategy = strategy;
        this._backoffOptions = options;
        return this;
    }
    /**
     * Chain another job on completion
     *
     * @param handlerName - Handler to call when this job completes
     * @param payloadOrTransformer - Static payload or transformer function
     */
    onComplete(handlerName, payloadOrTransformer) {
        if (typeof payloadOrTransformer === 'function') {
            this._chain = {
                handlerName,
                payloadTransformer: payloadOrTransformer,
            };
        }
        else {
            this._chain = {
                handlerName,
                payload: payloadOrTransformer,
            };
        }
        return this;
    }
    // ==================== EXECUTION METHODS ====================
    /**
     * Dispatch the job to the queue
     *
     * @returns Dispatch result with job ID
     */
    dispatch() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('JobBuilder', 'dispatch', () => __awaiter(this, void 0, void 0, function* () {
                // Validation
                if (!this._name) {
                    throw new BuilderError_1.BuilderError('Job name is required. Use .name() to set it.', 'JobBuilder', 'dispatch');
                }
                if (!handlerRegistry.has(this._name)) {
                    console.warn(`Warning: Handler "${this._name}" is not registered. ` +
                        `Make sure to register it before the worker starts.`);
                }
                (0, builderTracing_1.addSpanAttributes)({
                    'job.name': this._name,
                    'job.priority': this._priority,
                    'job.scheduled': !!this._scheduledFor || !!this._cronExpression,
                    'job.hasChain': !!this._chain,
                });
                // Store chain info in metadata
                if (this._chain) {
                    this._metadata.chain = this._chain;
                }
                // Store backoff config in metadata
                this._metadata.backoff = Object.assign({ strategy: this._backoffStrategy }, this._backoffOptions);
                // Create job
                const job = yield JobStorage_1.default.create({
                    name: this._name,
                    payload: this._payload,
                    priority: this._priority,
                    maxAttempts: this._maxAttempts,
                    scheduledFor: this._scheduledFor,
                    cronExpression: this._cronExpression,
                    timeout: this._timeout,
                    metadata: this._metadata,
                });
                (0, builderTracing_1.recordSpanEvent)('job_dispatched', {
                    jobId: job._id.toString(),
                    name: this._name,
                });
                return {
                    jobId: job._id.toString(),
                    status: job.status,
                    scheduledFor: job.scheduledFor,
                };
            }));
        });
    }
    /**
     * Dispatch and wait for completion (for testing)
     * Note: This is blocking and should only be used in tests
     */
    dispatchAndWait() {
        return __awaiter(this, arguments, void 0, function* (timeoutMs = 30000) {
            const { jobId } = yield this.dispatch();
            const startTime = Date.now();
            const pollInterval = 100;
            while (Date.now() - startTime < timeoutMs) {
                const job = yield JobStorage_1.default.findById(jobId);
                if (job && (job.status === 'completed' || job.status === 'failed')) {
                    return job;
                }
                yield new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
        });
    }
    // ==================== HELPER METHODS ====================
    /**
     * Get current job configuration (for debugging)
     */
    toJSON() {
        return {
            name: this._name,
            payload: this._payload,
            priority: this._priority,
            maxAttempts: this._maxAttempts,
            scheduledFor: this._scheduledFor,
            cronExpression: this._cronExpression,
            timeout: this._timeout,
            metadata: this._metadata,
            backoff: {
                strategy: this._backoffStrategy,
                options: this._backoffOptions,
            },
            chain: this._chain,
        };
    }
}
exports.JobBuilder = JobBuilder;
// ==================== CONVENIENCE FUNCTIONS ====================
/**
 * Quick dispatch a job without builder pattern
 *
 * @example
 * ```typescript
 * await dispatchJob('sendEmail', { to: 'user@example.com' });
 * ```
 */
function dispatchJob(name, payload, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const builder = new JobBuilder().name(name).payload(payload);
        if (options === null || options === void 0 ? void 0 : options.priority)
            builder.priority(options.priority);
        if (options === null || options === void 0 ? void 0 : options.delay)
            builder.delay(options.delay);
        if (options === null || options === void 0 ? void 0 : options.retries)
            builder.retries(options.retries);
        return builder.dispatch();
    });
}
exports.default = JobBuilder;
