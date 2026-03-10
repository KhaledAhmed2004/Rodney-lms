/**
 * ResponseBuilder - Fluent API for Response Transformation
 *
 * Provides a type-safe, chainable interface for transforming and sending
 * API responses with consistent formatting.
 *
 * @example
 * ```typescript
 * // Basic usage - exclude sensitive fields
 * await ResponseBuilder.from(user)
 *   .exclude('password', 'authentication')
 *   .rename('_id', 'id')
 *   .send(res, { statusCode: 200, message: 'User retrieved' });
 *
 * // With pagination
 * await ResponseBuilder.fromList(users)
 *   .exclude('password')
 *   .paginate(paginationInfo)
 *   .send(res);
 *
 * // With computed fields
 * await ResponseBuilder.from(user)
 *   .exclude('password')
 *   .compute('fullName', u => `${u.firstName} ${u.lastName}`)
 *   .computeAsync('isOnline', u => checkOnlineStatus(u._id))
 *   .send(res);
 *
 * // Using templates
 * await ResponseBuilder.from(user)
 *   .useTemplate('user')
 *   .send(res);
 * ```
 *
 * @module ResponseBuilder
 */

import { Response } from 'express';
import {
  IPagination,
  IResponseData,
  IResponseOptions,
  IBuilderState,
  IResponseMetrics,
  CommonTemplateName,
  SENSITIVE_FIELDS,
} from './types';
import { TransformPipeline } from './TransformPipeline';
import {
  ResponseTemplate,
  CommonTemplates,
  getCommonTemplate,
  createTemplate,
} from './ResponseTemplate';

// ==================== METRICS ====================

const metrics: IResponseMetrics = {
  totalResponses: 0,
  transformations: 0,
  averageTransformTime: 0,
  templateUsage: {},
};

// ==================== RESPONSE BUILDER CLASS ====================

/**
 * ResponseBuilder - Main builder class
 */
class ResponseBuilderInstance<T = any> {
  private state: IBuilderState<T> = {
    data: null,
    isList: false,
    pagination: null,
    pipeline: {
      operations: [],
      hasInclude: false,
    },
    template: null,
  };

  private pipeline: TransformPipeline = new TransformPipeline();
  private templateName: string | null = null;

  // ==================== DATA INITIALIZATION ====================

  /**
   * Set single object data
   */
  from<U>(data: U): ResponseBuilderInstance<U> {
    const instance = this as unknown as ResponseBuilderInstance<U>;
    instance.state.data = data;
    instance.state.isList = false;
    return instance;
  }

  /**
   * Set array data
   */
  fromList<U>(data: U[]): ResponseBuilderInstance<U> {
    const instance = this as unknown as ResponseBuilderInstance<U>;
    instance.state.data = data as any;
    instance.state.isList = true;
    return instance;
  }

  // ==================== FIELD EXCLUSION ====================

  /**
   * Exclude specified fields from response
   *
   * @param fields - Field names to exclude
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .exclude('password', 'authentication', '__v')
   * ```
   */
  exclude(...fields: string[]): this {
    this.pipeline.addExclude(fields, true);
    return this;
  }

  /**
   * Exclude common sensitive fields (password, tokens, etc.)
   *
   * @returns Builder instance for chaining
   */
  excludeSensitive(): this {
    this.pipeline.excludeSensitive();
    return this;
  }

  /**
   * Conditionally exclude fields
   *
   * @param condition - When true, fields are excluded
   * @param fields - Field names to exclude
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .excludeIf(!isAdmin, 'internalNotes', 'auditLog')
   * ```
   */
  excludeIf(condition: boolean, ...fields: string[]): this {
    this.pipeline.addExcludeIf(condition, fields);
    return this;
  }

  // ==================== FIELD INCLUSION ====================

  /**
   * Include only specified fields (allowlist mode)
   *
   * @param fields - Field names to include
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .include('id', 'name', 'email', 'profile')
   * ```
   */
  include(...fields: string[]): this {
    this.pipeline.addInclude(fields, true);
    return this;
  }

  /**
   * Conditionally include fields
   *
   * @param condition - When true, fields are included
   * @param fields - Field names to include
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .includeIf(isDetailedView, 'createdAt', 'updatedAt', 'history')
   * ```
   */
  includeIf(condition: boolean, ...fields: string[]): this {
    this.pipeline.addIncludeIf(condition, fields);
    return this;
  }

  // ==================== FIELD RENAMING ====================

  /**
   * Rename a field in the response
   *
   * @param from - Original field name
   * @param to - New field name
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .rename('_id', 'id')
   * .rename('posterId', 'senderId')
   * ```
   */
  rename(from: string, to: string): this {
    this.pipeline.addRename(from, to);
    return this;
  }

