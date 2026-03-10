"use strict";
/**
 * CacheInvalidator - Chainable API for cache invalidation
 *
 * Supports invalidation by:
 * - Keys (exact match)
 * - Tags (group invalidation)
 * - Patterns (glob-style matching)
 *
 * @example
 * ```typescript
 * // Invalidate by tag
 * await CacheBuilder.invalidate()
 *   .byTag(`user:${userId}`)
 *   .execute();
 *
 * // Invalidate by pattern
 * await CacheBuilder.invalidate()
 *   .byPattern('user:*')
 *   .execute();
 *
 * // Invalidate specific layer
 * await CacheBuilder.invalidate()
 *   .layer('redis')
 *   .byTag('products')
 *   .execute();
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
exports.CacheInvalidator = void 0;
const MemoryStrategy_1 = require("./strategies/MemoryStrategy");
const RedisStrategy_1 = require("./strategies/RedisStrategy");
const MultiLayerStrategy_1 = require("./strategies/MultiLayerStrategy");
const builderTracing_1 = require("../builderTracing");
const types_1 = require("./types");
const logger_1 = require("../../../shared/logger");
// Singleton strategy instances (same as CacheBuilder)
let memoryStrategy = null;
let redisStrategy = null;
let multiLayerStrategy = null;
function getStrategy(layer) {
    switch (layer) {
        case 'memory':
            if (!memoryStrategy) {
                memoryStrategy = new MemoryStrategy_1.MemoryStrategy({
                    ttl: types_1.DEFAULT_CACHE_CONFIG.memory.ttl,
                });
            }
            return memoryStrategy;
        case 'redis':
            if (!redisStrategy) {
                redisStrategy = new RedisStrategy_1.RedisStrategy({
                    prefix: types_1.DEFAULT_CACHE_CONFIG.redis.prefix,
                });
            }
            return redisStrategy;
        case 'multi':
        default:
            if (!multiLayerStrategy) {
                multiLayerStrategy = new MultiLayerStrategy_1.MultiLayerStrategy();
            }
            return multiLayerStrategy;
    }
}
class CacheInvalidator {
    constructor() {
        this.keys = [];
        this.tags = [];
        this.patterns = [];
        this.targetLayer = 'multi';
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LAYER SELECTION
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set the layer to invalidate
     * Default: 'multi' (both L1 and L2)
     */
    layer(layer) {
        this.targetLayer = layer;
        return this;
    }
    /**
     * Invalidate only memory cache
     */
    memoryOnly() {
        return this.layer('memory');
    }
    /**
     * Invalidate only Redis cache
     */
    redisOnly() {
        return this.layer('redis');
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // INVALIDATION TARGETS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Invalidate by exact key parts
     *
     * @example
     * .byKey('user', 'profile', userId) → deletes 'user:profile:123'
     */
    byKey(...parts) {
        const key = parts.join(':');
        if (!this.keys.includes(key)) {
            this.keys.push(key);
        }
        return this;
    }
    /**
     * Invalidate by multiple keys
     */
    byKeys(keys) {
        for (const key of keys) {
            if (!this.keys.includes(key)) {
                this.keys.push(key);
            }
        }
        return this;
    }
    /**
     * Invalidate by tag (all keys associated with this tag)
     *
     * @example
     * .byTag(`user:${userId}`) → deletes all user-related cache
     */
    byTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
        return this;
    }
    /**
     * Invalidate by multiple tags
     */
    byTags(tags) {
        for (const tag of tags) {
            if (!this.tags.includes(tag)) {
                this.tags.push(tag);
            }
        }
        return this;
    }
    /**
     * Invalidate by pattern (glob-style)
     *
     * @example
     * .byPattern('user:*') → deletes all keys starting with 'user:'
     * .byPattern('chat:*:messages') → deletes 'chat:123:messages', etc.
     */
    byPattern(pattern) {
        if (!this.patterns.includes(pattern)) {
            this.patterns.push(pattern);
        }
        return this;
    }
    /**
     * Invalidate by multiple patterns
     */
    byPatterns(patterns) {
        for (const pattern of patterns) {
            if (!this.patterns.includes(pattern)) {
                this.patterns.push(pattern);
            }
        }
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EXECUTE
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Execute the invalidation
     */
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('CacheInvalidator', 'execute', (span) => __awaiter(this, void 0, void 0, function* () {
                const strategy = getStrategy(this.targetLayer);
                let totalDeleted = 0;
                const deletedKeys = [];
                span.setAttribute('invalidate.layer', this.targetLayer);
                span.setAttribute('invalidate.keys_count', this.keys.length);
                span.setAttribute('invalidate.tags_count', this.tags.length);
                span.setAttribute('invalidate.patterns_count', this.patterns.length);
                // 1. Delete by exact keys
                if (this.keys.length > 0) {
                    const deleted = yield strategy.del(this.keys);
                    totalDeleted += deleted;
                    deletedKeys.push(...this.keys);
                    logger_1.logger.debug(`[CACHE][INVALIDATE] Keys: ${this.keys.join(', ')} → ${deleted} deleted`);
                }
                // 2. Delete by tags
                for (const tag of this.tags) {
                    const tagKey = `tag:${tag}`;
                    const taggedKeys = yield strategy.get(tagKey);
                    if (taggedKeys && taggedKeys.length > 0) {
                        const deleted = yield strategy.del(taggedKeys);
                        totalDeleted += deleted;
                        deletedKeys.push(...taggedKeys);
                        // Also delete the tag entry itself
                        yield strategy.del(tagKey);
                        logger_1.logger.debug(`[CACHE][INVALIDATE] Tag '${tag}': ${taggedKeys.length} keys → ${deleted} deleted`);
                    }
                }
                // 3. Delete by patterns
                for (const pattern of this.patterns) {
                    const matchedKeys = yield strategy.getKeys(pattern);
                    if (matchedKeys.length > 0) {
                        const deleted = yield strategy.del(matchedKeys);
                        totalDeleted += deleted;
                        deletedKeys.push(...matchedKeys);
                        logger_1.logger.debug(`[CACHE][INVALIDATE] Pattern '${pattern}': ${matchedKeys.length} keys → ${deleted} deleted`);
                    }
                }
                span.setAttribute('invalidate.total_deleted', totalDeleted);
                logger_1.logger.info(`[CACHE][INVALIDATE] Complete | Layer: ${this.targetLayer} | Deleted: ${totalDeleted}`);
                return {
                    deleted: totalDeleted,
                    keys: deletedKeys,
                };
            }), {
                'invalidate.keys': this.keys.join(','),
                'invalidate.tags': this.tags.join(','),
                'invalidate.patterns': this.patterns.join(','),
            });
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Quick invalidation by key
     */
    static key(...parts) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CacheInvalidator().byKey(...parts).execute();
        });
    }
    /**
     * Quick invalidation by tag
     */
    static tag(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CacheInvalidator().byTag(tag).execute();
        });
    }
    /**
     * Quick invalidation by pattern
     */
    static pattern(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CacheInvalidator().byPattern(pattern).execute();
        });
    }
    /**
     * Invalidate all user-related cache
     */
    static user(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CacheInvalidator()
                .byTag(`user:${userId}`)
                .byPattern(`user:${userId}:*`)
                .execute();
        });
    }
    /**
     * Invalidate all chat-related cache
     */
    static chat(chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            return new CacheInvalidator()
                .byTag(`chat:${chatId}`)
                .byPattern(`chat:${chatId}:*`)
                .execute();
        });
    }
}
exports.CacheInvalidator = CacheInvalidator;
exports.default = CacheInvalidator;
