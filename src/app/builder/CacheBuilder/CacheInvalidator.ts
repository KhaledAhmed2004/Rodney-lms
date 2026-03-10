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

import { ICacheStrategy } from './strategies/ICacheStrategy';
import { MemoryStrategy } from './strategies/MemoryStrategy';
import { RedisStrategy } from './strategies/RedisStrategy';
import { MultiLayerStrategy } from './strategies/MultiLayerStrategy';
import { traceOperation } from '../builderTracing';
import { CacheLayer, ICacheInvalidateResult, DEFAULT_CACHE_CONFIG } from './types';
import { logger } from '../../../shared/logger';

// Singleton strategy instances (same as CacheBuilder)
let memoryStrategy: MemoryStrategy | null = null;
let redisStrategy: RedisStrategy | null = null;
let multiLayerStrategy: MultiLayerStrategy | null = null;

function getStrategy(layer: CacheLayer): ICacheStrategy {
  switch (layer) {
    case 'memory':
      if (!memoryStrategy) {
        memoryStrategy = new MemoryStrategy({
          ttl: DEFAULT_CACHE_CONFIG.memory.ttl,
        });
      }
      return memoryStrategy;

    case 'redis':
      if (!redisStrategy) {
        redisStrategy = new RedisStrategy({
          prefix: DEFAULT_CACHE_CONFIG.redis.prefix,
        });
      }
      return redisStrategy;

    case 'multi':
    default:
      if (!multiLayerStrategy) {
        multiLayerStrategy = new MultiLayerStrategy();
      }
      return multiLayerStrategy;
  }
}

export class CacheInvalidator {
  private keys: string[] = [];
  private tags: string[] = [];
  private patterns: string[] = [];
  private targetLayer: CacheLayer = 'multi';

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set the layer to invalidate
   * Default: 'multi' (both L1 and L2)
   */
  layer(layer: CacheLayer): this {
    this.targetLayer = layer;
    return this;
  }

  /**
   * Invalidate only memory cache
   */
  memoryOnly(): this {
    return this.layer('memory');
  }

  /**
   * Invalidate only Redis cache
   */
  redisOnly(): this {
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
  byKey(...parts: (string | number)[]): this {
    const key = parts.join(':');
    if (!this.keys.includes(key)) {
      this.keys.push(key);
    }
    return this;
  }

  /**
   * Invalidate by multiple keys
   */
  byKeys(keys: string[]): this {
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
  byTag(tag: string): this {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }

  /**
   * Invalidate by multiple tags
   */
  byTags(tags: string[]): this {
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
  byPattern(pattern: string): this {
    if (!this.patterns.includes(pattern)) {
      this.patterns.push(pattern);
    }
    return this;
  }

  /**
   * Invalidate by multiple patterns
   */
  byPatterns(patterns: string[]): this {
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
  async execute(): Promise<ICacheInvalidateResult> {
    return traceOperation(
      'CacheInvalidator',
      'execute',
      async (span) => {
        const strategy = getStrategy(this.targetLayer);
        let totalDeleted = 0;
        const deletedKeys: string[] = [];

        span.setAttribute('invalidate.layer', this.targetLayer);
        span.setAttribute('invalidate.keys_count', this.keys.length);
        span.setAttribute('invalidate.tags_count', this.tags.length);
        span.setAttribute('invalidate.patterns_count', this.patterns.length);

        // 1. Delete by exact keys
        if (this.keys.length > 0) {
          const deleted = await strategy.del(this.keys);
          totalDeleted += deleted;
          deletedKeys.push(...this.keys);
          logger.debug(
            `[CACHE][INVALIDATE] Keys: ${this.keys.join(', ')} → ${deleted} deleted`
          );
        }

        // 2. Delete by tags
        for (const tag of this.tags) {
          const tagKey = `tag:${tag}`;
          const taggedKeys = await strategy.get<string[]>(tagKey);

          if (taggedKeys && taggedKeys.length > 0) {
            const deleted = await strategy.del(taggedKeys);
            totalDeleted += deleted;
            deletedKeys.push(...taggedKeys);

            // Also delete the tag entry itself
            await strategy.del(tagKey);

            logger.debug(
              `[CACHE][INVALIDATE] Tag '${tag}': ${taggedKeys.length} keys → ${deleted} deleted`
            );
          }
        }

        // 3. Delete by patterns
        for (const pattern of this.patterns) {
          const matchedKeys = await strategy.getKeys(pattern);

          if (matchedKeys.length > 0) {
            const deleted = await strategy.del(matchedKeys);
            totalDeleted += deleted;
            deletedKeys.push(...matchedKeys);

            logger.debug(
              `[CACHE][INVALIDATE] Pattern '${pattern}': ${matchedKeys.length} keys → ${deleted} deleted`
            );
          }
        }

        span.setAttribute('invalidate.total_deleted', totalDeleted);

        logger.info(
          `[CACHE][INVALIDATE] Complete | Layer: ${this.targetLayer} | Deleted: ${totalDeleted}`
        );

        return {
          deleted: totalDeleted,
          keys: deletedKeys,
        };
      },
      {
        'invalidate.keys': this.keys.join(','),
        'invalidate.tags': this.tags.join(','),
        'invalidate.patterns': this.patterns.join(','),
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Quick invalidation by key
   */
  static async key(...parts: (string | number)[]): Promise<ICacheInvalidateResult> {
    return new CacheInvalidator().byKey(...parts).execute();
  }

  /**
   * Quick invalidation by tag
   */
  static async tag(tag: string): Promise<ICacheInvalidateResult> {
    return new CacheInvalidator().byTag(tag).execute();
  }

  /**
   * Quick invalidation by pattern
   */
  static async pattern(pattern: string): Promise<ICacheInvalidateResult> {
    return new CacheInvalidator().byPattern(pattern).execute();
  }

  /**
   * Invalidate all user-related cache
   */
  static async user(userId: string): Promise<ICacheInvalidateResult> {
    return new CacheInvalidator()
      .byTag(`user:${userId}`)
      .byPattern(`user:${userId}:*`)
      .execute();
  }

  /**
   * Invalidate all chat-related cache
   */
  static async chat(chatId: string): Promise<ICacheInvalidateResult> {
    return new CacheInvalidator()
      .byTag(`chat:${chatId}`)
      .byPattern(`chat:${chatId}:*`)
      .execute();
  }
}

export default CacheInvalidator;
