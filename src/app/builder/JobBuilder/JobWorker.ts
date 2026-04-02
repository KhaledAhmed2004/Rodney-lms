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

import { EventEmitter } from 'events';
import JobStorage from './JobStorage';
import { JobBuilder } from './JobBuilder';
import JobQueue from './JobQueue';
import {
  IJob,
  IJobDocument,
  IWorkerOptions,
  IWorkerStatus,
  IWorkerEvent,
  WorkerEventType,
  WorkerEventListener,
  BackoffStrategy,
  IBackoffOptions,
} from './types';
import { traceOperation, addSpanAttributes, recordSpanEvent } from '../builderTracing';
import { getBuilderConfig } from '../builderConfig';
import { logger } from '../../../shared/logger';

// ==================== CONSTANTS ====================

const DEFAULT_OPTIONS: Required<IWorkerOptions> = {
  concurrency: 5,
  pollInterval: 1000,
  maxJobsPerPoll: 10,
  processScheduled: true,
  jobTypes: [],
};

// ==================== JOB WORKER CLASS ====================

class JobWorkerClass extends EventEmitter {
  private options: Required<IWorkerOptions>;
  private running: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private activeJobs: Set<string> = new Set();
  private processedCount: number = 0;
  private failedCount: number = 0;
  private startedAt?: Date;

  constructor() {
    super();
    this.options = { ...DEFAULT_OPTIONS };
  }

  // ==================== LIFECYCLE METHODS ====================

