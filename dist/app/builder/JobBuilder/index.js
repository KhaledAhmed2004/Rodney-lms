"use strict";
/**
 * JobBuilder Module
 *
 * MongoDB-based background job processing system.
 * No external dependencies - uses existing MongoDB connection.
 *
 * @example
 * ```typescript
 * import { JobBuilder, JobWorker, JobQueue } from '@/app/builder';
 *
 * // Register handlers
 * JobBuilder.registerHandler('sendEmail', async (payload) => {
 *   await emailService.send(payload);
 * });
 *
 * // Dispatch a job
 * await new JobBuilder()
 *   .name('sendEmail')
 *   .payload({ to: 'user@example.com' })
 *   .dispatch();
 *
 * // Start worker (opt-in)
 * JobWorker.start({ concurrency: 5 });
 * ```
 *
 * @see doc/job-builder-complete-guide-bn.md for full documentation
 * @module JobBuilder
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfHandler = exports.notificationHandler = exports.emailHandler = exports.registerBuiltInHandlers = exports.Job = exports.JobStorage = exports.JobScheduler = exports.JobWorker = exports.JobQueue = exports.dispatchJob = exports.JobBuilder = void 0;
// ==================== CORE EXPORTS ====================
var JobBuilder_1 = require("./JobBuilder");
Object.defineProperty(exports, "JobBuilder", { enumerable: true, get: function () { return JobBuilder_1.JobBuilder; } });
Object.defineProperty(exports, "dispatchJob", { enumerable: true, get: function () { return JobBuilder_1.dispatchJob; } });
var JobQueue_1 = require("./JobQueue");
Object.defineProperty(exports, "JobQueue", { enumerable: true, get: function () { return JobQueue_1.JobQueue; } });
var JobWorker_1 = require("./JobWorker");
Object.defineProperty(exports, "JobWorker", { enumerable: true, get: function () { return JobWorker_1.JobWorker; } });
var JobScheduler_1 = require("./JobScheduler");
Object.defineProperty(exports, "JobScheduler", { enumerable: true, get: function () { return JobScheduler_1.JobScheduler; } });
var JobStorage_1 = require("./JobStorage");
Object.defineProperty(exports, "JobStorage", { enumerable: true, get: function () { return JobStorage_1.JobStorage; } });
var Job_model_1 = require("./Job.model");
Object.defineProperty(exports, "Job", { enumerable: true, get: function () { return __importDefault(Job_model_1).default; } });
// ==================== HANDLER EXPORTS ====================
var handlers_1 = require("./handlers");
Object.defineProperty(exports, "registerBuiltInHandlers", { enumerable: true, get: function () { return handlers_1.registerBuiltInHandlers; } });
Object.defineProperty(exports, "emailHandler", { enumerable: true, get: function () { return handlers_1.emailHandler; } });
Object.defineProperty(exports, "notificationHandler", { enumerable: true, get: function () { return handlers_1.notificationHandler; } });
Object.defineProperty(exports, "pdfHandler", { enumerable: true, get: function () { return handlers_1.pdfHandler; } });
// ==================== DEFAULT EXPORT ====================
const JobBuilder_2 = require("./JobBuilder");
exports.default = JobBuilder_2.JobBuilder;
