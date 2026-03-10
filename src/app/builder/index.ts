/**
 * Builder Module Exports
 *
 * Central export for all builder utilities.
 *
 * @example
 * ```typescript
 * import {
 *   QueryBuilder,
 *   AggregationBuilder,
 *   PDFBuilder,
 *   ExportBuilder,
 *   EmailBuilder,
 *   JobBuilder,
 *   JobWorker,
 *   CacheBuilder,
 *   BuilderError,
 *   getBuilderConfig
 * } from '@/app/builder';
 * ```
 */

// Query Builders
export { default as QueryBuilder } from './QueryBuilder';
export { default as AggregationBuilder } from './AggregationBuilder';

// QueryBuilder Advanced Search Types
export type {
  IFuzzyOptions,
  IScoreBoosts,
  IHighlightOptions,
  IAutocompleteOptions,
  IScoredResult,
  IAdvancedSearchResult,
} from './QueryBuilder';

// Builder Infrastructure
export { BuilderError } from './BuilderError';
export {
  traceOperation,
  traceSync,
  addSpanAttributes,
  recordSpanEvent,
  getCurrentTraceId,
} from './builderTracing';
export {
  getBuilderConfig,
  setBuilderConfig,
  clearConfigCache,
  defaultBuilderConfig,
} from './builderConfig';
export type {
  IBuilderConfig,
  IPdfConfig,
  IExportConfig,
  IEmailConfig,
  INotificationConfig,
  IQueryConfig,
  IAggregationConfig,
  ICacheConfig,
  ISocketConfig,
} from './builderConfig';
export { getCacheConfig } from './builderConfig';

// Document Builders
export { default as PDFBuilder } from './PDFBuilder';
export { default as ExportBuilder } from './ExportBuilder';

// Communication Builders
export { EmailBuilder } from './EmailBuilder';
export { NotificationBuilder, NotificationScheduler } from './NotificationBuilder';

// Type exports - Email
export type {
  IEmailTheme,
  IEmailComponent,
  IEmailTemplate,
  ISendEmailOptions,
  IEmailAttachment,
} from './EmailBuilder';

// Type exports - Notification
export type {
  INotificationTemplate,
  INotificationContent,
  INotificationResult,
  NotificationType,
} from './NotificationBuilder';

// Testing Builder
export { TestBuilder } from './TestBuilder';

// TestBuilder - Factory exports (for direct use if needed)
export {
  UserFactory,
  ChatFactory,
  MessageFactory,
  PaymentFactory,
  NotificationFactory as TestNotificationFactory,
  BaseFactory,
} from './TestBuilder';

// TestBuilder - Helper exports
export { AuthHelper, RequestHelper, SocketHelper } from './TestBuilder';

// TestBuilder - Type exports
export type {
  FactoryOptions,
  TraitDefinition,
  StateDefinition,
} from './TestBuilder/factories/base.factory';

export type {
  UserDocument,
  UserWithToken,
} from './TestBuilder/factories/user.factory';

export type {
  SocketEvent,
  SocketOptions,
} from './TestBuilder/helpers/socketHelper';

// Job Builder
export {
  JobBuilder,
  JobQueue,
  JobWorker,
  JobScheduler,
  JobStorage,
  Job,
  dispatchJob,
  registerBuiltInHandlers,
} from './JobBuilder';

// JobBuilder - Type exports
export type {
  IJob,
  IJobDocument,
  IJobOptions,
  JobStatus,
  JobHandler,
  IJobResult,
  IDispatchResult,
  IBatchDispatchResult,
  IQueueStats,
  IDetailedQueueStats,
  IJobQueryOptions,
  IPurgeOptions,
  IWorkerOptions,
  IWorkerStatus,
  IWorkerEvent,
  WorkerEventType,
  WorkerEventListener,
  ISchedulerOptions,
  BackoffStrategy,
  IBackoffOptions,
  IJobChain,
  IBatchJobDefinition,
  IJobConfig,
} from './JobBuilder';

// JobBuilder - Handler exports
export type {
  IEmailJobPayload,
  IEmailJobResult,
  INotificationJobPayload,
  INotificationJobResult,
  IPdfJobPayload,
  IPdfJobResult,
} from './JobBuilder';

// Cache Builder
export { CacheBuilder } from './CacheBuilder';
export { CacheInvalidator } from './CacheBuilder';

// CacheBuilder - Strategy exports
export {
  MemoryStrategy,
  RedisStrategy,
  MultiLayerStrategy,
} from './CacheBuilder';

// CacheBuilder - Type exports
export type {
  ICacheStrategy,
  ICacheResult,
  ICacheStats,
  IMemoryStrategyOptions,
  IRedisStrategyOptions,
  IMultiLayerStrategyOptions,
  CacheLayer,
  ICacheContext,
  ICacheBuilderOptions,
  ICacheExecuteResult,
  ICacheInvalidateOptions,
  ICacheInvalidateResult,
  ICacheHealthStatus,
} from './CacheBuilder';

// Socket Builder
export { SocketBuilder, ThrottleManager } from './SocketBuilder';

// SocketBuilder - Type exports
export type {
  ISocketEvents,
  IMessagePayload,
  INotificationPayload,
  SocketEventName,
  SocketEventPayload,
  RoomType,
  IRoomConfig,
  IThrottleOptions,
  PermissionChecker,
  DeniedHandler,
  IEmitResult,
  ISocketMetrics,
} from './SocketBuilder';

// Response Builder
export {
  ResponseBuilder,
  ResponseBuilderInstance,
  TransformPipeline,
  ResponseTemplate,
  CommonTemplates,
  getCommonTemplate,
  createTemplate,
  SENSITIVE_FIELDS,
  MONGODB_FIELDS,
  DEFAULT_EXCLUDES,
} from './ResponseBuilder';

// ResponseBuilder - Type exports
export type {
  IPagination,
  IResponseData,
  IResponseOptions,
  IExcludeConfig,
  IIncludeConfig,
  IRenameConfig,
  ComputeFunction,
  AsyncComputeFunction,
  IComputeConfig,
  TransformFunction,
  AsyncTransformFunction,
  ITransformConfig,
  IConditionalConfig,
  TransformOperationType,
  ITransformOperation,
  IPipelineState,
  ITemplateConfig,
  CommonTemplateName,
  IBuilderState,
  IResponseMetrics,
} from './ResponseBuilder';
