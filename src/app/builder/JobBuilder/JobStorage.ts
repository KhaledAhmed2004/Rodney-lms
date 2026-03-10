/**
 * JobStorage - MongoDB Persistence Layer for Jobs
 *
 * Handles all database operations for the job queue system.
 * Provides atomic operations for safe concurrent access.
 *
 * @module JobBuilder/JobStorage
 */

import Job from './Job.model';
import {
  IJob,
  IJobDocument,
  IJobOptions,
  IJobQueryOptions,
  IQueueStats,
  IDetailedQueueStats,
  IPurgeOptions,
  JobStatus,
} from './types';
import { traceOperation, addSpanAttributes, recordSpanEvent } from '../builderTracing';

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse duration string to milliseconds
 * Supports: '5m', '2h', '1d', '1w', '30s'
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

// ==================== JOB STORAGE CLASS ====================

export class JobStorage {
  // ==================== CREATE OPERATIONS ====================

  /**
   * Create a new job
   */
  static async create(options: IJobOptions): Promise<IJobDocument> {
    return traceOperation('JobStorage', 'create', async () => {
      addSpanAttributes({
        'job.name': options.name,
        'job.priority': options.priority || 5,
        'job.scheduled': !!options.scheduledFor,
      });

      const job = await Job.create({
        name: options.name,
        payload: options.payload,
        priority: options.priority ?? 5,
        maxAttempts: options.maxAttempts ?? 3,
        scheduledFor: options.scheduledFor,
        cronExpression: options.cronExpression,
        timeout: options.timeout,
        metadata: options.metadata,
        status: options.scheduledFor ? 'scheduled' : 'pending',
      });

      recordSpanEvent('job_created', { jobId: job._id.toString() });
      return job;
    });
  }

