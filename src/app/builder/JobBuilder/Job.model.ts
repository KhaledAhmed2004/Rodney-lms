/**
 * Job Model - MongoDB Schema for Background Jobs
 *
 * Stores all job data for the JobBuilder queue system.
 * Uses compound indexes for efficient job claiming and processing.
 *
 * @module JobBuilder/Job.model
 */

import { Schema, model, Model } from 'mongoose';
import { IJob, IJobDocument, JobStatus } from './types';

// ==================== SCHEMA ====================

const JobSchema = new Schema<IJobDocument>(
  {
    name: {
      type: String,
      required: [true, 'Job name is required'],
      index: true,
      trim: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'scheduled', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    lastError: {
      type: String,
      default: null,
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },
    cronExpression: {
      type: String,
      default: null,
    },
    timeout: {
      type: Number,
      default: null,
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'jobs',
  }
);

// ==================== INDEXES ====================

/**
 * Compound index for efficient job claiming
 * Worker queries: { status: 'pending', priority: -1, scheduledFor: { $lte: now } }
 */
JobSchema.index(
  { status: 1, priority: -1, scheduledFor: 1 },
  { name: 'job_claiming_idx' }
);

/**
 * Index for finding jobs by name and status
 */
JobSchema.index(
  { name: 1, status: 1 },
  { name: 'job_name_status_idx' }
);

/**
 * TTL index for automatic cleanup of completed jobs (7 days by default)
 * Only applies to completed and cancelled jobs
 */
JobSchema.index(
  { completedAt: 1 },
  {
    name: 'job_ttl_completed_idx',
    expireAfterSeconds: 60 * 60 * 24 * 7, // 7 days
    partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } },
  }
);

/**
 * Index for scheduled/cron jobs
 */
JobSchema.index(
  { cronExpression: 1 },
  {
    name: 'job_cron_idx',
    partialFilterExpression: { cronExpression: { $ne: null } },
  }
);

/**
 * Index for failed jobs lookup
 */
JobSchema.index(
  { status: 1, failedAt: -1 },
  {
    name: 'job_failed_idx',
    partialFilterExpression: { status: 'failed' },
  }
);

// ==================== STATIC METHODS ====================

interface IJobModel extends Model<IJobDocument> {
  /**
   * Claim the next available job atomically
   * Uses findOneAndUpdate to prevent race conditions
   */
  claimNext(jobTypes?: string[]): Promise<IJobDocument | null>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<Record<JobStatus | 'total', number>>;

  /**
   * Find jobs ready to process
   */
  findReady(limit?: number, jobTypes?: string[]): Promise<IJobDocument[]>;
}

/**
 * Claim the next available job atomically
 */
JobSchema.statics.claimNext = async function (
  jobTypes?: string[]
): Promise<IJobDocument | null> {
  const now = new Date();

  const query: Record<string, any> = {
    status: 'pending',
    $or: [
      { scheduledFor: null },
      { scheduledFor: { $lte: now } },
    ],
  };

  if (jobTypes && jobTypes.length > 0) {
    query.name = { $in: jobTypes };
  }

  return this.findOneAndUpdate(
    query,
    {
      $set: {
        status: 'processing',
        processedAt: now,
      },
      $inc: { attempts: 1 },
    },
    {
      new: true,
      sort: { priority: -1, createdAt: 1 },
    }
  );
};

/**
 * Get queue statistics
 */
JobSchema.statics.getStats = async function (): Promise<Record<JobStatus | 'total', number>> {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    scheduled: 0,
    cancelled: 0,
    total: 0,
  };

  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }

  return result as Record<JobStatus | 'total', number>;
};

/**
 * Find jobs ready to process
 */
JobSchema.statics.findReady = async function (
  limit: number = 10,
  jobTypes?: string[]
): Promise<IJobDocument[]> {
  const now = new Date();

  const query: Record<string, any> = {
    status: 'pending',
    $or: [
      { scheduledFor: null },
      { scheduledFor: { $lte: now } },
    ],
  };

  if (jobTypes && jobTypes.length > 0) {
    query.name = { $in: jobTypes };
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

// ==================== INSTANCE METHODS ====================

/**
 * Mark job as completed
 */
JobSchema.methods.markCompleted = async function (result?: any): Promise<IJobDocument> {
  this.status = 'completed';
  this.completedAt = new Date();
  this.result = result;
  return this.save();
};

/**
 * Mark job as failed
 */
JobSchema.methods.markFailed = async function (error: string): Promise<IJobDocument> {
  this.status = 'failed';
  this.failedAt = new Date();
  this.lastError = error;
  return this.save();
};

/**
 * Reset job for retry
 */
JobSchema.methods.retry = async function (delay?: number): Promise<IJobDocument> {
  this.status = 'pending';
  this.processedAt = null;

  if (delay) {
    this.scheduledFor = new Date(Date.now() + delay);
  }

  return this.save();
};

// ==================== EXPORT ====================

const Job = model<IJobDocument, IJobModel>('Job', JobSchema);

export default Job;
