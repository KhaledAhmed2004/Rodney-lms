/**
 * ResponseBuilder Module Exports
 *
 * @module ResponseBuilder
 */

// Main Builder
export { ResponseBuilder, ResponseBuilderInstance } from './ResponseBuilder';

// Transform Pipeline
export { TransformPipeline } from './TransformPipeline';

// Templates
export {
  ResponseTemplate,
  CommonTemplates,
  getCommonTemplate,
  createTemplate,
} from './ResponseTemplate';

// Types
export type {
  // Core types
  IPagination,
  IResponseData,
  IResponseOptions,
  // Transform types
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
  // Pipeline types
  TransformOperationType,
  ITransformOperation,
  IPipelineState,
  // Template types
  ITemplateConfig,
  CommonTemplateName,
  // Builder types
  IBuilderState,
  IResponseMetrics,
} from './types';

// Constants
export { SENSITIVE_FIELDS, MONGODB_FIELDS, DEFAULT_EXCLUDES } from './types';

// Default export
export { ResponseBuilder as default } from './ResponseBuilder';
