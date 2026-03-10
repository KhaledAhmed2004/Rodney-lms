"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderError = void 0;
const logger_1 = require("../../shared/logger");
class BuilderError extends Error {
    constructor(message, builder, operation, originalError, context) {
        super(message);
        this.builder = builder;
        this.operation = operation;
        this.originalError = originalError;
        this.name = 'BuilderError';
        this.timestamp = new Date();
        this.context = context || {};
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BuilderError);
        }
        // Preserve original error stack
        if (originalError === null || originalError === void 0 ? void 0 : originalError.stack) {
            this.stack = `${this.stack}\n\nCaused by:\n${originalError.stack}`;
        }
    }
    /**
     * Log the error with full context
     */
    log(level = 'error') {
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
            logger_1.logger.error(`[${this.builder}] ${this.operation}: ${this.message}`, logData);
        }
        else {
            logger_1.logger.warn(`[${this.builder}] ${this.operation}: ${this.message}`, logData);
        }
    }
    /**
     * Convert to JSON for API responses
     */
    toJSON() {
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
    static from(error, builder, operation, context) {
        if (error instanceof BuilderError) {
            return error;
        }
        const originalError = error instanceof Error ? error : new Error(String(error));
        return new BuilderError(originalError.message, builder, operation, originalError, context);
    }
}
exports.BuilderError = BuilderError;
exports.default = BuilderError;
