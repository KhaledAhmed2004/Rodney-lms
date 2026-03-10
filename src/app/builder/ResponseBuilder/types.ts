/**
 * ResponseBuilder Types
 *
 * TypeScript interfaces for type-safe response transformation.
 *
 * @module ResponseBuilder/types
 */

import { Response } from 'express';

// ==================== CORE TYPES ====================

/**
 * Standard pagination structure
 */
export interface IPagination {
  page: number;
  limit: number;
  totalPage: number;
  total: number;
}

/**
 * Standard response structure
 */
export interface IResponseData<T = any> {
  success: boolean;
  statusCode?: number;
  message?: string;
  pagination?: IPagination;
  data?: T;
}

/**
 * Response options passed to send()
 */
export interface IResponseOptions {
  statusCode?: number;
  message?: string;
  success?: boolean;
}

// ==================== TRANSFORM TYPES ====================

/**
 * Field exclusion configuration
 */
export interface IExcludeConfig {
  fields: string[];
  deep?: boolean; // Also exclude from nested objects
}

/**
 * Field inclusion configuration (allowlist)
 */
export interface IIncludeConfig {
  fields: string[];
  deep?: boolean;
}

/**
 * Field rename mapping
 */
export interface IRenameConfig {
  from: string;
  to: string;
}

/**
 * Computed field function (sync)
 */
export type ComputeFunction<T = any, R = any> = (item: T) => R;

/**
 * Computed field function (async)
 */
export type AsyncComputeFunction<T = any, R = any> = (item: T) => Promise<R>;

/**
 * Computed field configuration
 */
export interface IComputeConfig<T = any> {
  field: string;
  compute: ComputeFunction<T> | AsyncComputeFunction<T>;
  async: boolean;
}

/**
 * Transform function for nested objects
 */
export type TransformFunction<T = any, R = any> = (value: T) => R;

/**
 * Async transform function for nested objects
 */
export type AsyncTransformFunction<T = any, R = any> = (value: T) => Promise<R>;

/**
 * Transform configuration for nested objects
 */
export interface ITransformConfig<T = any> {
  field: string;
  transform: TransformFunction<T> | AsyncTransformFunction<T>;
  async: boolean;
}

/**
 * Conditional configuration
 */
export interface IConditionalConfig {
  condition: boolean;
  fields: string[];
}

// ==================== PIPELINE TYPES ====================

/**
 * Transform operation types
 */
export type TransformOperationType =
  | 'exclude'
  | 'include'
  | 'rename'
  | 'compute'
  | 'transform'
  | 'excludeIf'
  | 'includeIf';

/**
 * Transform operation
 */
export interface ITransformOperation {
  type: TransformOperationType;
  config: any;
}

/**
 * Transform pipeline state
 */
export interface IPipelineState {
  operations: ITransformOperation[];
  hasInclude: boolean; // If true, only included fields are kept
}

// ==================== TEMPLATE TYPES ====================

/**
 * Response template configuration
 */
export interface ITemplateConfig {
  name?: string;
  excludes: string[];
  includes: string[];
  renames: IRenameConfig[];
  computes: IComputeConfig[];
  transforms: ITransformConfig[];
  conditionals: IConditionalConfig[];
}

/**
 * Pre-defined common templates
 */
export type CommonTemplateName =
  | 'user'
  | 'userPublic'
  | 'userAdmin'
  | 'message'
  | 'chat'
  | 'notification';

// ==================== BUILDER STATE ====================

/**
 * ResponseBuilder internal state
 */
export interface IBuilderState<T = any> {
  data: T | T[] | null;
  isList: boolean;
  pagination: IPagination | null;
  pipeline: IPipelineState;
  template: ITemplateConfig | null;
}

// ==================== METRICS ====================

/**
 * ResponseBuilder metrics
 */
export interface IResponseMetrics {
  totalResponses: number;
  transformations: number;
  averageTransformTime: number;
  templateUsage: Record<string, number>;
}

// ==================== COMMON FIELD SETS ====================

/**
 * Common sensitive fields to exclude
 */
export const SENSITIVE_FIELDS = [
  'password',
  'authentication',
  'resetPasswordToken',
  'resetPasswordExpires',
  'verificationToken',
  'verificationExpires',
  '__v',
] as const;

/**
 * Common MongoDB fields to transform
 */
export const MONGODB_FIELDS = {
  _id: 'id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const;

/**
 * Default fields to always exclude
 */
export const DEFAULT_EXCLUDES = ['__v'] as const;
