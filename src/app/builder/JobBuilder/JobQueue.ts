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

import JobStorage from './JobStorage';
import Job from './Job.model';
import {
  IJob,
  IJobDocument,
  IQueueStats,
  IDetailedQueueStats,
  IJobQueryOptions,
  IPurgeOptions,
  JobStatus,
} from './types';
import { traceOperation, addSpanAttributes } from '../builderTracing';

// ==================== JOB QUEUE CLASS ====================

export class JobQueue {
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
  static async getStats(): Promise<IQueueStats> {
    return JobStorage.getStats();
  }

  /**
   * Get detailed queue statistics
   *
   * @returns Detailed stats with today's counts and averages
   */
  static async getDetailedStats(): Promise<IDetailedQueueStats> {
    return JobStorage.getDetailedStats();
  }

  /**
   * Get count of jobs by status
   *
   * @param status - Job status to count
   */
  static async count(status?: JobStatus): Promise<number> {
    const query = status ? { status } : {};
    return JobStorage.count(query);
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get pending jobs
   *
   * @param options - Query options
   */
  static async getPending(options: { limit?: number; name?: string } = {}): Promise<IJobDocument[]> {
    return JobStorage.find({
      status: 'pending',
      name: options.name,
      limit: options.limit || 20,
      sort: { priority: -1, createdAt: 1 },
    });
  }

  /**
   * Get processing jobs
   *
   * @param options - Query options
   */
  static async getProcessing(options: { limit?: number } = {}): Promise<IJobDocument[]> {
    return JobStorage.find({
      status: 'processing',
      limit: options.limit || 20,
      sort: { processedAt: -1 },
    });
  }

  /**
   * Get completed jobs
   *
   * @param options - Query options
   */
  static async getCompleted(options: { limit?: number; name?: string } = {}): Promise<IJobDocument[]> {
    return JobStorage.find({
      status: 'completed',
      name: options.name,
      limit: options.limit || 20,
      sort: { completedAt: -1 },
    });
  }

  /**
   * Get failed jobs
   *
   * @param options - Query options
   */
  static async getFailed(options: { limit?: number; name?: string } = {}): Promise<IJobDocument[]> {
    return JobStorage.find({
      status: 'failed',
      name: options.name,
      limit: options.limit || 20,
      sort: { failedAt: -1 },
    });
  }

  /**
   * Get scheduled jobs (cron jobs)
   */
  static async getScheduled(): Promise<IJobDocument[]> {
    return JobStorage.findScheduled();
  }

  /**
   * Find jobs by name
   *
   * @param name - Handler name
   * @param options - Query options
   */
  static async findByName(
    name: string,
    options: { status?: JobStatus; limit?: number } = {}
  ): Promise<IJobDocument[]> {
    return JobStorage.find({
      name,
      status: options.status,
      limit: options.limit || 20,
    });
  }

  /**
   * Find job by ID
   *
   * @param jobId - Job ID
   */
  static async findById(jobId: string): Promise<IJobDocument | null> {
    return JobStorage.findById(jobId);
  }

  // ==================== ACTION METHODS ====================

  /**
   * Retry a failed job
   *
   * @param jobId - Job ID to retry
   * @param delay - Optional delay before retry (e.g., '5m')
   * @returns Updated job or null if not found/not failed
   */
  static async retry(jobId: string, delay?: string): Promise<IJobDocument | null> {
    return traceOperation('JobQueue', 'retry', async () => {
      let delayMs: number | undefined;

      if (delay) {
        const match = delay.match(/^(\d+)(s|m|h|d)$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          const multipliers: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
          };
          delayMs = value * multipliers[unit];
        }
      }

      addSpanAttributes({
        'job.id': jobId,
        'job.retryDelay': delayMs || 0,
      });

      return JobStorage.retry(jobId, delayMs);
    });
  }

  /**
   * Retry all failed jobs
   *
   * @param options - Filter options
   * @returns Number of jobs retried
   */
  static async retryAll(options: { name?: string } = {}): Promise<number> {
    return traceOperation('JobQueue', 'retryAll', async () => {
      const query: Record<string, any> = { status: 'failed' };
      if (options.name) {
        query.name = options.name;
      }

      const result = await Job.updateMany(query, {
        $set: {
          status: 'pending',
          processedAt: null,
        },
      });

      addSpanAttributes({
        'jobs.retried': result.modifiedCount,
      });

      return result.modifiedCount;
    });
  }

