/**
 * ResponseTemplate - Reusable Response Configurations
 *
 * Pre-defined templates for common response patterns.
 * Allows consistent response formatting across controllers.
 *
 * @module ResponseBuilder/ResponseTemplate
 */

import {
  ITemplateConfig,
  IRenameConfig,
  IComputeConfig,
  ITransformConfig,
  CommonTemplateName,
  SENSITIVE_FIELDS,
} from './types';
import { TransformPipeline } from './TransformPipeline';

// ==================== TEMPLATE CLASS ====================

/**
 * ResponseTemplate - Configurable template for response transformation
 */
export class ResponseTemplate {
  private config: ITemplateConfig = {
    excludes: [],
    includes: [],
    renames: [],
    computes: [],
    transforms: [],
    conditionals: [],
  };

  /**
   * Create a new template with optional name
   */
  constructor(name?: string) {
    this.config.name = name;
  }

  // ==================== CONFIGURATION ====================

  /**
   * Set template name
   */
  name(name: string): this {
    this.config.name = name;
    return this;
  }

  /**
   * Add fields to exclude
   */
  exclude(...fields: string[]): this {
    this.config.excludes.push(...fields);
    return this;
  }

  /**
   * Add sensitive fields to exclude (password, auth tokens, etc.)
   */
  excludeSensitive(): this {
    this.config.excludes.push(...SENSITIVE_FIELDS);
    return this;
  }

  /**
   * Add fields to include (allowlist mode)
   */
  include(...fields: string[]): this {
    this.config.includes.push(...fields);
    return this;
  }

  /**
   * Add field rename
   */
  rename(from: string, to: string): this {
    this.config.renames.push({ from, to });
    return this;
  }

  /**
   * Rename _id to id (common pattern)
   */
  renameId(): this {
    return this.rename('_id', 'id');
  }

  /**
   * Add computed field (sync)
   */
  compute<T = any, R = any>(field: string, fn: (item: T) => R): this {
    this.config.computes.push({ field, compute: fn, async: false });
    return this;
  }

  /**
   * Add computed field (async)
   */
  computeAsync<T = any, R = any>(field: string, fn: (item: T) => Promise<R>): this {
    this.config.computes.push({ field, compute: fn, async: true });
    return this;
  }

  /**
   * Add field transformation
   */
  transform<T = any, R = any>(field: string, fn: (value: T) => R): this {
    this.config.transforms.push({ field, transform: fn, async: false });
    return this;
  }

  /**
   * Add field transformation (async)
   */
  transformAsync<T = any, R = any>(field: string, fn: (value: T) => Promise<R>): this {
    this.config.transforms.push({ field, transform: fn, async: true });
    return this;
  }

  // ==================== PIPELINE CREATION ====================

  /**
   * Create a TransformPipeline from this template
   */
  toPipeline(): TransformPipeline {
    const pipeline = new TransformPipeline();

    // Apply excludes
    if (this.config.excludes.length > 0) {
      pipeline.addExclude(this.config.excludes, true);
    }

    // Apply includes
    if (this.config.includes.length > 0) {
      pipeline.addInclude(this.config.includes, true);
    }

    // Apply renames
    for (const { from, to } of this.config.renames) {
      pipeline.addRename(from, to);
    }

    // Apply computes
    for (const { field, compute, async: isAsync } of this.config.computes) {
      if (isAsync) {
        pipeline.addComputeAsync(field, compute as any);
      } else {
        pipeline.addCompute(field, compute as any);
      }
    }

    // Apply transforms
    for (const { field, transform, async: isAsync } of this.config.transforms) {
      if (isAsync) {
        pipeline.addTransformAsync(field, transform as any);
      } else {
        pipeline.addTransform(field, transform as any);
      }
    }

    return pipeline;
  }

  // ==================== UTILITY ====================

  /**
   * Get template configuration
   */
  getConfig(): ITemplateConfig {
    return { ...this.config };
  }

  /**
   * Clone template
   */
  clone(): ResponseTemplate {
    const cloned = new ResponseTemplate(this.config.name);
    cloned.config = {
      ...this.config,
      excludes: [...this.config.excludes],
      includes: [...this.config.includes],
      renames: [...this.config.renames],
      computes: [...this.config.computes],
      transforms: [...this.config.transforms],
      conditionals: [...this.config.conditionals],
    };
    return cloned;
  }

  /**
   * Merge with another template
   */
  merge(other: ResponseTemplate): this {
    const otherConfig = other.getConfig();
    this.config.excludes.push(...otherConfig.excludes);
    this.config.includes.push(...otherConfig.includes);
    this.config.renames.push(...otherConfig.renames);
    this.config.computes.push(...otherConfig.computes);
    this.config.transforms.push(...otherConfig.transforms);
    this.config.conditionals.push(...otherConfig.conditionals);
    return this;
  }
}

// ==================== COMMON TEMPLATES ====================

/**
 * Pre-defined templates for common use cases
 */
export const CommonTemplates: Record<CommonTemplateName, () => ResponseTemplate> = {
  /**
   * User template - excludes sensitive fields, renames _id
   */
  user: () =>
    new ResponseTemplate('user')
      .excludeSensitive()
      .renameId(),

  /**
   * Public user template - only safe public fields
   */
  userPublic: () =>
    new ResponseTemplate('userPublic')
      .include('_id', 'name', 'profile', 'role', 'createdAt')
      .renameId(),

  /**
   * Admin user template - more fields visible
   */
  userAdmin: () =>
    new ResponseTemplate('userAdmin')
      .exclude('password', 'authentication', '__v')
      .renameId(),

  /**
   * Message template
   */
  message: () =>
    new ResponseTemplate('message')
      .exclude('__v')
      .renameId(),

  /**
   * Chat template
   */
  chat: () =>
    new ResponseTemplate('chat')
      .exclude('__v')
      .renameId(),

  /**
   * Notification template
   */
  notification: () =>
    new ResponseTemplate('notification')
      .exclude('__v')
      .renameId(),
};

/**
 * Get a common template by name
 */
export const getCommonTemplate = (name: CommonTemplateName): ResponseTemplate => {
  const factory = CommonTemplates[name];
  if (!factory) {
    throw new Error(`Unknown template: ${name}`);
  }
  return factory();
};

/**
 * Create a new empty template
 */
export const createTemplate = (name?: string): ResponseTemplate => {
  return new ResponseTemplate(name);
};

export default ResponseTemplate;
