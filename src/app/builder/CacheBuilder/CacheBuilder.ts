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

import { Span } from '@opentelemetry/api';
import { ICacheStrategy } from './strategies/ICacheStrategy';
import { MemoryStrategy } from './strategies/MemoryStrategy';
import { RedisStrategy } from './strategies/RedisStrategy';
import { MultiLayerStrategy } from './strategies/MultiLayerStrategy';
import { CacheInvalidator } from './CacheInvalidator';
import { traceOperation, addSpanAttributes } from '../builderTracing';
import { BuilderError } from '../BuilderError';
import {
  CacheLayer,
  ICacheContext,
  ICacheHealthStatus,
  DEFAULT_CACHE_CONFIG,
} from './types';

// Singleton strategy instances
let memoryStrategy: MemoryStrategy | null = null;
let redisStrategy: RedisStrategy | null = null;
let multiLayerStrategy: MultiLayerStrategy | null = null;

/**
 * Get or create a strategy instance
 */
function getStrategy(layer: CacheLayer): ICacheStrategy {
  switch (layer) {
    case 'memory':
      if (!memoryStrategy) {
        memoryStrategy = new MemoryStrategy({
          ttl: DEFAULT_CACHE_CONFIG.memory.ttl,
          checkperiod: DEFAULT_CACHE_CONFIG.memory.checkperiod,
        });
      }
      return memoryStrategy;

    case 'redis':
      if (!redisStrategy) {
        redisStrategy = new RedisStrategy({
          url: DEFAULT_CACHE_CONFIG.redis.url,
          prefix: DEFAULT_CACHE_CONFIG.redis.prefix,
          maxRetries: DEFAULT_CACHE_CONFIG.redis.maxRetries,
        });
      }
      return redisStrategy;

    case 'multi':
    default:
      if (!multiLayerStrategy) {
        multiLayerStrategy = new MultiLayerStrategy({
          memory: {
            ttl: DEFAULT_CACHE_CONFIG.memory.ttl,
            checkperiod: DEFAULT_CACHE_CONFIG.memory.checkperiod,
          },
          redis: {
            url: DEFAULT_CACHE_CONFIG.redis.url,
            prefix: DEFAULT_CACHE_CONFIG.redis.prefix,
          },
          l1TtlRatio: DEFAULT_CACHE_CONFIG.memory.l1TtlRatio,
        });
      }
      return multiLayerStrategy;
  }
}

