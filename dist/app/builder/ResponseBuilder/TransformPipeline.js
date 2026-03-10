"use strict";
/**
 * TransformPipeline - Data Transformation Engine
 *
 * Handles all data transformations: exclude, include, rename, compute, etc.
 * Works with both single objects and arrays.
 *
 * @module ResponseBuilder/TransformPipeline
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
exports.TransformPipeline = void 0;
const types_1 = require("./types");
// ==================== HELPER FUNCTIONS ====================
/**
 * Convert Mongoose document to plain object
 */
const toPlainObject = (doc) => {
    if (!doc)
        return doc;
    if (typeof doc.toObject === 'function') {
        return doc.toObject();
    }
    if (typeof doc.toJSON === 'function') {
        return doc.toJSON();
    }
    return Object.assign({}, doc);
};
/**
 * Deep clone an object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned = {};
    for (const key of Object.keys(obj)) {
        cloned[key] = deepClone(obj[key]);
    }
    return cloned;
};
/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
};
/**
 * Set nested value in object using dot notation
 */
const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
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
const deleteNestedValue = (obj, path) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
    if (target && lastKey in target) {
        delete target[lastKey];
    }
};
// ==================== TRANSFORM FUNCTIONS ====================
/**
 * Exclude specified fields from object
 */
const excludeFields = (obj, fields, deep = false) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    for (const field of fields) {
        if (field.includes('.')) {
            // Nested field
            deleteNestedValue(result, field);
        }
        else {
            delete result[field];
        }
    }
    // Deep exclusion - recursively exclude from nested objects
    if (deep) {
        for (const key of Object.keys(result)) {
            if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = excludeFields(result[key], fields, true);
            }
            else if (Array.isArray(result[key])) {
                result[key] = result[key].map((item) => typeof item === 'object' ? excludeFields(item, fields, true) : item);
            }
        }
    }
    return result;
};
/**
 * Include only specified fields (allowlist)
 */
const includeFields = (obj, fields, deep = false) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = {};
    for (const field of fields) {
        if (field.includes('.')) {
            // Nested field
            const value = getNestedValue(obj, field);
            if (value !== undefined) {
                setNestedValue(result, field, deepClone(value));
            }
        }
        else {
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
const renameFields = (obj, renames) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    for (const { from, to } of renames) {
        if (from.includes('.')) {
            // Nested field rename
            const value = getNestedValue(result, from);
            if (value !== undefined) {
                deleteNestedValue(result, from);
                setNestedValue(result, to, value);
            }
        }
        else {
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
const applyComputedFields = (obj, computes, originalObj) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    for (const { field, compute, async: isAsync } of computes) {
        if (!isAsync) {
            try {
                const value = compute(originalObj);
                if (field.includes('.')) {
                    setNestedValue(result, field, value);
                }
                else {
                    result[field] = value;
                }
            }
            catch (error) {
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
const applyAsyncComputedFields = (obj, computes, originalObj) => __awaiter(void 0, void 0, void 0, function* () {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    const asyncComputes = computes.filter(c => c.async);
    yield Promise.all(asyncComputes.map((_a) => __awaiter(void 0, [_a], void 0, function* ({ field, compute }) {
        try {
            const value = yield compute(originalObj);
            if (field.includes('.')) {
                setNestedValue(result, field, value);
            }
            else {
                result[field] = value;
            }
        }
        catch (error) {
            console.warn(`[ResponseBuilder] Async compute failed for field "${field}":`, error);
        }
    })));
    return result;
});
/**
 * Apply field transformations
 */
const applyTransformations = (obj, transforms) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    for (const { field, transform, async: isAsync } of transforms) {
        if (!isAsync) {
            const value = field.includes('.')
                ? getNestedValue(result, field)
                : result[field];
            if (value !== undefined) {
                try {
                    const transformed = transform(value);
                    if (field.includes('.')) {
                        setNestedValue(result, field, transformed);
                    }
                    else {
                        result[field] = transformed;
                    }
                }
                catch (error) {
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
const applyAsyncTransformations = (obj, transforms) => __awaiter(void 0, void 0, void 0, function* () {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = deepClone(obj);
    const asyncTransforms = transforms.filter(t => t.async);
    yield Promise.all(asyncTransforms.map((_a) => __awaiter(void 0, [_a], void 0, function* ({ field, transform }) {
        const value = field.includes('.')
            ? getNestedValue(result, field)
            : result[field];
        if (value !== undefined) {
            try {
                const transformed = yield transform(value);
                if (field.includes('.')) {
                    setNestedValue(result, field, transformed);
                }
                else {
                    result[field] = transformed;
                }
            }
            catch (error) {
                console.warn(`[ResponseBuilder] Async transform failed for field "${field}":`, error);
            }
        }
    })));
    return result;
});
// ==================== PIPELINE CLASS ====================
/**
 * TransformPipeline - Executes transformation operations
 */
class TransformPipeline {
    constructor() {
        this.state = {
            operations: [],
            hasInclude: false,
        };
        // Track configurations separately for easy access
        this.excludes = [];
        this.includes = [];
        this.renames = [];
        this.computes = [];
        this.transforms = [];
        this.conditionalExcludes = [];
        this.conditionalIncludes = [];
        this.deepExclude = false;
        this.deepInclude = false;
    }
    // ==================== CONFIGURATION METHODS ====================
    /**
     * Add fields to exclude
     */
    addExclude(fields, deep = false) {
        this.excludes.push(...fields);
        if (deep)
            this.deepExclude = true;
        this.state.operations.push({
            type: 'exclude',
            config: { fields, deep },
        });
        return this;
    }
    /**
     * Add fields to include (allowlist mode)
     */
    addInclude(fields, deep = false) {
        this.includes.push(...fields);
        if (deep)
            this.deepInclude = true;
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
    addRename(from, to) {
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
    addCompute(field, compute) {
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
    addComputeAsync(field, compute) {
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
    addTransform(field, transform) {
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
    addTransformAsync(field, transform) {
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
    addExcludeIf(condition, fields) {
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
    addIncludeIf(condition, fields) {
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
    excludeSensitive() {
        this.addExclude([...types_1.SENSITIVE_FIELDS], true);
        return this;
    }
    // ==================== EXECUTION ====================
    /**
     * Execute pipeline on single object
     */
    execute(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data === null || data === undefined)
                return data;
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
                result = yield applyAsyncComputedFields(result, asyncComputes, original);
            }
            // Apply sync transformations
            const syncTransforms = this.transforms.filter(t => !t.async);
            if (syncTransforms.length > 0) {
                result = applyTransformations(result, syncTransforms);
            }
            // Apply async transformations
            const asyncTransforms = this.transforms.filter(t => t.async);
            if (asyncTransforms.length > 0) {
                result = yield applyAsyncTransformations(result, asyncTransforms);
            }
            return result;
        });
    }
    /**
     * Execute pipeline on array of objects
     */
    executeList(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(data))
                return [];
            return Promise.all(data.map(item => this.execute(item)));
        });
    }
    // ==================== UTILITY ====================
    /**
     * Get current pipeline state
     */
    getState() {
        return Object.assign({}, this.state);
    }
    /**
     * Check if pipeline has any operations
     */
    hasOperations() {
        return this.state.operations.length > 0;
    }
    /**
     * Clone pipeline for reuse
     */
    clone() {
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
    reset() {
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
exports.TransformPipeline = TransformPipeline;
exports.default = TransformPipeline;