  /**
   * Rename _id to id (common pattern)
   *
   * @returns Builder instance for chaining
   */
  renameId(): this {
    return this.rename('_id', 'id');
  }

  // ==================== COMPUTED FIELDS ====================

  /**
   * Add a computed field (synchronous)
   *
   * @param field - New field name
   * @param fn - Function to compute the value
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .compute('fullName', user => `${user.firstName} ${user.lastName}`)
   * .compute('age', user => calculateAge(user.birthDate))
   * ```
   */
  compute<R = any>(field: string, fn: (item: T) => R): this {
    this.pipeline.addCompute(field, fn);
    return this;
  }

  /**
   * Add a computed field (asynchronous)
   *
   * @param field - New field name
   * @param fn - Async function to compute the value
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .computeAsync('isOnline', user => checkOnlineStatus(user._id))
   * .computeAsync('unreadCount', chat => getUnreadCount(chat._id))
   * ```
   */
  computeAsync<R = any>(field: string, fn: (item: T) => Promise<R>): this {
    this.pipeline.addComputeAsync(field, fn);
    return this;
  }

  // ==================== FIELD TRANSFORMATION ====================

  /**
   * Transform a specific field's value (synchronous)
   *
   * @param field - Field name to transform
   * @param fn - Transform function
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .transform('user', user => ({ id: user._id, name: user.name }))
   * .transform('createdAt', date => date.toISOString())
   * ```
   */
  transform<V = any, R = any>(field: string, fn: (value: V) => R): this {
    this.pipeline.addTransform(field, fn);
    return this;
  }

  /**
   * Transform a specific field's value (asynchronous)
   *
   * @param field - Field name to transform
   * @param fn - Async transform function
   * @returns Builder instance for chaining
   */
  transformAsync<V = any, R = any>(field: string, fn: (value: V) => Promise<R>): this {
    this.pipeline.addTransformAsync(field, fn);
    return this;
  }

  // ==================== PAGINATION ====================

  /**
   * Add pagination metadata to response
   *
   * @param pagination - Pagination info object
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .paginate({
   *   page: 1,
   *   limit: 10,
   *   totalPage: 5,
   *   total: 50
   * })
   * ```
   */
  paginate(pagination: IPagination): this {
    this.state.pagination = pagination;
    return this;
  }

  // ==================== TEMPLATES ====================

  /**
   * Use a pre-defined template
   *
   * @param name - Template name ('user', 'userPublic', 'payment', etc.)
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * .useTemplate('user')
   * .useTemplate('payment')
   * ```
   */
  useTemplate(name: CommonTemplateName): this {
    const template = getCommonTemplate(name);
    const templatePipeline = template.toPipeline();

    // Merge template pipeline with current pipeline
    this.pipeline = templatePipeline;
    this.templateName = name;

    // Track template usage
    metrics.templateUsage[name] = (metrics.templateUsage[name] || 0) + 1;

    return this;
  }

  /**
   * Use a custom template
   *
   * @param template - ResponseTemplate instance
   * @returns Builder instance for chaining
   *
   * @example
   * ```typescript
   * const myTemplate = createTemplate()
   *   .exclude('password')
   *   .renameId();
   *
   * .useCustomTemplate(myTemplate)
   * ```
   */
  useCustomTemplate(template: ResponseTemplate): this {
    this.pipeline = template.toPipeline();
    this.templateName = template.getConfig().name || 'custom';
    return this;
  }

  // ==================== EXECUTION ====================

  /**
   * Execute transformations and send response
   *
   * @param res - Express Response object
   * @param options - Response options (statusCode, message, success)
   * @returns Promise that resolves when response is sent
   *
   * @example
   * ```typescript
   * await builder.send(res, {
   *   statusCode: 200,
   *   message: 'User retrieved successfully'
   * });
   * ```
   */
  async send(res: Response, options: IResponseOptions = {}): Promise<void> {
    const startTime = Date.now();

    try {
      // Transform data
      let transformedData: any;

      if (this.state.isList) {
        transformedData = await this.pipeline.executeList(this.state.data as any[]);
      } else {
        transformedData = await this.pipeline.execute(this.state.data);
      }

      // Build response
      const responseData: IResponseData = {
        success: options.success ?? true,
        statusCode: options.statusCode,
        message: options.message,
        data: transformedData,
      };

      // Add pagination if present
      if (this.state.pagination) {
        responseData.pagination = this.state.pagination;
      }

      // Store for logger middleware
      res.locals.responsePayload = responseData;

      // Send response
      res.status(options.statusCode || 200).json({
        success: responseData.success,
        message: responseData.message,
        pagination: responseData.pagination,
        data: responseData.data,
      });

      // Update metrics
      const transformTime = Date.now() - startTime;
      metrics.totalResponses++;
      metrics.transformations += this.pipeline.getState().operations.length;
      metrics.averageTransformTime =
        (metrics.averageTransformTime * (metrics.totalResponses - 1) + transformTime) /
        metrics.totalResponses;
    } catch (error) {
      console.error('[ResponseBuilder] Transform error:', error);
      throw error;
    }
  }

