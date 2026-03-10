/**
 * TransformPipeline - Data Transformation Engine
 *
 * Handles all data transformations: exclude, include, rename, compute, etc.
 * Works with both single objects and arrays.
 *
 * @module ResponseBuilder/TransformPipeline
 */

import {
  IPipelineState,
  ITransformOperation,
  IRenameConfig,
  IComputeConfig,
  ITransformConfig,
  IConditionalConfig,
  SENSITIVE_FIELDS,
} from './types';

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert Mongoose document to plain object
 */
const toPlainObject = (doc: any): any => {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  if (typeof doc.toJSON === 'function') {
    return doc.toJSON();
  }
  return { ...doc };
};

/**
 * Deep clone an object
 */
const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  const cloned: any = {};
  for (const key of Object.keys(obj as object)) {
    cloned[key] = deepClone((obj as any)[key]);
  }
  return cloned;
};

/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Set nested value in object using dot notation
 */
const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (current[key] === undefined) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
};

/**
 * Delete nested value from object using dot notation
 */
const deleteNestedValue = (obj: any, path: string): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target && lastKey in target) {
    delete target[lastKey];
  }
};

// ==================== TRANSFORM FUNCTIONS ====================

/**
 * Exclude specified fields from object
 */
const excludeFields = (obj: any, fields: string[], deep: boolean = false): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);

  for (const field of fields) {
    if (field.includes('.')) {
      // Nested field
      deleteNestedValue(result, field);
    } else {
      delete result[field];
    }
  }

  // Deep exclusion - recursively exclude from nested objects
  if (deep) {
    for (const key of Object.keys(result)) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = excludeFields(result[key], fields, true);
      } else if (Array.isArray(result[key])) {
        result[key] = result[key].map((item: any) =>
          typeof item === 'object' ? excludeFields(item, fields, true) : item
        );
      }
    }
  }

  return result;
};

/**
 * Include only specified fields (allowlist)
 */
const includeFields = (obj: any, fields: string[], deep: boolean = false): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const result: any = {};

  for (const field of fields) {
    if (field.includes('.')) {
      // Nested field
      const value = getNestedValue(obj, field);
      if (value !== undefined) {
        setNestedValue(result, field, deepClone(value));
      }
    } else {
      if (obj[field] !== undefined) {
        result[field] = deepClone(obj[field]);
      }
    }
  }

  return result;
};

/**
 * Rename fields in object
 */
const renameFields = (obj: any, renames: IRenameConfig[]): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);

  for (const { from, to } of renames) {
    if (from.includes('.')) {
      // Nested field rename
      const value = getNestedValue(result, from);
      if (value !== undefined) {
        deleteNestedValue(result, from);
        setNestedValue(result, to, value);
      }
    } else {
      if (result[from] !== undefined) {
        result[to] = result[from];
        delete result[from];
      }
    }
  }

  return result;
};

/**
 * Apply computed fields (sync)
 */
const applyComputedFields = (
  obj: any,
  computes: IComputeConfig[],
  originalObj: any
): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);

  for (const { field, compute, async: isAsync } of computes) {
    if (!isAsync) {
      try {
        const value = (compute as (item: any) => any)(originalObj);
        if (field.includes('.')) {
          setNestedValue(result, field, value);
        } else {
          result[field] = value;
        }
      } catch (error) {
        // Silently skip failed computations
        console.warn(`[ResponseBuilder] Compute failed for field "${field}":`, error);
      }
    }
  }

  return result;
};

/**
 * Apply computed fields (async)
 */
const applyAsyncComputedFields = async (
  obj: any,
  computes: IComputeConfig[],
  originalObj: any
): Promise<any> => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);
  const asyncComputes = computes.filter(c => c.async);

  await Promise.all(
    asyncComputes.map(async ({ field, compute }) => {
      try {
        const value = await (compute as (item: any) => Promise<any>)(originalObj);
        if (field.includes('.')) {
          setNestedValue(result, field, value);
        } else {
          result[field] = value;
        }
      } catch (error) {
        console.warn(`[ResponseBuilder] Async compute failed for field "${field}":`, error);
      }
    })
  );

  return result;
};

/**
 * Apply field transformations
 */