  /**
   * Create multiple jobs (batch insert)
   */
  static async createMany(optionsArray: IJobOptions[]): Promise<IJobDocument[]> {
    return traceOperation('JobStorage', 'createMany', async () => {
      addSpanAttributes({
        'jobs.count': optionsArray.length,
      });

      const jobDocs = optionsArray.map(options => ({
        name: options.name,
        payload: options.payload,
        priority: options.priority ?? 5,
        maxAttempts: options.maxAttempts ?? 3,
        scheduledFor: options.scheduledFor,
        cronExpression: options.cronExpression,
        timeout: options.timeout,
        metadata: options.metadata,
        status: options.scheduledFor ? 'scheduled' : 'pending',
      }));

      const jobs = await Job.insertMany(jobDocs);
      recordSpanEvent('jobs_created', { count: jobs.length });

      return jobs as IJobDocument[];
    });
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Find job by ID
   */
  static async findById(jobId: string): Promise<IJobDocument | null> {
    return Job.findById(jobId);
  }

  /**
   * Find jobs by query options
   */
  static async find(options: IJobQueryOptions = {}): Promise<IJobDocument[]> {
    const query: Record<string, any> = {};

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
      query.createdAt = { ...query.createdAt, $lte: options.before };
    }
    if (options.after) {
      query.createdAt = { ...query.createdAt, $gte: options.after };
    }

    let queryBuilder = Job.find(query);

    // Sorting
    if (options.sort) {
      queryBuilder = queryBuilder.sort(options.sort);
    } else {
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
  }

  /**
   * Find pending jobs ready to process
   */
  static async findPending(limit: number = 10, jobTypes?: string[]): Promise<IJobDocument[]> {
    return Job.findReady(limit, jobTypes);
  }

  /**
   * Find failed jobs
   */
  static async findFailed(limit: number = 10): Promise<IJobDocument[]> {
    return Job.find({ status: 'failed' })
      .sort({ failedAt: -1 })
      .limit(limit);
  }

  /**
   * Find scheduled jobs
   */
  static async findScheduled(): Promise<IJobDocument[]> {
    return Job.find({ cronExpression: { $ne: null } })
      .sort({ createdAt: -1 });
  }

  // ==================== UPDATE OPERATIONS ====================

  /**
   * Claim the next available job atomically
   */
  static async claimNext(jobTypes?: string[]): Promise<IJobDocument | null> {
    return traceOperation('JobStorage', 'claimNext', async () => {
      const job = await Job.claimNext(jobTypes);

      if (job) {
        addSpanAttributes({
          'job.id': job._id.toString(),
          'job.name': job.name,
          'job.attempt': job.attempts,
        });
        recordSpanEvent('job_claimed');
      }

      return job;
    });
  }

  /**
   * Mark job as completed
   */
  static async complete(jobId: string, result?: any): Promise<IJobDocument | null> {
    return traceOperation('JobStorage', 'complete', async () => {
      const job = await Job.findByIdAndUpdate(
        jobId,
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            result,
          },
        },
        { new: true }
      );

      if (job) {
        recordSpanEvent('job_completed', { jobId });
      }

      return job;
    });
  }

  /**
   * Mark job as failed
   */
  static async fail(jobId: string, error: string, shouldRetry: boolean = false): Promise<IJobDocument | null> {
    return traceOperation('JobStorage', 'fail', async () => {
      const job = await Job.findById(jobId);

      if (!job) return null;

      // Check if we should retry
      if (shouldRetry && job.attempts < job.maxAttempts) {
        // Calculate retry delay (exponential backoff)
        const baseDelay = 5000; // 5 seconds
        const delay = baseDelay * Math.pow(2, job.attempts - 1);
        const scheduledFor = new Date(Date.now() + delay);

        const updatedJob = await Job.findByIdAndUpdate(
          jobId,
          {
            $set: {
              status: 'pending',
              lastError: error,
              scheduledFor,
              processedAt: null,
            },
          },
          { new: true }
        );

        recordSpanEvent('job_retry_scheduled', {
          jobId,
          attempt: job.attempts,
          nextRetry: scheduledFor.toISOString(),
        });

        return updatedJob;
      }

      // Max retries reached, mark as failed permanently
      const failedJob = await Job.findByIdAndUpdate(
        jobId,
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            lastError: error,
          },
        },
        { new: true }
      );

      recordSpanEvent('job_failed_permanently', { jobId, error });

      return failedJob;
    });
  }

  /**
   * Retry a failed job
   */
  static async retry(jobId: string, delay?: number): Promise<IJobDocument | null> {
    const job = await Job.findById(jobId);

    if (!job || job.status !== 'failed') {
      return null;
    }

    return Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          status: 'pending',
          processedAt: null,
          scheduledFor: delay ? new Date(Date.now() + delay) : null,
        },
        $inc: { attempts: 0 }, // Reset attempts? Or keep? Keeping for now
      },
      { new: true }
    );
  }

  /**
   * Cancel a pending job
   */
  static async cancel(jobId: string): Promise<IJobDocument | null> {
    return Job.findOneAndUpdate(
      {
        _id: jobId,
        status: { $in: ['pending', 'scheduled'] },
      },
      {
        $set: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Update job progress (for long-running jobs)
   */
  static async updateProgress(jobId: string, progress: number): Promise<void> {
    await Job.findByIdAndUpdate(jobId, {
      $set: { 'metadata.progress': progress },
    });
  }

  // ==================== DELETE OPERATIONS ====================

  /**
   * Delete a job by ID
   */
  static async delete(jobId: string): Promise<boolean> {
    const result = await Job.deleteOne({ _id: jobId });
    return result.deletedCount > 0;
  }

  /**
   * Purge jobs based on options
   */
  static async purge(options: IPurgeOptions): Promise<number> {
    return traceOperation('JobStorage', 'purge', async () => {
      const query: Record<string, any> = {};

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

      const result = await Job.deleteMany(query);

      addSpanAttributes({
        'purge.deleted': result.deletedCount,
      });

      return result.deletedCount;
    });
  }

  /**
   * Clear all jobs (use with caution!)
   */
  static async clearAll(): Promise<number> {
    const result = await Job.deleteMany({});
    return result.deletedCount;
  }

  // ==================== STATS OPERATIONS ====================

  /**
   * Get queue statistics
   */
  static async getStats(): Promise<IQueueStats> {
    const stats = await Job.getStats();
    return stats as IQueueStats;
  }

  /**
   * Get detailed queue statistics
   */
  static async getDetailedStats(): Promise<IDetailedQueueStats> {
    const baseStats = await this.getStats();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's completed and failed counts
    const [completedToday, failedToday, avgTime, oldestPending] = await Promise.all([
      Job.countDocuments({
        status: 'completed',
        completedAt: { $gte: today },
      }),
      Job.countDocuments({
        status: 'failed',
        failedAt: { $gte: today },
      }),
      Job.aggregate([
        { $match: { status: 'completed', processedAt: { $ne: null } } },
        {
          $project: {
            duration: { $subtract: ['$completedAt', '$processedAt'] },
          },
        },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      Job.findOne({ status: 'pending' }).sort({ createdAt: 1 }).select('createdAt'),
    ]);

    return {
      ...baseStats,
      completedToday,
      failedToday,
      averageProcessingTime: avgTime[0]?.avg || 0,
      oldestPending: oldestPending?.createdAt,
    };
  }

  /**
   * Count jobs by criteria
   */
  static async count(query: Record<string, any> = {}): Promise<number> {
    return Job.countDocuments(query);
  }

  // ==================== MAINTENANCE OPERATIONS ====================

  /**
   * Reset stuck processing jobs
   * Jobs that have been processing for too long
   */
  static async resetStuckJobs(timeout: number = 5 * 60 * 1000): Promise<number> {
    const threshold = new Date(Date.now() - timeout);

    const result = await Job.updateMany(
      {
        status: 'processing',
        processedAt: { $lt: threshold },
      },
      {
        $set: {
          status: 'pending',
          processedAt: null,
          lastError: 'Job timed out and was reset',
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Activate scheduled jobs that are ready
   */
  static async activateScheduledJobs(): Promise<number> {
    const now = new Date();

    const result = await Job.updateMany(
      {
        status: 'scheduled',
        scheduledFor: { $lte: now },
      },
      {
        $set: { status: 'pending' },
      }
    );

    return result.modifiedCount;
  }
}

export default JobStorage;
