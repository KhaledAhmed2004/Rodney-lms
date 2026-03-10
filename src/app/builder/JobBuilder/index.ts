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

// ==================== CORE EXPORTS ====================

export { JobBuilder, dispatchJob } from './JobBuilder';
export { JobQueue } from './JobQueue';
export { JobWorker } from './JobWorker';
export { JobScheduler } from './JobScheduler';
export { JobStorage } from './JobStorage';
export { default as Job } from './Job.model';

// ==================== TYPE EXPORTS ====================

export type {
  // Job types
  IJob,
  IJobDocument,
  IJobOptions,
  JobStatus,
  JobHandler,
  HandlerRegistry,

  // Result types
  IJobResult,
  IDispatchResult,
  IBatchDispatchResult,

  // Queue types
  IQueueStats,
  IDetailedQueueStats,
  IJobQueryOptions,
  IPurgeOptions,

  // Worker types
  IWorkerOptions,
  IWorkerStatus,
  IWorkerEvent,
  WorkerEventType,
  WorkerEventListener,

  // Scheduler types
  ISchedulerOptions,

  // Backoff types
  BackoffStrategy,
  IBackoffOptions,

  // Chain types
  IJobChain,
  IBatchJobDefinition,

  // Config types
  IJobConfig,
} from './types';

// ==================== HANDLER EXPORTS ====================

export {
  registerBuiltInHandlers,
  emailHandler,
  notificationHandler,
  pdfHandler,
} from './handlers';

export type {
  IEmailJobPayload,
  IEmailJobResult,
  INotificationJobPayload,
  INotificationJobResult,
  IPdfJobPayload,
  IPdfJobResult,
} from './handlers';

// ==================== DEFAULT EXPORT ====================

import { JobBuilder } from './JobBuilder';
export default JobBuilder;