const applyTransformations = (
  obj: any,
  transforms: ITransformConfig[]
): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);

  for (const { field, transform, async: isAsync } of transforms) {
    if (!isAsync) {
      const value = field.includes('.')
        ? getNestedValue(result, field)
        : result[field];

      if (value !== undefined) {
        try {
          const transformed = (transform as (v: any) => any)(value);
          if (field.includes('.')) {
            setNestedValue(result, field, transformed);
          } else {
            result[field] = transformed;
          }
        } catch (error) {
          console.warn(`[ResponseBuilder] Transform failed for field "${field}":`, error);
        }
      }
    }
  }

  return result;
};

/**
 * Apply async field transformations
 */
const applyAsyncTransformations = async (
  obj: any,
  transforms: ITransformConfig[]
): Promise<any> => {
  if (!obj || typeof obj !== 'object') return obj;

  const result = deepClone(obj);
  const asyncTransforms = transforms.filter(t => t.async);

  await Promise.all(
    asyncTransforms.map(async ({ field, transform }) => {
      const value = field.includes('.')
        ? getNestedValue(result, field)
        : result[field];

      if (value !== undefined) {
        try {
          const transformed = await (transform as (v: any) => Promise<any>)(value);
          if (field.includes('.')) {
            setNestedValue(result, field, transformed);
          } else {
            result[field] = transformed;
          }
        } catch (error) {
          console.warn(`[ResponseBuilder] Async transform failed for field "${field}":`, error);
        }
      }
    })
  );

  return result;
};

// ==================== PIPELINE CLASS ====================

/**
 * TransformPipeline - Executes transformation operations
 */
export class TransformPipeline {
  private state: IPipelineState = {
    operations: [],
    hasInclude: false,
  };

  // Track configurations separately for easy access
  private excludes: string[] = [];
  private includes: string[] = [];
  private renames: IRenameConfig[] = [];
  private computes: IComputeConfig[] = [];
  private transforms: ITransformConfig[] = [];
  private conditionalExcludes: IConditionalConfig[] = [];
  private conditionalIncludes: IConditionalConfig[] = [];
  private deepExclude: boolean = false;
  private deepInclude: boolean = false;

  // ==================== CONFIGURATION METHODS ====================

  /**
   * Add fields to exclude
   */
  addExclude(fields: string[], deep: boolean = false): this {
    this.excludes.push(...fields);
    if (deep) this.deepExclude = true;
    this.state.operations.push({
      type: 'exclude',
      config: { fields, deep },
    });
    return this;
  }

  /**
   * Add fields to include (allowlist mode)
   */
  addInclude(fields: string[], deep: boolean = false): this {
    this.includes.push(...fields);
    if (deep) this.deepInclude = true;
    this.state.hasInclude = true;
    this.state.operations.push({
      type: 'include',
      config: { fields, deep },
    });
    return this;
  }

  /**
   * Add field rename
   */
  addRename(from: string, to: string): this {
    this.renames.push({ from, to });
    this.state.operations.push({
      type: 'rename',
      config: { from, to },
    });
    return this;
  }

  /**
   * Add computed field (sync)
   */
  addCompute<T = any, R = any>(
    field: string,
    compute: (item: T) => R
  ): this {
    this.computes.push({ field, compute, async: false });
    this.state.operations.push({
      type: 'compute',
      config: { field, async: false },
    });
    return this;
  }

  /**
   * Add computed field (async)
   */
  addComputeAsync<T = any, R = any>(
    field: string,
    compute: (item: T) => Promise<R>
  ): this {
    this.computes.push({ field, compute, async: true });
    this.state.operations.push({
      type: 'compute',
      config: { field, async: true },
    });
    return this;
  }

  /**
   * Add field transformation (sync)
   */
  addTransform<T = any, R = any>(
    field: string,
    transform: (value: T) => R
  ): this {
    this.transforms.push({ field, transform, async: false });
    this.state.operations.push({
      type: 'transform',
      config: { field, async: false },
    });
    return this;
  }

  /**
   * Add field transformation (async)
   */
  addTransformAsync<T = any, R = any>(
    field: string,
    transform: (value: T) => Promise<R>
  ): this {
    this.transforms.push({ field, transform, async: true });
    this.state.operations.push({
      type: 'transform',
      config: { field, async: true },
    });
    return this;
  }

