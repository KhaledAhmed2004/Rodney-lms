/**
 * Builder Tracing - OpenTelemetry integration for all builders
 *
 * Provides automatic span creation for builder operations.
 * Makes builder operations visible in request traces.
 *
 * @example
 * ```typescript
 * // In any builder method:
 * async send(): Promise<Result> {
 *   return traceOperation('NotificationBuilder', 'send', async (span) => {
 *     span.setAttribute('recipients', userIds.length);
 *     // ... existing logic
 *   });
 * }
 * ```
 */

import { trace, Span, SpanStatusCode, SpanKind, Attributes } from '@opentelemetry/api';
import { BuilderError } from './BuilderError';

// Create a tracer for all builders
const tracer = trace.getTracer('builders', '1.0.0');

/**
 * Trace an async operation with automatic span management
 */
export async function traceOperation<T>(
  builderName: string,
  operationName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Attributes
): Promise<T> {
  const spanName = `${builderName}.${operationName}`;

  return tracer.startActiveSpan(
    spanName,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        'builder.name': builderName,
        'builder.operation': operationName,
        ...attributes,
      },
    },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        // Record error details
        const err = error instanceof Error ? error : new Error(String(error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        });
        span.recordException(err);

        // Add builder error context if available
        if (error instanceof BuilderError) {
          span.setAttribute('error.builder', error.builder);
          span.setAttribute('error.operation', error.operation);
        }

        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Trace a sync operation (for non-async builder methods)
 */
export function traceSync<T>(
  builderName: string,
  operationName: string,
  fn: (span: Span) => T,
  attributes?: Attributes
): T {
  const spanName = `${builderName}.${operationName}`;
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'builder.name': builderName,
      'builder.operation': operationName,
      ...attributes,
    },
  });

  try {
    const result = fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });
    span.recordException(err);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to the current active span (if any)
 */
export function addSpanAttributes(attributes: Attributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        currentSpan.setAttribute(key, value);
      }
    }
  }
}

/**
 * Record an event on the current active span
 */
export function recordSpanEvent(name: string, attributes?: Attributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(name, attributes);
  }
}

/**
 * Get the current trace ID (useful for logging correlation)
 */
export function getCurrentTraceId(): string | undefined {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    return currentSpan.spanContext().traceId;
  }
  return undefined;
}

export default {
  traceOperation,
  traceSync,
  addSpanAttributes,
  recordSpanEvent,
  getCurrentTraceId,
};