export class CacheBuilder<T> {
  private keyParts: (string | number)[] = [];
  private ttlSeconds?: number;
  private cacheTags: string[] = [];
  private fetchFn?: () => Promise<T>;
  private skipCondition?: (ctx: ICacheContext) => boolean;
  private transformFn?: (data: T) => T;
  private onHitCallback?: (data: T, source: string) => void;
  private onMissCallback?: () => void;
  private cacheLayer: CacheLayer = 'multi';
  private contextData: Partial<ICacheContext> = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER SELECTION - কোন cache layer ব্যবহার করবেন
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set the cache layer
   */
  layer(layer: CacheLayer): this {
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
  memory(): this {
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
  redis(): this {
    return this.layer('redis');
  }

  /**
   * Use both Memory (L1) + Redis (L2) - default behavior
   *
   * Flow: L1 (Memory) → L2 (Redis) → Database
   */
  multiLayer(): this {
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
  key(...parts: (string | number)[]): this {
    this.keyParts = parts;
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TTL - Cache lifetime
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set TTL in seconds
   */
  ttl(seconds: number): this {
    this.ttlSeconds = seconds;
    return this;
  }

  /**
   * Set TTL in minutes
   */
  minutes(m: number): this {
    return this.ttl(m * 60);
  }

  /**
   * Set TTL in hours
   */
  hours(h: number): this {
    return this.ttl(h * 3600);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAGS - Group invalidation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set multiple tags for group invalidation
   */
  tags(tags: string[]): this {
    this.cacheTags = [...this.cacheTags, ...tags];
    return this;
  }

  /**
   * Add a single tag
   */
  tag(tag: string): this {
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
  skipIf(fn: (ctx: ICacheContext) => boolean): this {
    this.skipCondition = fn;
    return this;
  }

  /**
   * Only use cache when condition is true
   *
   * @example
   * .onlyIf((ctx) => ctx.user?.role !== 'admin')
   */
  onlyIf(fn: (ctx: ICacheContext) => boolean): this {
    this.skipCondition = (ctx) => !fn(ctx);
    return this;
  }

  /**
   * Set context data (user, request info)
   */
  context(ctx: Partial<ICacheContext>): this {
    this.contextData = { ...this.contextData, ...ctx };
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORM & CALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transform data after retrieval
   */
  transform(fn: (data: T) => T): this {
    this.transformFn = fn;
    return this;
  }

  /**
   * Callback when cache hit
   */
  onHit(callback: (data: T, source: string) => void): this {
    this.onHitCallback = callback;
    return this;
  }

  /**
   * Callback when cache miss
   */
  onMiss(callback: () => void): this {
    this.onMissCallback = callback;
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set the function to fetch fresh data when cache misses
   */
  fetch(fn: () => Promise<T>): this {
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
  async execute(): Promise<T> {
    return traceOperation(
      'CacheBuilder',
      'execute',
      async (span: Span) => {
        const strategy = getStrategy(this.cacheLayer);
        const cacheKey = this.keyParts.join(':');
        const ttl = this.ttlSeconds ?? DEFAULT_CACHE_CONFIG.defaultTTL;

        // Set span attributes
        span.setAttribute('cache.key', cacheKey);
        span.setAttribute('cache.ttl', ttl);
        span.setAttribute('cache.layer', this.cacheLayer);
        span.setAttribute('cache.tags', this.cacheTags.join(','));

        // Build context
        const ctx: ICacheContext = {
          key: cacheKey,
          ...this.contextData,
        };

        // Check skip condition
        if (this.skipCondition && this.skipCondition(ctx)) {
          span.setAttribute('cache.skipped', true);
          addSpanAttributes({ 'cache.skip_reason': 'condition' });

          if (!this.fetchFn) {
            throw new BuilderError(
              'No fetch function provided',
              'CacheBuilder',
              'execute',
              undefined,
              { key: cacheKey }
            );
          }

          const data = await this.fetchFn();
          return this.transformFn ? this.transformFn(data) : data;
        }

        // Try cache first
        const cached = await strategy.get<T>(cacheKey);
        if (cached !== undefined) {
          span.setAttribute('cache.hit', true);
          span.setAttribute('cache.source', strategy.name);

          this.onHitCallback?.(cached, strategy.name);

          return this.transformFn ? this.transformFn(cached) : cached;
        }

        // Cache miss
        span.setAttribute('cache.hit', false);
        this.onMissCallback?.();

        if (!this.fetchFn) {
          throw new BuilderError(
            'No fetch function provided and cache miss',
            'CacheBuilder',
            'execute',
            undefined,
            { key: cacheKey }
          );
        }

        // Fetch fresh data
        const fresh = await this.fetchFn();

        // Store in cache
        await strategy.set(cacheKey, fresh, ttl);

        // Store tags for invalidation
        if (this.cacheTags.length > 0) {
          await this.storeTags(strategy, cacheKey);
        }

        span.setAttribute('cache.stored', true);

        return this.transformFn ? this.transformFn(fresh) : fresh;
      },
      {
        'cache.key_parts': this.keyParts.join(':'),
        'cache.layer': this.cacheLayer,
      }
    );
  }

  /**
   * Store tag associations for later invalidation
   */
  private async storeTags(
    strategy: ICacheStrategy,
    cacheKey: string
  ): Promise<void> {
    for (const tag of this.cacheTags) {
      const tagKey = `tag:${tag}`;
      const existing = (await strategy.get<string[]>(tagKey)) || [];

      if (!existing.includes(cacheKey)) {
        existing.push(cacheKey);
        // Tags don't expire
        await strategy.set(tagKey, existing);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create an invalidator for cache invalidation
   */
  static invalidate(): CacheInvalidator {
    return new CacheInvalidator();
  }

  /**
   * Check health of all cache layers
   */
  static async health(): Promise<ICacheHealthStatus> {
    const memoryHealthy = await getStrategy('memory').isHealthy();
    const redisHealthy = await getStrategy('redis').isHealthy();

    return {
      healthy: memoryHealthy, // L1 must be healthy
      memory: memoryHealthy,
      redis: redisHealthy,
    };
  }

  /**
   * Flush all caches
   */
  static async flushAll(): Promise<void> {
    await Promise.all([
      getStrategy('memory').flush(),
      getStrategy('redis').flush(),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESETS - Common patterns
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Preset for user data caching
   */
  static forUser<T>(userId: string): CacheBuilder<T> {
    return new CacheBuilder<T>()
      .key('user', userId)
      .minutes(5)
      .tag(`user:${userId}`);
  }

  /**
   * Preset for query result caching
   */
  static forQuery<T>(model: string, queryHash: string): CacheBuilder<T> {
    return new CacheBuilder<T>()
      .key('query', model, queryHash)
      .minutes(1)
      .tag(`model:${model}`);
  }

  /**
   * Preset for aggregation result caching
   */
  static forAggregation<T>(name: string): CacheBuilder<T> {
    return new CacheBuilder<T>()
      .key('agg', name)
      .minutes(2)
      .tag('aggregation');
  }

  /**
   * Preset for session data (memory only)
   */
  static forSession<T>(sessionId: string): CacheBuilder<T> {
    return new CacheBuilder<T>()
      .key('session', sessionId)
      .memory()
      .minutes(1)
      .tag(`session:${sessionId}`);
  }

  /**
   * Preset for distributed/shared data (redis only)
   */
  static forDistributed<T>(...keyParts: (string | number)[]): CacheBuilder<T> {
    return new CacheBuilder<T>().key(...keyParts).redis().hours(1);
  }

  /**
   * Preset for global config (redis only, long TTL)
   */
  static forConfig<T>(configName: string): CacheBuilder<T> {
    return new CacheBuilder<T>()
      .key('config', configName)
      .redis()
      .hours(24)
      .tag('config');
  }
}

export default CacheBuilder;