  /**
   * Add conditional exclude
   */
  addExcludeIf(condition: boolean, fields: string[]): this {
    if (condition) {
      this.excludes.push(...fields);
    }
    this.conditionalExcludes.push({ condition, fields });
    this.state.operations.push({
      type: 'excludeIf',
      config: { condition, fields },
    });
    return this;
  }

  /**
   * Add conditional include
   */
  addIncludeIf(condition: boolean, fields: string[]): this {
    if (condition) {
      this.includes.push(...fields);
    }
    this.conditionalIncludes.push({ condition, fields });
    this.state.operations.push({
      type: 'includeIf',
      config: { condition, fields },
    });
    return this;
  }

  /**
   * Add sensitive fields exclusion
   */
  excludeSensitive(): this {
    this.addExclude([...SENSITIVE_FIELDS], true);
    return this;
  }

  // ==================== EXECUTION ====================

  /**
   * Execute pipeline on single object
   */
  async execute<T = any>(data: T): Promise<any> {
    if (data === null || data === undefined) return data;

    // Convert to plain object
    let result = toPlainObject(data);
    const original = toPlainObject(data);

    // Apply include (allowlist) first if specified
    if (this.state.hasInclude && this.includes.length > 0) {
      result = includeFields(result, this.includes, this.deepInclude);
    }

    // Apply excludes
    if (this.excludes.length > 0) {
      result = excludeFields(result, this.excludes, this.deepExclude);
    }

    // Apply renames
    if (this.renames.length > 0) {
      result = renameFields(result, this.renames);
    }

    // Apply sync computed fields
    const syncComputes = this.computes.filter(c => !c.async);
    if (syncComputes.length > 0) {
      result = applyComputedFields(result, syncComputes, original);
    }

    // Apply async computed fields
    const asyncComputes = this.computes.filter(c => c.async);
    if (asyncComputes.length > 0) {
      result = await applyAsyncComputedFields(result, asyncComputes, original);
    }

    // Apply sync transformations
    const syncTransforms = this.transforms.filter(t => !t.async);
    if (syncTransforms.length > 0) {
      result = applyTransformations(result, syncTransforms);
    }

    // Apply async transformations
    const asyncTransforms = this.transforms.filter(t => t.async);
    if (asyncTransforms.length > 0) {
      result = await applyAsyncTransformations(result, asyncTransforms);
    }

    return result;
  }

  /**
   * Execute pipeline on array of objects
   */
  async executeList<T = any>(data: T[]): Promise<any[]> {
    if (!Array.isArray(data)) return [];
    return Promise.all(data.map(item => this.execute(item)));
  }

  // ==================== UTILITY ====================

  /**
   * Get current pipeline state
   */
  getState(): IPipelineState {
    return { ...this.state };
  }

  /**
   * Check if pipeline has any operations
   */
  hasOperations(): boolean {
    return this.state.operations.length > 0;
  }

  /**
   * Clone pipeline for reuse
   */
  clone(): TransformPipeline {
    const cloned = new TransformPipeline();
    cloned.excludes = [...this.excludes];
    cloned.includes = [...this.includes];
    cloned.renames = [...this.renames];
    cloned.computes = [...this.computes];
    cloned.transforms = [...this.transforms];
    cloned.conditionalExcludes = [...this.conditionalExcludes];
    cloned.conditionalIncludes = [...this.conditionalIncludes];
    cloned.deepExclude = this.deepExclude;
    cloned.deepInclude = this.deepInclude;
    cloned.state = {
      operations: [...this.state.operations],
      hasInclude: this.state.hasInclude,
    };
    return cloned;
  }

  /**
   * Reset pipeline
   */
  reset(): this {
    this.excludes = [];
    this.includes = [];
    this.renames = [];
    this.computes = [];
    this.transforms = [];
    this.conditionalExcludes = [];
    this.conditionalIncludes = [];
    this.deepExclude = false;
    this.deepInclude = false;
    this.state = {
      operations: [],
      hasInclude: false,
    };
    return this;
  }
}

export default TransformPipeline;
