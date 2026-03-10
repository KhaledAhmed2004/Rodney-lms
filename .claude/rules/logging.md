---
paths:
  - "src/app/logging/**/*"
  - "src/shared/logger.ts"
  - "src/shared/morgen.ts"
  - "src/app.ts"
  - "src/server.ts"
---

# Logging & Observability Rules

IMPORTANT: Review the logging source files before making ANY changes to logging/tracing code.

## Import Order in app.ts/server.ts (CRITICAL)

The import order is CRITICAL. Violating it causes runtime errors or missing instrumentation.

```typescript
// 1. Mongoose metrics (before any Mongoose models compile)
import './app/logging/mongooseMetrics';
// 2. Auto-labeling (before routes/controllers are loaded)
import './app/logging/autoLabelBootstrap';
// 3. OpenTelemetry instrumentation
import './app/logging/opentelemetry';
// 4. Third-party patches
import './app/logging/patchBcrypt';
import './app/logging/patchJWT';
// 5. LAST: Routes (they import controllers which need auto-labeling)
import router from './routes';
```

A runtime validator (`loadOrderValidator.ts`) throws errors if this order is violated.

## System Overview

- **Auto-Labeling**: Classes named `*Controller` or `*Service` get automatic span creation
- **Request Context**: AsyncLocalStorage via `getRequestContext()` for per-request data
- **Timeline Visualization**: Console shows span timelines per request
- **Mongoose Metrics**: Auto `.explain()` on queries, logs execution stats
- **Client Detection**: Client Hints API for device/OS/browser detection

## Files That Require Doc Updates When Modified

**Core**: `src/shared/logger.ts`, `src/shared/morgen.ts`, `src/app/logging/opentelemetry.ts`, `src/app/logging/requestLogger.ts`

**Instrumentation**: `src/app/logging/autoLabelBootstrap.ts`, `src/app/logging/mongooseMetrics.ts`, `src/app/logging/patchBcrypt.ts`, `src/app/logging/patchJWT.ts`

**Context**: `src/app/logging/requestContext.ts`, `src/app/logging/clientInfo.ts`, `src/app/logging/corsLogger.ts`, `src/app/logging/loadOrderValidator.ts`

## Debugging Quick Reference

- Check import order first
- Verify AsyncLocalStorage context is initialized
- Ensure auto-labeling completed (check startup logs)
- Check OpenTelemetry SDK initialization
