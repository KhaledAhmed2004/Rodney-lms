"use strict";
/**
 * ResponseTemplate - Reusable Response Configurations
 *
 * Pre-defined templates for common response patterns.
 * Allows consistent response formatting across controllers.
 *
 * @module ResponseBuilder/ResponseTemplate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = exports.getCommonTemplate = exports.CommonTemplates = exports.ResponseTemplate = void 0;
const types_1 = require("./types");
const TransformPipeline_1 = require("./TransformPipeline");
// ==================== TEMPLATE CLASS ====================
/**
 * ResponseTemplate - Configurable template for response transformation
 */
class ResponseTemplate {
    /**
     * Create a new template with optional name
     */
    constructor(name) {
        this.config = {
            excludes: [],
            includes: [],
            renames: [],
            computes: [],
            transforms: [],
            conditionals: [],
        };
        this.config.name = name;
    }
    // ==================== CONFIGURATION ====================
    /**
     * Set template name
     */
    name(name) {
        this.config.name = name;
        return this;
    }
    /**
     * Add fields to exclude
     */
    exclude(...fields) {
        this.config.excludes.push(...fields);
        return this;
    }
    /**
     * Add sensitive fields to exclude (password, auth tokens, etc.)
     */
    excludeSensitive() {
        this.config.excludes.push(...types_1.SENSITIVE_FIELDS);
        return this;
    }
    /**
     * Add fields to include (allowlist mode)
     */
    include(...fields) {
        this.config.includes.push(...fields);
        return this;
    }
    /**
     * Add field rename
     */
    rename(from, to) {
        this.config.renames.push({ from, to });
        return this;
    }
    /**
     * Rename _id to id (common pattern)
     */
    renameId() {
        return this.rename('_id', 'id');
    }
    /**
     * Add computed field (sync)
     */
    compute(field, fn) {
        this.config.computes.push({ field, compute: fn, async: false });
        return this;
    }
    /**
     * Add computed field (async)
     */
    computeAsync(field, fn) {
        this.config.computes.push({ field, compute: fn, async: true });
        return this;
    }
    /**
     * Add field transformation
     */
    transform(field, fn) {
        this.config.transforms.push({ field, transform: fn, async: false });
        return this;
    }
    /**
     * Add field transformation (async)
     */
    transformAsync(field, fn) {
        this.config.transforms.push({ field, transform: fn, async: true });
        return this;
    }
    // ==================== PIPELINE CREATION ====================
    /**
     * Create a TransformPipeline from this template
     */
    toPipeline() {
        const pipeline = new TransformPipeline_1.TransformPipeline();
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
                pipeline.addComputeAsync(field, compute);
            }
            else {
                pipeline.addCompute(field, compute);
            }
        }
        // Apply transforms
        for (const { field, transform, async: isAsync } of this.config.transforms) {
            if (isAsync) {
                pipeline.addTransformAsync(field, transform);
            }
            else {
                pipeline.addTransform(field, transform);
            }
        }
        return pipeline;
    }
    // ==================== UTILITY ====================
    /**
     * Get template configuration
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Clone template
     */
    clone() {
        const cloned = new ResponseTemplate(this.config.name);
        cloned.config = Object.assign(Object.assign({}, this.config), { excludes: [...this.config.excludes], includes: [...this.config.includes], renames: [...this.config.renames], computes: [...this.config.computes], transforms: [...this.config.transforms], conditionals: [...this.config.conditionals] });
        return cloned;
    }
    /**
     * Merge with another template
     */
    merge(other) {
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
exports.ResponseTemplate = ResponseTemplate;
// ==================== COMMON TEMPLATES ====================
/**
 * Pre-defined templates for common use cases
 */
exports.CommonTemplates = {
    /**
     * User template - excludes sensitive fields, renames _id
     */
    user: () => new ResponseTemplate('user')
        .excludeSensitive()
        .renameId(),
    /**
     * Public user template - only safe public fields
     */
    userPublic: () => new ResponseTemplate('userPublic')
        .include('_id', 'name', 'profile', 'role', 'createdAt')
        .renameId(),
    /**
     * Admin user template - more fields visible
     */
    userAdmin: () => new ResponseTemplate('userAdmin')
        .exclude('password', 'authentication', '__v')
        .renameId(),
    /**
     * Message template
     */
    message: () => new ResponseTemplate('message')
        .exclude('__v')
        .renameId(),
    /**
     * Chat template
     */
    chat: () => new ResponseTemplate('chat')
        .exclude('__v')
        .renameId(),
    /**
     * Notification template
     */
    notification: () => new ResponseTemplate('notification')
        .exclude('__v')
        .renameId(),
};
/**
 * Get a common template by name
 */
const getCommonTemplate = (name) => {
    const factory = exports.CommonTemplates[name];
    if (!factory) {
        throw new Error(`Unknown template: ${name}`);
    }
    return factory();
};
exports.getCommonTemplate = getCommonTemplate;
/**
 * Create a new empty template
 */
const createTemplate = (name) => {
    return new ResponseTemplate(name);
};
exports.createTemplate = createTemplate;
exports.default = ResponseTemplate;
