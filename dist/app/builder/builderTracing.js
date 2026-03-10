"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceOperation = traceOperation;
exports.traceSync = traceSync;
exports.addSpanAttributes = addSpanAttributes;
exports.recordSpanEvent = recordSpanEvent;
exports.getCurrentTraceId = getCurrentTraceId;
const api_1 = require("@opentelemetry/api");
const BuilderError_1 = require("./BuilderError");
// Create a tracer for all builders
const tracer = api_1.trace.getTracer('builders', '1.0.0');
/**
 * Trace an async operation with automatic span management
 */
function traceOperation(builderName, operationName, fn, attributes) {
    return __awaiter(this, void 0, void 0, function* () {
        const spanName = `${builderName}.${operationName}`;
        return tracer.startActiveSpan(spanName, {
            kind: api_1.SpanKind.INTERNAL,
            attributes: Object.assign({ 'builder.name': builderName, 'builder.operation': operationName }, attributes),
        }, (span) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield fn(span);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                // Record error details
                const err = error instanceof Error ? error : new Error(String(error));
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: err.message,
                });
                span.recordException(err);
                // Add builder error context if available
                if (error instanceof BuilderError_1.BuilderError) {
                    span.setAttribute('error.builder', error.builder);
                    span.setAttribute('error.operation', error.operation);
                }
                throw error;
            }
            finally {
                span.end();
            }
        }));
    });
}
/**
 * Trace a sync operation (for non-async builder methods)
 */
function traceSync(builderName, operationName, fn, attributes) {
    const spanName = `${builderName}.${operationName}`;
    const span = tracer.startSpan(spanName, {
        kind: api_1.SpanKind.INTERNAL,
        attributes: Object.assign({ 'builder.name': builderName, 'builder.operation': operationName }, attributes),
    });
    try {
        const result = fn(span);
        span.setStatus({ code: api_1.SpanStatusCode.OK });
        return result;
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: err.message,
        });
        span.recordException(err);
        throw error;
    }
    finally {
        span.end();
    }
}
/**
 * Add attributes to the current active span (if any)
 */
function addSpanAttributes(attributes) {
    const currentSpan = api_1.trace.getActiveSpan();
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
function recordSpanEvent(name, attributes) {
    const currentSpan = api_1.trace.getActiveSpan();
    if (currentSpan) {
        currentSpan.addEvent(name, attributes);
    }
}
/**
 * Get the current trace ID (useful for logging correlation)
 */
function getCurrentTraceId() {
    const currentSpan = api_1.trace.getActiveSpan();
    if (currentSpan) {
        return currentSpan.spanContext().traceId;
    }
    return undefined;
}
exports.default = {
    traceOperation,
    traceSync,
    addSpanAttributes,
    recordSpanEvent,
    getCurrentTraceId,
};
