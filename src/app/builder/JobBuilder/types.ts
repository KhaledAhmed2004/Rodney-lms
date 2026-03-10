/**
 * JobBuilder Types
 *
 * All TypeScript interfaces and types for the JobBuilder system.
 *
 * @module JobBuilder/types
 */

import { Types, Document } from 'mongoose';

// ==================== JOB STATUS ====================

/**
 * Job status enum
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'scheduled' | 'cancelled';

// ==================== JOB INTERFACES ====================

/**
 * Job document interface (MongoDB schema)
 */
export interface IJob {
  _id: Types.ObjectId;
  /** Handler name (e.g., 'sendEmail', 'generatePDF') */
  name: string;
  /** Job payload/data */
  payload: Record<string, any>;
  /** Current job status */
  status: JobStatus;
  /** Job priority (1-10, higher = more priority) */
  priority: number;
  /** Current attempt count */
  attempts: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Last error message (if failed) */
  lastError?: string;
  /** When to execute (for delayed/scheduled jobs) */
  scheduledFor?: Date;
  /** Cron expression (for recurring jobs) */
  cronExpression?: string;
  /** Job timeout in milliseconds */
  timeout?: number;
  /** Job result data (after completion) */
  result?: any;
  /** When processing started */
  processedAt?: Date;
  /** When job completed */
  completedAt?: Date;
  /** When job failed */
  failedAt?: Date;
  /** Job metadata for tracing */
  metadata?: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    [key: string]: any;
  };
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job document with Mongoose methods
 */
export interface IJobDocument extends IJob, Document {
  _id: Types.ObjectId;
}

/**
 * Job creation options (used by JobBuilder)
 */
export interface IJobOptions {
  name: string;
  payload: Record<string, any>;
  priority?: number;
  maxAttempts?: number;
  scheduledFor?: Date;
  cronExpression?: string;
  timeout?: number;
  metadata?: Record<string, any>;
}

// ==================== JOB HANDLER ====================

/**
 * Job handler function type
 *
 * @param payload - Job payload data
 * @param job - Full job document (for accessing metadata)
 * @returns Promise with result data (or void)
 *
 * @example
 * ```typescript
 * const emailHandler: JobHandler = async (payload, job) => {
 *   await sendEmail(payload.to, payload.subject);
 *   return { sent: true };
 * };
 * ```
 */
export type JobHandler<T = any, R = any> = (
  payload: T,
  job: IJob
) => Promise<R> | R;

/**
 * Handler registry type
 */
export type HandlerRegistry = Map<string, JobHandler>;

// ==================== JOB RESULT ====================

/**
 * Job execution result
 */
export interface IJobResult {
  success: boolean;
  jobId: string;
  status: JobStatus;
  result?: any;
  error?: string;
  attempts: number;
  duration?: number;
}

/**
 * Dispatch result (returned by JobBuilder.dispatch())
 */
export interface IDispatchResult {
  jobId: string;
  status: JobStatus;
  scheduledFor?: Date;
}

/**
 * Batch dispatch result
 */
export interface IBatchDispatchResult {
  dispatched: number;
  failed: number;
  jobs: IDispatchResult[];
  errors: Array<{ index: number; error: string }>;
}

// ==================== QUEUE STATS ====================

/**
 * Queue statistics
 */
export interface IQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  scheduled: number;
  cancelled: number;
  total: number;
}

/**
 * Detailed queue statistics with time ranges
 */
export interface IDetailedQueueStats extends IQueueStats {
  completedToday: number;
  failedToday: number;
  averageProcessingTime: number;
  oldestPending?: Date;
}

// ==================== WORKER OPTIONS ====================

/**
 * Worker configuration options
 */
export interface IWorkerOptions {
  /** Number of jobs to process concurrently (default: 5) */
  concurrency?: number;
  /** Polling interval in milliseconds (default: 1000) */
  pollInterval?: number;
  /** Maximum jobs to fetch per poll (default: 10) */
  maxJobsPerPoll?: number;
  /** Whether to process scheduled jobs (default: true) */
  processScheduled?: boolean;
  /** Job types to process (default: all) */
  jobTypes?: string[];
}

/**
 * Worker status
 */
export interface IWorkerStatus {
  running: boolean;
  activeJobs: number;
  processedCount: number;
  failedCount: number;
  startedAt?: Date;
}

// ==================== SCHEDULER OPTIONS ====================

/**
 * Scheduler configuration options
 */
export interface ISchedulerOptions {
  /** Timezone for cron expressions (default: 'Asia/Dhaka') */
  timezone?: string;
  /** Whether to run missed jobs on startup (default: false) */
  runMissedOnStartup?: boolean;
}

// ==================== BUILDER CONFIG ====================

/**
 * Job builder configuration (added to builderConfig.ts)
 */
export interface IJobConfig {
  /** Default job priority (1-10) */
  defaultPriority: number;
  /** Default max retry attempts */
  maxRetries: number;
  /** Default retry delay in milliseconds */
  retryDelay: number;
  /** Worker poll interval in milliseconds */
  pollInterval: number;
  /** Default worker concurrency */
  defaultConcurrency: number;
  /** Default job timeout in milliseconds */
  jobTimeout: number;
  /** TTL for completed jobs in seconds (default: 7 days) */
  completedJobTTL: number;
  /** Whether to record job metrics */
  recordMetrics: boolean;
}

// ==================== EVENT TYPES ====================

/**
 * Worker event types
 */
export type WorkerEventType =
  | 'worker:start'
  | 'worker:stop'
  | 'job:start'
  | 'job:complete'
  | 'job:failed'
  | 'job:retry'
  | 'job:timeout';

/**
 * Worker event payload
 */
export interface IWorkerEvent {
  type: WorkerEventType;
  job?: IJob;
  result?: any;
  error?: Error;
  timestamp: Date;
}

/**
 * Worker event listener
 */
export type WorkerEventListener = (event: IWorkerEvent) => void;

// ==================== QUERY OPTIONS ====================

/**
 * Job query options
 */
export interface IJobQueryOptions {
  status?: JobStatus | JobStatus[];
  name?: string | string[];
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  before?: Date;
  after?: Date;
}

/**
 * Purge options
 */
export interface IPurgeOptions {
  status?: JobStatus | JobStatus[];
  olderThan?: string | Date;
  name?: string;
}

// ==================== BACKOFF STRATEGY ====================

/**
 * Backoff strategy type
 */
export type BackoffStrategy = 'fixed' | 'exponential' | 'linear';

/**
 * Backoff options
 */
export interface IBackoffOptions {
  /** Base delay in milliseconds */
  base?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  multiplier?: number;
}

// ==================== JOB CHAIN ====================

/**
 * Job chain configuration (for onComplete)
 */
export interface IJobChain {
  /** Handler name to call on completion */
  handlerName: string;
  /** Function to transform result to next job payload */
  payloadTransformer?: (result: any) => Record<string, any>;
  /** Static payload (if no transformer) */
  payload?: Record<string, any>;
}

// ==================== BATCH JOB ====================

/**
 * Batch job definition
 */
export interface IBatchJobDefinition {
  name: string;
  payload: Record<string, any>;
  priority?: number;
  delay?: string;
  retries?: number;
}

export default {
  // Export nothing by default, types only
};