  /**
   * Execute transformations and return data (without sending)
   *
   * @returns Transformed data
   *
   * @example
   * ```typescript
   * const transformedUser = await ResponseBuilder.from(user)
   *   .exclude('password')
   *   .build();
   * ```
   */
  async build(): Promise<any> {
    if (this.state.isList) {
      return this.pipeline.executeList(this.state.data as any[]);
    }
    return this.pipeline.execute(this.state.data);
  }

  /**
   * Execute transformations and return full response object (without sending)
   *
   * @param options - Response options
   * @returns Full response object
   */
  async buildResponse(options: IResponseOptions = {}): Promise<IResponseData> {
    const transformedData = await this.build();

    const response: IResponseData = {
      success: options.success ?? true,
      statusCode: options.statusCode,
      message: options.message,
      data: transformedData,
    };

    if (this.state.pagination) {
      response.pagination = this.state.pagination;
    }

    return response;
  }

  // ==================== AUTO MESSAGE ====================

  /**
   * Generate standard message based on action and entity
   *
   * @param entity - Entity name (e.g., 'User', 'Payment')
   * @param action - Action type ('retrieve', 'create', 'update', 'delete')
   * @returns Builder instance for chaining
   */
  autoMessage(
    entity: string,
    action: 'retrieve' | 'create' | 'update' | 'delete' = 'retrieve'
  ): this & { _autoMessage: string } {
    const actionMessages = {
      retrieve: `${entity} retrieved successfully`,
      create: `${entity} created successfully`,
      update: `${entity} updated successfully`,
      delete: `${entity} deleted successfully`,
    };

    (this as any)._autoMessage = this.state.isList
      ? `${entity}s retrieved successfully`
      : actionMessages[action];

    return this as this & { _autoMessage: string };
  }

  /**
   * Send with auto-generated message
   */
  async sendWithAutoMessage(
    res: Response,
    options: Omit<IResponseOptions, 'message'> = {}
  ): Promise<void> {
    const message = (this as any)._autoMessage || 'Success';
    await this.send(res, { ...options, message });
  }
}

// ==================== STATIC FACTORY ====================

/**
 * ResponseBuilder - Static factory and utilities
 */
export const ResponseBuilder = {
  /**
   * Create builder with single object
   *
   * @example
   * ```typescript
   * ResponseBuilder.from(user)
   *   .exclude('password')
   *   .send(res);
   * ```
   */
  from<T>(data: T): ResponseBuilderInstance<T> {
    return new ResponseBuilderInstance<T>().from(data);
  },

  /**
   * Create builder with array
   *
   * @example
   * ```typescript
   * ResponseBuilder.fromList(users)
   *   .exclude('password')
   *   .paginate(pagination)
   *   .send(res);
   * ```
   */
  fromList<T>(data: T[]): ResponseBuilderInstance<T> {
    return new ResponseBuilderInstance<T>().fromList(data);
  },

  /**
   * Create a new template
   *
   * @example
   * ```typescript
   * const userTemplate = ResponseBuilder.template('user')
   *   .exclude('password')
   *   .renameId();
   * ```
   */
  template(name?: string): ResponseTemplate {
    return createTemplate(name);
  },

  /**
   * Get a pre-defined common template
   *
   * @example
   * ```typescript
   * const template = ResponseBuilder.getTemplate('user');
   * ```
   */
  getTemplate(name: CommonTemplateName): ResponseTemplate {
    return getCommonTemplate(name);
  },

  /**
   * Get available template names
   */
  getTemplateNames(): CommonTemplateName[] {
    return Object.keys(CommonTemplates) as CommonTemplateName[];
  },

  /**
   * Get current metrics
   */
  getMetrics(): IResponseMetrics {
    return { ...metrics };
  },

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    metrics.totalResponses = 0;
    metrics.transformations = 0;
    metrics.averageTransformTime = 0;
    metrics.templateUsage = {};
  },

  /**
   * Get sensitive fields list
   */
  getSensitiveFields(): readonly string[] {
    return SENSITIVE_FIELDS;
  },
};

// ==================== EXPORTS ====================

export { ResponseBuilderInstance };
export default ResponseBuilder;
