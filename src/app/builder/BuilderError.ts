/**
 * BuilderError - Custom error class for all builders
 *
 * Provides structured error information for debugging and logging.
 *
 * @example
 * ```typescript
 * throw new BuilderError(
 *   'Failed to generate PDF',
 *   'PDFBuilder',
 *   'toBuffer',
 *   originalError
 * );
 * ```
 */

import { logger } from '../../shared/logger';

export class BuilderError extends Error {
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    public readonly builder: string,
    public readonly operation: string,
    public readonly originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BuilderError';
    this.timestamp = new Date();
    this.context = context || {};

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BuilderError);
    }

    // Preserve original error stack
    if (originalError?.stack) {
      this.stack = `${this.stack}\n\nCaused by:\n${originalError.stack}`;
    }
  }

  /**
   * Log the error with full context
   */
  log(level: 'error' | 'warn' = 'error'): void {
    const logData = {
      builder: this.builder,
      operation: this.operation,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
          }
        : undefined,
    };

    if (level === 'error') {
      logger.error(`[${this.builder}] ${this.operation}: ${this.message}`, logData);
    } else {
      logger.warn(`[${this.builder}] ${this.operation}: ${this.message}`, logData);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      builder: this.builder,
      operation: this.operation,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }

  /**
   * Create a BuilderError from any error
   */
  static from(
    error: unknown,
    builder: string,
    operation: string,
    context?: Record<string, any>
  ): BuilderError {
    if (error instanceof BuilderError) {
      return error;
    }

    const originalError = error instanceof Error ? error : new Error(String(error));
    return new BuilderError(originalError.message, builder, operation, originalError, context);
  }
}

export default BuilderError;
