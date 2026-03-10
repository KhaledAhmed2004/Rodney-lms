"use strict";
/**
 * CacheBuilder - Chainable, fluent API for caching operations
 *
 * Supports three caching modes:
 * - `.memory()` - শুধু NodeCache (ultra fast, per-instance)
 * - `.redis()` - শুধু Redis (shared, distributed)
 * - `.multiLayer()` or default - Both L1 (Memory) + L2 (Redis)
 *
 * @example
 * ```typescript
 * // Default (Multi-Layer)
 * const user = await new CacheBuilder<User>()
 *   .key('user', userId)
 *   .minutes(5)
 *   .fetch(() => User.findById(userId))
 *   .execute();
 *
 * // Memory Only
 * const session = await new CacheBuilder<Session>()
 *   .key('session', id)
 *   .memory()
 *   .ttl(60)
 *   .fetch(() => getSession(id))
 *   .execute();
 *
 * // Redis Only
 * const config = await new CacheBuilder<Config>()
 *   .key('config', 'global')
 *   .redis()
 *   .hours(1)
 *   .fetch(() => loadConfig())
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
exports.CacheBuilder = void 0;
const MemoryStrategy_1 = require("./strategies/MemoryStrategy");
const RedisStrategy_1 = require("./strategies/RedisStrategy");
const MultiLayerStrategy_1 = require("./strategies/MultiLayerStrategy");
const CacheInvalidator_1 = require("./CacheInvalidator");
const builderTracing_1 = require("../builderTracing");
const BuilderError_1 = require("../BuilderError");
const types_1 = require("./types");
// Singleton strategy instances
let memoryStrategy = null;
let redisStrategy = null;
let multiLayerStrategy = null;
/**
 * Get or create a strategy instance
 */
