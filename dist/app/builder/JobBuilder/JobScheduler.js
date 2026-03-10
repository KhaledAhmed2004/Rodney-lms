"use strict";
/**
 * JobScheduler - Cron Job Management
 *
 * Manages recurring/scheduled jobs using cron expressions.
 * Creates new job instances based on cron schedules.
 *
 * @example
 * ```typescript
 * // Register a cron job
 * JobScheduler.register('dailyReport', '0 9 * * *', {
 *   type: 'sales',
 *   format: 'pdf',
 * });
 *
 * // Start the scheduler
 * JobScheduler.start();
 *
 * // Stop the scheduler
 * JobScheduler.stop();
 *
 * // List registered schedules
 * const schedules = JobScheduler.list();
 * ```
 *
 * @module JobBuilder/JobScheduler
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
exports.JobScheduler = void 0;
const JobBuilder_1 = require("./JobBuilder");
const logger_1 = require("../../../shared/logger");
// ==================== HELPER FUNCTIONS ====================
/**
 * Parse cron expression to schedule parts
 * Supports: minute hour dayOfMonth month dayOfWeek
 */
function parseCronExpression(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
        throw new Error('Invalid cron expression: ' +
            expression +
            '. Expected 5 parts: minute hour dayOfMonth month dayOfWeek');
    }
    return {
        minute: parseCronPart(parts[0], 0, 59),
        hour: parseCronPart(parts[1], 0, 23),
        dayOfMonth: parseCronPart(parts[2], 1, 31),
        month: parseCronPart(parts[3], 1, 12),
        dayOfWeek: parseCronPart(parts[4], 0, 6),
    };
}
/**
 * Parse a single cron part (e.g., star/5, 1,2,3, 10-20)
 */
function parseCronPart(part, min, max) {
    const values = [];
    // Handle wildcard
    if (part === '*') {
        for (let i = min; i <= max; i++) {
            values.push(i);
        }
        return values;
    }
    // Handle step (*/n)
    if (part.startsWith('*/')) {
        const step = parseInt(part.slice(2));
        if (isNaN(step) || step <= 0) {
            throw new Error('Invalid step value: ' + part);
        }
        for (let i = min; i <= max; i += step) {
            values.push(i);
        }
        return values;
    }
    // Handle comma-separated values
    const segments = part.split(',');
    for (const segment of segments) {
        // Handle range (n-m)
        if (segment.includes('-')) {
            const [start, end] = segment.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
                throw new Error('Invalid range: ' + segment);
            }
            for (let i = start; i <= end; i++) {
                values.push(i);
            }
        }
        else {
            // Single value
            const value = parseInt(segment);
            if (isNaN(value) || value < min || value > max) {
                throw new Error('Invalid value: ' + segment + ' (must be ' + min + '-' + max + ')');
            }
            values.push(value);
        }
    }
    return [...new Set(values)].sort((a, b) => a - b);
}
/**
 * Check if current time matches cron expression
 */
function matchesCron(date, parsed) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const dayOfWeek = date.getDay();
    return (parsed.minute.includes(minute) &&
        parsed.hour.includes(hour) &&
        parsed.dayOfMonth.includes(dayOfMonth) &&
        parsed.month.includes(month) &&
        parsed.dayOfWeek.includes(dayOfWeek));
}
/**
 * Calculate next run time for a cron expression
 */
