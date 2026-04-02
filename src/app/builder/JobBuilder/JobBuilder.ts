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

import JobStorage from './JobStorage';
import {
  IJob,
  IJobDocument,
  IDispatchResult,
  IBatchDispatchResult,
  IBatchJobDefinition,
  IJobChain,
  JobHandler,
  HandlerRegistry,
  BackoffStrategy,
  IBackoffOptions,
} from './types';
import { BuilderError } from '../BuilderError';
import { traceOperation, addSpanAttributes, recordSpanEvent } from '../builderTracing';
import { getBuilderConfig } from '../builderConfig';

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Use: 30s, 5m, 2h, 1d, 1w`
    );
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

// ==================== HANDLER REGISTRY ====================

const handlerRegistry: HandlerRegistry = new Map();

// ==================== JOB BUILDER CLASS ====================

export class JobBuilder {
  // Job configuration
  private _name: string = '';
  private _payload: Record<string, any> = {};
  private _priority: number = 5;
  private _maxAttempts: number = 3;
  private _scheduledFor?: Date;
  private _cronExpression?: string;
  private _timeout?: number;
  private _metadata: Record<string, any> = {};
  private _backoffStrategy: BackoffStrategy = 'exponential';
  private _backoffOptions: IBackoffOptions = {};
  private _chain?: IJobChain;

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
  static registerHandler<T = any, R = any>(
    name: string,
    handler: JobHandler<T, R>
  ): void {
    if (handlerRegistry.has(name)) {
      console.warn(`Handler "${name}" is being overwritten`);
    }
    handlerRegistry.set(name, handler as JobHandler);
  }

  /**
   * Get a registered handler
   */
  static getHandler(name: string): JobHandler | undefined {
    return handlerRegistry.get(name);
  }

  /**
   * Check if handler exists
   */
  static hasHandler(name: string): boolean {
    return handlerRegistry.has(name);
  }

  /**
   * List all registered handlers
   */
  static listHandlers(): string[] {
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
  static async dispatchBatch(jobs: IBatchJobDefinition[]): Promise<IBatchDispatchResult> {
    return traceOperation('JobBuilder', 'dispatchBatch', async () => {
      addSpanAttributes({
        'batch.size': jobs.length,
      });

      const results: IDispatchResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      const jobOptions = jobs.map((job, index) => {
        try {
          let scheduledFor: Date | undefined;

          if (job.delay) {
            scheduledFor = new Date(Date.now() + parseDuration(job.delay));
          }

          return {
            name: job.name,
            payload: job.payload,
            priority: job.priority ?? 5,
            maxAttempts: job.retries ?? 3,
            scheduledFor,
          };
        } catch (error) {
          errors.push({
            index,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      }).filter(Boolean) as any[];

      if (jobOptions.length > 0) {
        const createdJobs = await JobStorage.createMany(jobOptions);

        for (const job of createdJobs) {
          results.push({
            jobId: job._id.toString(),
            status: job.status,
            scheduledFor: job.scheduledFor,
          });
        }
      }

      recordSpanEvent('batch_dispatched', {
        dispatched: results.length,
        failed: errors.length,
      });

      return {
        dispatched: results.length,
        failed: errors.length,
        jobs: results,
        errors,
      };
    });
  }

  /**
   * Find a job by ID
   */
  static async findById(jobId: string): Promise<IJobDocument | null> {
    return JobStorage.findById(jobId);
  }

  /**
   * Cancel a pending job
   */
  static async cancel(jobId: string): Promise<boolean> {
    const result = await JobStorage.cancel(jobId);
    return result !== null;
  }

  /**
   * Retry a failed job
   */
  static async retry(jobId: string): Promise<boolean> {
    const result = await JobStorage.retry(jobId);
    return result !== null;
  }

  // ==================== CONSTRUCTOR ====================

  constructor() {
    // Load defaults from config
    const config = getBuilderConfig();
    if ('job' in config) {
      const jobConfig = (config as any).job;
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
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set job payload data
   *
   * @param payload - Data to pass to handler
   */
  payload(payload: Record<string, any>): this {
    this._payload = { ...this._payload, ...payload };
    return this;
  }

  /**
   * Set job priority (1-10, higher = more priority)
   *
   * @param priority - Priority level
   */
  priority(priority: number): this {
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
  retries(attempts: number): this {
    this._maxAttempts = Math.max(1, attempts);
    return this;
  }

  /**
   * Delay job execution
   *
   * @param duration - Delay duration (e.g., '5m', '2h', '1d')
   */
  delay(duration: string): this {
    const ms = parseDuration(duration);
    this._scheduledFor = new Date(Date.now() + ms);
    return this;
  }

  /**
   * Schedule job for specific date/time
   *
   * @param date - When to execute
   */
  at(date: Date): this {
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
  schedule(cronExpression: string): this {
    this._cronExpression = cronExpression;
    return this;
  }

  /**
   * Set job timeout
   *
   * @param duration - Timeout duration (e.g., '5m', '1h')
   */
  timeout(duration: string): this {
    this._timeout = parseDuration(duration);
    return this;
  }

  /**
   * Set job metadata
   *
   * @param metadata - Additional metadata
   */
  meta(metadata: Record<string, any>): this {
    this._metadata = { ...this._metadata, ...metadata };
    return this;
  }

  /**
   * Set backoff strategy for retries
   *
   * @param strategy - 'fixed', 'exponential', or 'linear'
   * @param options - Backoff options
   */
  backoff(strategy: BackoffStrategy, options: IBackoffOptions = {}): this {
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
  onComplete(
    handlerName: string,
    payloadOrTransformer?: Record<string, any> | ((result: any) => Record<string, any>)
  ): this {
    if (typeof payloadOrTransformer === 'function') {
      this._chain = {
        handlerName,
        payloadTransformer: payloadOrTransformer as (result: any) => Record<string, any>,
      };
    } else {
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
  async dispatch(): Promise<IDispatchResult> {
    return traceOperation('JobBuilder', 'dispatch', async () => {
      // Validation
      if (!this._name) {
        throw new BuilderError(
          'Job name is required. Use .name() to set it.',
          'JobBuilder',
          'dispatch'
        );
      }

      if (!handlerRegistry.has(this._name)) {
        console.warn(
          `Warning: Handler "${this._name}" is not registered. ` +
          `Make sure to register it before the worker starts.`
        );
      }

      addSpanAttributes({
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
      this._metadata.backoff = {
        strategy: this._backoffStrategy,
        ...this._backoffOptions,
      };

      // Create job
      const job = await JobStorage.create({
        name: this._name,
        payload: this._payload,
        priority: this._priority,
        maxAttempts: this._maxAttempts,
        scheduledFor: this._scheduledFor,
        cronExpression: this._cronExpression,
        timeout: this._timeout,
        metadata: this._metadata,
      });

      recordSpanEvent('job_dispatched', {
        jobId: job._id.toString(),
        name: this._name,
      });

      return {
        jobId: job._id.toString(),
        status: job.status,
        scheduledFor: job.scheduledFor,
      };
    });
  }

  /**
   * Dispatch and wait for completion (for testing)
   * Note: This is blocking and should only be used in tests
   */
  async dispatchAndWait(timeoutMs: number = 30000): Promise<IJobDocument> {
    const { jobId } = await this.dispatch();

    const startTime = Date.now();
    const pollInterval = 100;

    while (Date.now() - startTime < timeoutMs) {
      const job = await JobStorage.findById(jobId);

      if (job && (job.status === 'completed' || job.status === 'failed')) {
        return job;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get current job configuration (for debugging)
   */
  toJSON(): Record<string, any> {
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

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Quick dispatch a job without builder pattern
 *
 * @example
 * ```typescript
 * await dispatchJob('sendEmail', { to: 'user@example.com' });
 * ```
 */
export async function dispatchJob(
  name: string,
  payload: Record<string, any>,
  options?: {
    priority?: number;
    delay?: string;
    retries?: number;
  }
): Promise<IDispatchResult> {
  const builder = new JobBuilder().name(name).payload(payload);

  if (options?.priority) builder.priority(options.priority);
  if (options?.delay) builder.delay(options.delay);
  if (options?.retries) builder.retries(options.retries);

  return builder.dispatch();
}

export default JobBuilder;