function getStrategy(layer) {
    switch (layer) {
        case 'memory':
            if (!memoryStrategy) {
                memoryStrategy = new MemoryStrategy_1.MemoryStrategy({
                    ttl: types_1.DEFAULT_CACHE_CONFIG.memory.ttl,
                    checkperiod: types_1.DEFAULT_CACHE_CONFIG.memory.checkperiod,
                });
            }
            return memoryStrategy;
        case 'redis':
            if (!redisStrategy) {
                redisStrategy = new RedisStrategy_1.RedisStrategy({
                    url: types_1.DEFAULT_CACHE_CONFIG.redis.url,
                    prefix: types_1.DEFAULT_CACHE_CONFIG.redis.prefix,
                    maxRetries: types_1.DEFAULT_CACHE_CONFIG.redis.maxRetries,
                });
            }
            return redisStrategy;
        case 'multi':
        default:
            if (!multiLayerStrategy) {
                multiLayerStrategy = new MultiLayerStrategy_1.MultiLayerStrategy({
                    memory: {
                        ttl: types_1.DEFAULT_CACHE_CONFIG.memory.ttl,
                        checkperiod: types_1.DEFAULT_CACHE_CONFIG.memory.checkperiod,
                    },
                    redis: {
                        url: types_1.DEFAULT_CACHE_CONFIG.redis.url,
                        prefix: types_1.DEFAULT_CACHE_CONFIG.redis.prefix,
                    },
                    l1TtlRatio: types_1.DEFAULT_CACHE_CONFIG.memory.l1TtlRatio,
                });
            }
            return multiLayerStrategy;
    }
}
class CacheBuilder {
    constructor() {
        this.keyParts = [];
        this.cacheTags = [];
        this.cacheLayer = 'multi';
        this.contextData = {};
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LAYER SELECTION - কোন cache layer ব্যবহার করবেন
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set the cache layer
     */
    layer(layer) {
        this.cacheLayer = layer;
        return this;
    }
    /**
     * Use only Memory (NodeCache) - ultra fast, per-instance
     *
     * কখন ব্যবহার করবেন:
     * - ⚡ Ultra-fast access দরকার
     * - 🔒 Data শুধু এই instance এ দরকার
     * - ⏱️ Sessions, temp tokens
     */
    memory() {
        return this.layer('memory');
    }
    /**
     * Use only Redis - shared across all instances
     *
     * কখন ব্যবহার করবেন:
     * - 🌐 Multiple instances এ same data দরকার
     * - 💾 Server restart এর পরেও data থাকা দরকার
     * - 🔄 Rate limits, locks, counters
     */
    redis() {
        return this.layer('redis');
    }
    /**
     * Use both Memory (L1) + Redis (L2) - default behavior
     *
     * Flow: L1 (Memory) → L2 (Redis) → Database
     */
    multiLayer() {
        return this.layer('multi');
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // KEY BUILDING - Cache key তৈরি
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set cache key parts (will be joined with ':')
     *
     * @example
     * .key('user', 'profile', userId) → 'user:profile:123'
     */
    key(...parts) {
        this.keyParts = parts;
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // TTL - Cache lifetime
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set TTL in seconds
     */
    ttl(seconds) {
        this.ttlSeconds = seconds;
        return this;
    }
    /**
     * Set TTL in minutes
     */
    minutes(m) {
        return this.ttl(m * 60);
    }
    /**
     * Set TTL in hours
     */
    hours(h) {
        return this.ttl(h * 3600);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // TAGS - Group invalidation
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set multiple tags for group invalidation
     */
    tags(tags) {
        this.cacheTags = [...this.cacheTags, ...tags];
        return this;
    }
    /**
     * Add a single tag
     */
    tag(tag) {
        this.cacheTags.push(tag);
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CONDITIONS - When to skip cache
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Skip cache when condition is true
     *
     * @example
     * .skipIf((ctx) => ctx.user?.role === 'admin')
     */
    skipIf(fn) {
        this.skipCondition = fn;
        return this;
    }
    /**
     * Only use cache when condition is true
     *
     * @example
     * .onlyIf((ctx) => ctx.user?.role !== 'admin')
     */
    onlyIf(fn) {
        this.skipCondition = (ctx) => !fn(ctx);
        return this;
    }
    /**
     * Set context data (user, request info)
     */
    context(ctx) {
        this.contextData = Object.assign(Object.assign({}, this.contextData), ctx);
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSFORM & CALLBACKS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Transform data after retrieval
     */
    transform(fn) {
        this.transformFn = fn;
        return this;
    }
    /**
     * Callback when cache hit
     */
    onHit(callback) {
        this.onHitCallback = callback;
        return this;
    }
    /**
     * Callback when cache miss
     */
    onMiss(callback) {
        this.onMissCallback = callback;
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Set the function to fetch fresh data when cache misses
     */
    fetch(fn) {
        this.fetchFn = fn;
        return this;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EXECUTE - Main operation
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Execute the cache operation
     *
     * Flow:
     * 1. Check skip condition
     * 2. Try cache (L1 → L2 for multi-layer)
     * 3. On miss, fetch fresh data
     * 4. Store in cache
     * 5. Return data
     */
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('CacheBuilder', 'execute', (span) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const strategy = getStrategy(this.cacheLayer);
                const cacheKey = this.keyParts.join(':');
                const ttl = (_a = this.ttlSeconds) !== null && _a !== void 0 ? _a : types_1.DEFAULT_CACHE_CONFIG.defaultTTL;
                // Set span attributes
                span.setAttribute('cache.key', cacheKey);
                span.setAttribute('cache.ttl', ttl);
                span.setAttribute('cache.layer', this.cacheLayer);
                span.setAttribute('cache.tags', this.cacheTags.join(','));
                // Build context
                const ctx = Object.assign({ key: cacheKey }, this.contextData);
                // Check skip condition
                if (this.skipCondition && this.skipCondition(ctx)) {
                    span.setAttribute('cache.skipped', true);
                    (0, builderTracing_1.addSpanAttributes)({ 'cache.skip_reason': 'condition' });
                    if (!this.fetchFn) {
                        throw new BuilderError_1.BuilderError('No fetch function provided', 'CacheBuilder', 'execute', undefined, { key: cacheKey });
                    }
                    const data = yield this.fetchFn();
                    return this.transformFn ? this.transformFn(data) : data;
                }
                // Try cache first
                const cached = yield strategy.get(cacheKey);
                if (cached !== undefined) {
                    span.setAttribute('cache.hit', true);
                    span.setAttribute('cache.source', strategy.name);
                    (_b = this.onHitCallback) === null || _b === void 0 ? void 0 : _b.call(this, cached, strategy.name);
                    return this.transformFn ? this.transformFn(cached) : cached;
                }
                // Cache miss
                span.setAttribute('cache.hit', false);
                (_c = this.onMissCallback) === null || _c === void 0 ? void 0 : _c.call(this);
                if (!this.fetchFn) {
                    throw new BuilderError_1.BuilderError('No fetch function provided and cache miss', 'CacheBuilder', 'execute', undefined, { key: cacheKey });
                }
                // Fetch fresh data
                const fresh = yield this.fetchFn();
                // Store in cache
                yield strategy.set(cacheKey, fresh, ttl);
                // Store tags for invalidation
                if (this.cacheTags.length > 0) {
                    yield this.storeTags(strategy, cacheKey);
                }
                span.setAttribute('cache.stored', true);
                return this.transformFn ? this.transformFn(fresh) : fresh;
            }), {
                'cache.key_parts': this.keyParts.join(':'),
                'cache.layer': this.cacheLayer,
            });
        });
    }
    /**
     * Store tag associations for later invalidation
     */
    storeTags(strategy, cacheKey) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const tag of this.cacheTags) {
                const tagKey = `tag:${tag}`;
                const existing = (yield strategy.get(tagKey)) || [];
                if (!existing.includes(cacheKey)) {
                    existing.push(cacheKey);
                    // Tags don't expire
                    yield strategy.set(tagKey, existing);
                }
            }
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Create an invalidator for cache invalidation
     */
    static invalidate() {
        return new CacheInvalidator_1.CacheInvalidator();
    }
    /**
     * Check health of all cache layers
     */
    static health() {
        return __awaiter(this, void 0, void 0, function* () {
            const memoryHealthy = yield getStrategy('memory').isHealthy();
            const redisHealthy = yield getStrategy('redis').isHealthy();
            return {
                healthy: memoryHealthy, // L1 must be healthy
                memory: memoryHealthy,
                redis: redisHealthy,
            };
        });
    }
    /**
     * Flush all caches
     */
    static flushAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                getStrategy('memory').flush(),
                getStrategy('redis').flush(),
            ]);
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRESETS - Common patterns
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Preset for user data caching
     */
    static forUser(userId) {
        return new CacheBuilder()
            .key('user', userId)
            .minutes(5)
            .tag(`user:${userId}`);
    }
    /**
     * Preset for query result caching
     */
    static forQuery(model, queryHash) {
        return new CacheBuilder()
            .key('query', model, queryHash)
            .minutes(1)
            .tag(`model:${model}`);
    }
    /**
     * Preset for aggregation result caching
     */
    static forAggregation(name) {
        return new CacheBuilder()
            .key('agg', name)
            .minutes(2)
            .tag('aggregation');
    }
    /**
     * Preset for session data (memory only)
     */
    static forSession(sessionId) {
        return new CacheBuilder()
            .key('session', sessionId)
            .memory()
            .minutes(1)
            .tag(`session:${sessionId}`);
    }
    /**
     * Preset for distributed/shared data (redis only)
     */
    static forDistributed(...keyParts) {
        return new CacheBuilder().key(...keyParts).redis().hours(1);
    }
    /**
     * Preset for global config (redis only, long TTL)
     */
    static forConfig(configName) {
        return new CacheBuilder()
            .key('config', configName)
            .redis()
            .hours(24)
            .tag('config');
    }
}
exports.CacheBuilder = CacheBuilder;
exports.default = CacheBuilder;