function getNextRunTime(cronExpression, after = new Date()) {
    const parsed = parseCronExpression(cronExpression);
    const next = new Date(after);
    // Start from next minute
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);
    // Try up to 1 year ahead
    const maxIterations = 365 * 24 * 60;
    for (let i = 0; i < maxIterations; i++) {
        if (matchesCron(next, parsed)) {
            return next;
        }
        next.setMinutes(next.getMinutes() + 1);
    }
    throw new Error('Could not find next run time for: ' + cronExpression);
}
// ==================== JOB SCHEDULER CLASS ====================
class JobSchedulerClass {
    constructor() {
        this.schedules = new Map();
        this.running = false;
        this.checkTimer = null;
        this.lastCheckMinute = -1;
        this.options = {
            timezone: 'Asia/Dhaka',
            runMissedOnStartup: false,
        };
    }
    // ==================== REGISTRATION METHODS ====================
    /**
     * Register a cron job
     *
     * @param name - Job handler name
     * @param cronExpression - Cron expression (e.g., '0 9 * * *')
     * @param payload - Job payload
     * @param options - Additional options
     *
     * @example
     * ```typescript
     * // Daily at 9 AM
     * JobScheduler.register('dailyReport', '0 9 * * *', {
     *   type: 'sales',
     * });
     *
     * // Every Monday at 10 AM
     * JobScheduler.register('weeklyDigest', '0 10 * * 1', {
     *   type: 'digest',
     * });
     *
     * // Every 5 minutes (use asterisk-slash-5 pattern)
     * JobScheduler.register('healthCheck', '0,5,10,15,20,25,30,35,40,45,50,55 * * * *', {});
     * ```
     */
    register(name, cronExpression, payload = {}, options = {}) {
        var _a, _b;
        // Validate cron expression
        parseCronExpression(cronExpression);
        const schedule = {
            name,
            cronExpression,
            payload,
            priority: (_a = options.priority) !== null && _a !== void 0 ? _a : 5,
            enabled: (_b = options.enabled) !== null && _b !== void 0 ? _b : true,
            nextRun: getNextRunTime(cronExpression),
        };
        this.schedules.set(name, schedule);
        logger_1.logger.info('Cron job registered', {
            name,
            cronExpression,
            nextRun: schedule.nextRun,
        });
    }
    /**
     * Unregister a cron job
     */
    unregister(name) {
        const deleted = this.schedules.delete(name);
        if (deleted) {
            logger_1.logger.info('Cron job unregistered', { name });
        }
        return deleted;
    }
    /**
     * Enable a cron job
     */
    enable(name) {
        const schedule = this.schedules.get(name);
        if (schedule) {
            schedule.enabled = true;
            schedule.nextRun = getNextRunTime(schedule.cronExpression);
            return true;
        }
        return false;
    }
    /**
     * Disable a cron job
     */
    disable(name) {
        const schedule = this.schedules.get(name);
        if (schedule) {
            schedule.enabled = false;
            return true;
        }
        return false;
    }
    /**
     * List all registered cron jobs
     */
    list() {
        return Array.from(this.schedules.values());
    }
    /**
     * Get a specific cron job
     */
    get(name) {
        return this.schedules.get(name);
    }
    // ==================== LIFECYCLE METHODS ====================
    /**
     * Start the scheduler
     */
    start(options = {}) {
        if (this.running) {
            logger_1.logger.warn('JobScheduler is already running');
            return;
        }
        this.options = Object.assign(Object.assign({}, this.options), options);
        this.running = true;
        logger_1.logger.info('JobScheduler started', {
            scheduledJobs: this.schedules.size,
            timezone: this.options.timezone,
        });
        // Run missed jobs if configured
        if (this.options.runMissedOnStartup) {
            this.runMissedJobs();
        }
        // Start checking every minute
        this.check();
    }
    /**
     * Stop the scheduler
     */
    stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.checkTimer) {
            clearTimeout(this.checkTimer);
            this.checkTimer = null;
        }
        logger_1.logger.info('JobScheduler stopped');
    }
    /**
     * Check if scheduler is running
     */
    isRunning() {
        return this.running;
    }
    // ==================== EXECUTION METHODS ====================
    /**
     * Check and dispatch due jobs
     */
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                return;
            }
            const now = new Date();
            const currentMinute = now.getMinutes();
            // Only run once per minute
            if (currentMinute !== this.lastCheckMinute) {
                this.lastCheckMinute = currentMinute;
                for (const [name, schedule] of this.schedules) {
                    if (!schedule.enabled) {
                        continue;
                    }
                    try {
                        const parsed = parseCronExpression(schedule.cronExpression);
                        if (matchesCron(now, parsed)) {
                            yield this.dispatchJob(schedule);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error('Error checking cron schedule', {
                            name,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
            }
            // Schedule next check (every 10 seconds to ensure we don't miss a minute)
            if (this.running) {
                this.checkTimer = setTimeout(() => this.check(), 10000);
            }
        });
    }
    /**
     * Dispatch a scheduled job
     */
    dispatchJob(schedule) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield new JobBuilder_1.JobBuilder()
                    .name(schedule.name)
                    .payload(schedule.payload)
                    .priority(schedule.priority)
                    .meta({
                    scheduledJob: true,
                    cronExpression: schedule.cronExpression,
                })
                    .dispatch();
                schedule.lastRun = new Date();
                schedule.nextRun = getNextRunTime(schedule.cronExpression);
                logger_1.logger.info('Scheduled job dispatched', {
                    name: schedule.name,
                    jobId: result.jobId,
                    nextRun: schedule.nextRun,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to dispatch scheduled job', {
                    name: schedule.name,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
    /**
     * Run missed jobs on startup
     */
    runMissedJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            // This would require tracking last run times persistently
            // For now, just log a warning
            logger_1.logger.warn('runMissedOnStartup is not yet implemented');
        });
    }
    /**
     * Manually trigger a scheduled job
     */
    trigger(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const schedule = this.schedules.get(name);
            if (!schedule) {
                return null;
            }
            const result = yield new JobBuilder_1.JobBuilder()
                .name(schedule.name)
                .payload(schedule.payload)
                .priority(schedule.priority)
                .meta({
                scheduledJob: true,
                manualTrigger: true,
                cronExpression: schedule.cronExpression,
            })
                .dispatch();
            schedule.lastRun = new Date();
            logger_1.logger.info('Scheduled job manually triggered', {
                name,
                jobId: result.jobId,
            });
            return result.jobId;
        });
    }
    // ==================== UTILITY METHODS ====================
    /**
     * Validate a cron expression
     */
    validateCron(cronExpression) {
        try {
            parseCronExpression(cronExpression);
            const nextRun = getNextRunTime(cronExpression);
            return { valid: true, nextRun };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Get next N run times for a cron expression
     */
    getNextRuns(cronExpression, count = 5) {
        const runs = [];
        let after = new Date();
        for (let i = 0; i < count; i++) {
            const next = getNextRunTime(cronExpression, after);
            runs.push(next);
            after = next;
        }
        return runs;
    }
}
// ==================== SINGLETON EXPORT ====================
/**
 * Singleton JobScheduler instance
 */
exports.JobScheduler = new JobSchedulerClass();
exports.default = exports.JobScheduler;