  /**
   * Cancel a pending/scheduled job
   *
   * @param jobId - Job ID to cancel
   * @returns Cancelled job or null
   */
  static async cancel(jobId: string): Promise<IJobDocument | null> {
    return traceOperation('JobQueue', 'cancel', async () => {
      addSpanAttributes({ 'job.id': jobId });
      return JobStorage.cancel(jobId);
    });
  }

  /**
   * Cancel all pending jobs by name
   *
   * @param name - Handler name
   * @returns Number of jobs cancelled
   */
  static async cancelByName(name: string): Promise<number> {
    return traceOperation('JobQueue', 'cancelByName', async () => {
      const result = await Job.updateMany(
        {
          name,
          status: { $in: ['pending', 'scheduled'] },
        },
        {
          $set: {
            status: 'cancelled',
            completedAt: new Date(),
          },
        }
      );

      addSpanAttributes({
        'jobs.cancelled': result.modifiedCount,
        'jobs.name': name,
      });

      return result.modifiedCount;
    });
  }

  /**
   * Delete a job by ID
   *
   * @param jobId - Job ID to delete
   */
  static async delete(jobId: string): Promise<boolean> {
    return JobStorage.delete(jobId);
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
  static async purge(options: IPurgeOptions): Promise<number> {
    return traceOperation('JobQueue', 'purge', async () => {
      const deleted = await JobStorage.purge(options);

      addSpanAttributes({
        'purge.deleted': deleted,
        'purge.status': options.status?.toString() || 'all',
        'purge.olderThan': options.olderThan?.toString() || 'none',
      });

      return deleted;
    });
  }

  /**
   * Purge all completed jobs older than specified duration
   *
   * @param olderThan - Duration string (e.g., '7d', '24h')
   */
  static async purgeCompleted(olderThan: string = '7d'): Promise<number> {
    return this.purge({ status: 'completed', olderThan });
  }

  /**
   * Purge all failed jobs older than specified duration
   *
   * @param olderThan - Duration string
   */
  static async purgeFailed(olderThan: string = '30d'): Promise<number> {
    return this.purge({ status: 'failed', olderThan });
  }

  /**
   * Purge all cancelled jobs older than specified duration
   *
   * @param olderThan - Duration string
   */
  static async purgeCancelled(olderThan: string = '1d'): Promise<number> {
    return this.purge({ status: 'cancelled', olderThan });
  }

  /**
   * Clear all jobs (DANGEROUS - use with caution!)
   *
   * @returns Number of jobs deleted
   */
  static async clearAll(): Promise<number> {
    return JobStorage.clearAll();
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
  static async resetStuckJobs(timeoutMs: number = 5 * 60 * 1000): Promise<number> {
    return traceOperation('JobQueue', 'resetStuckJobs', async () => {
      const reset = await JobStorage.resetStuckJobs(timeoutMs);

      addSpanAttributes({
        'maintenance.stuckReset': reset,
        'maintenance.timeout': timeoutMs,
      });

      return reset;
    });
  }

  /**
   * Activate scheduled jobs that are ready
   *
   * @returns Number of jobs activated
   */
  static async activateScheduled(): Promise<number> {
    return traceOperation('JobQueue', 'activateScheduled', async () => {
      const activated = await JobStorage.activateScheduledJobs();

      addSpanAttributes({
        'maintenance.activated': activated,
      });

      return activated;
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
  static async runMaintenance(): Promise<{
    stuckReset: number;
    activated: number;
    purged: number;
  }> {
    return traceOperation('JobQueue', 'runMaintenance', async () => {
      const [stuckReset, activated, purged] = await Promise.all([
        this.resetStuckJobs(),
        this.activateScheduled(),
        this.purgeCompleted('7d'),
      ]);

      return { stuckReset, activated, purged };
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if queue is healthy
   *
   * @returns Health check result
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    stats: IQueueStats;
    issues: string[];
  }> {
    const stats = await this.getStats();
    const issues: string[] = [];

    // Check for stuck jobs
    const stuckThreshold = 5 * 60 * 1000; // 5 minutes
    const stuckCount = await Job.countDocuments({
      status: 'processing',
      processedAt: { $lt: new Date(Date.now() - stuckThreshold) },
    });

    if (stuckCount > 0) {
      issues.push(`${stuckCount} jobs appear stuck in processing`);
    }

    // Check for high failure rate
    const recentWindow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    const [recentCompleted, recentFailed] = await Promise.all([
      Job.countDocuments({ status: 'completed', completedAt: { $gte: recentWindow } }),
      Job.countDocuments({ status: 'failed', failedAt: { $gte: recentWindow } }),
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
  }
}

export default JobQueue;