  /**
   * Start the worker
   *
   * @param options - Worker configuration
   */
  start(options: IWorkerOptions = {}): void {
    if (this.running) {
      logger.warn('JobWorker is already running');
      return;
    }

    // Merge options with defaults and config
    const config = getBuilderConfig();
    const jobConfig = 'job' in config ? (config as any).job : {};

    this.options = {
      ...DEFAULT_OPTIONS,
      concurrency: jobConfig.defaultConcurrency || DEFAULT_OPTIONS.concurrency,
      pollInterval: jobConfig.pollInterval || DEFAULT_OPTIONS.pollInterval,
      ...options,
    };

    this.running = true;
    this.startedAt = new Date();
    this.processedCount = 0;
    this.failedCount = 0;

    logger.info('JobWorker started', {
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
  async stop(timeoutMs: number = 30000): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('JobWorker stopping...', {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeJobs.size > 0) {
      logger.warn('JobWorker stopped with active jobs', {
        activeJobs: this.activeJobs.size,
      });
    }

    this.emitEvent('worker:stop');

    logger.info('JobWorker stopped', {
      processed: this.processedCount,
      failed: this.failedCount,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
    });
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get worker status
   */
  getStatus(): IWorkerStatus {
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
  private async poll(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Activate scheduled jobs first
      if (this.options.processScheduled) {
        await JobQueue.activateScheduled();
      }

      // Calculate available slots
      const availableSlots = this.options.concurrency - this.activeJobs.size;

      if (availableSlots > 0) {
        // Claim and process jobs
        const jobsToClaim = Math.min(availableSlots, this.options.maxJobsPerPoll);

        for (let i = 0; i < jobsToClaim; i++) {
          const job = await JobStorage.claimNext(
            this.options.jobTypes.length > 0 ? this.options.jobTypes : undefined
          );

          if (job) {
            // Process job asynchronously (don't await)
            this.processJob(job).catch(error => {
              logger.error('Error processing job', {
                jobId: job._id.toString(),
                error: error.message,
              });
            });
          } else {
            // No more jobs available
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Error in poll cycle', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Schedule next poll
    if (this.running) {
      this.pollTimer = setTimeout(() => this.poll(), this.options.pollInterval);
    }
  }

  // ==================== JOB PROCESSING ====================

  /**
   * Process a single job
   */
  private async processJob(job: IJobDocument): Promise<void> {
    const jobId = job._id.toString();

    // Track active job
    this.activeJobs.add(jobId);

    return traceOperation('JobWorker', 'processJob', async () => {
      addSpanAttributes({
        'job.id': jobId,
        'job.name': job.name,
        'job.attempt': job.attempts,
        'job.priority': job.priority,
      });

      this.emitEvent('job:start', job);

      const startTime = Date.now();

      try {
        // Get handler
        const handler = JobBuilder.getHandler(job.name);

        if (!handler) {
          throw new Error(`No handler registered for job type: ${job.name}`);
        }

        // Set up timeout
        let timeoutId: NodeJS.Timeout | undefined;
        const timeout = job.timeout || (getBuilderConfig() as any).job?.jobTimeout || 60000;

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Job timed out after ${timeout}ms`));
          }, timeout);
        });

        // Execute handler with timeout
        const result = await Promise.race([
          handler(job.payload, job as IJob),
          timeoutPromise,
        ]);

        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Mark as completed
        await JobStorage.complete(jobId, result);

        const duration = Date.now() - startTime;
        this.processedCount++;

        recordSpanEvent('job_completed', {
          jobId,
          duration,
          result: JSON.stringify(result).slice(0, 100),
        });

        logger.info('Job completed', {
          jobId,
          name: job.name,
          duration,
          attempt: job.attempts,
        });

        this.emitEvent('job:complete', job, result);

        // Handle job chaining
        await this.handleJobChain(job, result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const duration = Date.now() - startTime;

        // Determine if we should retry
        const shouldRetry = job.attempts < job.maxAttempts;

        // Get backoff configuration
        const backoffConfig = job.metadata?.backoff || { strategy: 'exponential' };
        const retryDelay = this.calculateRetryDelay(
          job.attempts,
          backoffConfig.strategy as BackoffStrategy,
          backoffConfig as IBackoffOptions
        );

        // Mark as failed (with potential retry)
        await JobStorage.fail(jobId, errorMessage, shouldRetry);

        if (shouldRetry) {
          this.failedCount++; // Still count as processed
          recordSpanEvent('job_retry', {
            jobId,
            attempt: job.attempts,
            nextRetry: new Date(Date.now() + retryDelay).toISOString(),
            error: errorMessage,
          });

          logger.warn('Job failed, will retry', {
            jobId,
            name: job.name,
            attempt: job.attempts,
            maxAttempts: job.maxAttempts,
            nextRetryIn: retryDelay,
            error: errorMessage,
          });

          this.emitEvent('job:retry', job, undefined, error instanceof Error ? error : new Error(errorMessage));
        } else {
          this.failedCount++;
          recordSpanEvent('job_failed', {
            jobId,
            duration,
            error: errorMessage,
          });

          logger.error('Job failed permanently', {
            jobId,
            name: job.name,
            attempts: job.attempts,
            error: errorMessage,
          });

          this.emitEvent('job:failed', job, undefined, error instanceof Error ? error : new Error(errorMessage));
        }
      } finally {
        // Remove from active jobs
        this.activeJobs.delete(jobId);
      }
    });
  }

  /**
   * Process a specific job by ID (for testing)
   */
  async processJobById(jobId: string): Promise<void> {
    const job = await JobStorage.findById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Claim the job first
    if (job.status === 'pending') {
      await JobStorage.claimNext();
      const claimedJob = await JobStorage.findById(jobId);
      if (claimedJob) {
        await this.processJob(claimedJob);
      }
    } else if (job.status === 'processing') {
      await this.processJob(job);
    } else {
      throw new Error(`Cannot process job in status: ${job.status}`);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(
    attempt: number,
    strategy: BackoffStrategy,
    options: IBackoffOptions
  ): number {
    const base = options.base || 5000;
    const maxDelay = options.maxDelay || 60 * 60 * 1000; // 1 hour max
    const multiplier = options.multiplier || 2;

    let delay: number;

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
  private async handleJobChain(job: IJobDocument, result: any): Promise<void> {
    const chain = job.metadata?.chain;

    if (!chain) {
      return;
    }

    try {
      let payload: Record<string, any>;

      if (chain.payloadTransformer) {
        // Transform result to payload
        payload = chain.payloadTransformer(result);
      } else {
        payload = chain.payload || {};
      }

      // Dispatch chained job
      await new JobBuilder()
        .name(chain.handlerName)
        .payload(payload)
        .meta({ parentJobId: job._id.toString() })
        .dispatch();

      logger.info('Chained job dispatched', {
        parentJobId: job._id.toString(),
        chainedHandler: chain.handlerName,
      });
    } catch (error) {
      logger.error('Failed to dispatch chained job', {
        parentJobId: job._id.toString(),
        chainedHandler: chain.handlerName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Emit worker event
   */
  private emitEvent(
    type: WorkerEventType,
    job?: IJobDocument,
    result?: any,
    error?: Error
  ): void {
    const event: IWorkerEvent = {
      type,
      job: job as IJob,
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
  on(event: WorkerEventType | 'event', listener: WorkerEventListener): this {
    return super.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: WorkerEventType | 'event', listener: WorkerEventListener): this {
    return super.off(event, listener);
  }
}

// ==================== SINGLETON EXPORT ====================

/**
 * Singleton JobWorker instance
 */
export const JobWorker = new JobWorkerClass();

export default JobWorker;
