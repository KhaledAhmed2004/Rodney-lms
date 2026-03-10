/**
 * MultiLayerStrategy - L1 (Memory) + L2 (Redis) Combined Caching
 *
 * এটি default caching strategy যা দুটি layer ব্যবহার করে:
 * - L1: Memory (NodeCache) - Ultra fast, per-instance
 * - L2: Redis - Shared across instances, persistent
 *
 * Flow:
 * READ:  L1 (Memory) → Miss → L2 (Redis) → Miss → Database
 * WRITE: Database → L2 (Redis) → L1 (Memory)
 * INVALIDATE: L1 + L2 simultaneously
 *
 * বৈশিষ্ট্য:
 * - ⚡ Ultra-fast reads from L1 (memory)
 * - 🌐 Shared data via L2 (Redis)
 * - 🔄 Automatic L1 promotion (Redis hit → Memory cache)
 * - 💪 Graceful degradation (Redis down → Memory only)
 *
 * @example
 * ```typescript
 * const multi = new MultiLayerStrategy();
 * await multi.set('user:123', userData, 300); // 5 min
 * const user = await multi.get<User>('user:123');
 * // First: checks memory, then Redis
 * ```
 */

import { ICacheStrategy } from './ICacheStrategy';
import { MemoryStrategy, IMemoryStrategyOptions } from './MemoryStrategy';
import { RedisStrategy, IRedisStrategyOptions } from './RedisStrategy';
import { logger } from '../../../../shared/logger';

export interface IMultiLayerStrategyOptions {
  /** L1 (Memory) configuration */
  memory?: IMemoryStrategyOptions;
  /** L2 (Redis) configuration */
  redis?: IRedisStrategyOptions;
  /** L1 TTL ratio compared to L2 (default: 0.2 = 20%) */
  l1TtlRatio?: number;
  /** Minimum L1 TTL in seconds (default: 30) */
  minL1Ttl?: number;
  /** Default L1 TTL when no TTL specified (default: 60) */
  defaultL1Ttl?: number;
}

export class MultiLayerStrategy implements ICacheStrategy {
  readonly name = 'multi-layer';
  private l1: MemoryStrategy;
  private l2: RedisStrategy;
  private l1TtlRatio: number;
  private minL1Ttl: number;
  private defaultL1Ttl: number;

  constructor(options: IMultiLayerStrategyOptions = {}) {
    this.l1TtlRatio = options.l1TtlRatio ?? 0.2;
    this.minL1Ttl = options.minL1Ttl ?? 30;
    this.defaultL1Ttl = options.defaultL1Ttl ?? 60;

    // Initialize L1 (Memory)
    this.l1 = new MemoryStrategy({
      ttl: this.defaultL1Ttl,
      checkperiod: 60,
      ...options.memory,
    });

    // Initialize L2 (Redis)
    this.l2 = new RedisStrategy(options.redis);

    logger.info(
      `[CACHE][MULTI] ✅ Initialized | L1 Ratio: ${this.l1TtlRatio * 100}% | Min L1 TTL: ${this.minL1Ttl}s`
    );
  }

  /**
   * Calculate L1 TTL from L2 TTL
   */
  private calculateL1Ttl(l2Ttl?: number): number {
    if (!l2Ttl) return this.defaultL1Ttl;
    return Math.max(Math.floor(l2Ttl * this.l1TtlRatio), this.minL1Ttl);
  }

  /**
   * Get a value - checks L1 first, then L2
   * L2 hit → promotes to L1 for faster subsequent access
   */
  async get<T>(key: string): Promise<T | undefined> {
    // Step 1: Try L1 (Memory) - Ultra fast
    const l1Data = await this.l1.get<T>(key);
    if (l1Data !== undefined) {
      logger.debug(`[CACHE][MULTI] GET ${key} → L1 HIT`);
      return l1Data;
    }

    // Step 2: Try L2 (Redis) - Shared cache
    const l2Data = await this.l2.get<T>(key);
    if (l2Data !== undefined) {
      logger.debug(`[CACHE][MULTI] GET ${key} → L2 HIT (promoting to L1)`);

      // Promote to L1 for faster subsequent access
      // Use default L1 TTL since we don't know original TTL
      await this.l1.set(key, l2Data, this.defaultL1Ttl);

      return l2Data;
    }

    // Both miss
    logger.debug(`[CACHE][MULTI] GET ${key} → MISS (L1 + L2)`);
    return undefined;
  }

  /**
   * Set a value in both L1 and L2
   * L1 gets shorter TTL (20% of L2 by default)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const l1Ttl = this.calculateL1Ttl(ttl);

    // Write to both layers in parallel
    const [l1Ok, l2Ok] = await Promise.all([
      this.l1.set(key, value, l1Ttl),
      this.l2.set(key, value, ttl),
    ]);

    const success = l1Ok || l2Ok; // Success if either works

    logger.debug(
      `[CACHE][MULTI] SET ${key} → L1: ${l1Ok ? 'OK' : 'FAIL'} (${l1Ttl}s), L2: ${l2Ok ? 'OK' : 'FAIL'} (${ttl ?? 'default'}s)`
    );

    return success;
  }

  /**
   * Delete from both L1 and L2
   */
  async del(keys: string | string[]): Promise<number> {
    // Delete from both layers in parallel
    const [l1Count, l2Count] = await Promise.all([
      this.l1.del(keys),
      this.l2.del(keys),
    ]);

    const totalDeleted = Math.max(l1Count, l2Count);

    const keyArray = Array.isArray(keys) ? keys : [keys];
    logger.debug(
      `[CACHE][MULTI] DEL ${keyArray.join(', ')} → L1: ${l1Count}, L2: ${l2Count}`
    );

    return totalDeleted;
  }

  /**
   * Check if key exists in either L1 or L2
   */
  async has(key: string): Promise<boolean> {
    // Check L1 first (faster)
    const l1Has = await this.l1.has(key);
    if (l1Has) return true;

    // Then check L2
    return await this.l2.has(key);
  }

  /**
   * Flush both L1 and L2
   */
  async flush(): Promise<void> {
    await Promise.all([this.l1.flush(), this.l2.flush()]);
    logger.info('[CACHE][MULTI] FLUSH → Both layers cleared');
  }

  /**
   * Get keys from both layers (deduplicated)
   */
  async getKeys(pattern?: string): Promise<string[]> {
    const [l1Keys, l2Keys] = await Promise.all([
      this.l1.getKeys(pattern),
      this.l2.getKeys(pattern),
    ]);

    // Combine and deduplicate
    const allKeys = Array.from(new Set([...l1Keys, ...l2Keys]));

    logger.debug(
      `[CACHE][MULTI] KEYS ${pattern ?? '*'} → L1: ${l1Keys.length}, L2: ${l2Keys.length}, Total: ${allKeys.length}`
    );

    return allKeys;
  }

  /**
   * Check health - L1 must be healthy, L2 is optional
   */
  async isHealthy(): Promise<boolean> {
    const l1Healthy = await this.l1.isHealthy();
    // L2 being down is acceptable (graceful degradation)
    return l1Healthy;
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    l1: { healthy: boolean; name: string };
    l2: { healthy: boolean; name: string };
  }> {
    const [l1Healthy, l2Healthy] = await Promise.all([
      this.l1.isHealthy(),
      this.l2.isHealthy(),
    ]);

    return {
      healthy: l1Healthy, // Overall health based on L1
      l1: { healthy: l1Healthy, name: 'memory' },
      l2: { healthy: l2Healthy, name: 'redis' },
    };
  }

  /**
   * Get statistics from both layers
   */
  getStats(): {
    l1: ReturnType<MemoryStrategy['getStats']>;
    l2: { connected: boolean };
  } {
    return {
      l1: this.l1.getStats(),
      l2: { connected: this.l2.isConnectedToRedis() },
    };
  }

  /**
   * Get L1 (Memory) strategy directly
   */
  getL1(): MemoryStrategy {
    return this.l1;
  }

  /**
   * Get L2 (Redis) strategy directly
   */
  getL2(): RedisStrategy {
    return this.l2;
  }

  /**
   * Sync L1 from L2 (useful for cache warming)
   */
  async warmL1(keys: string[]): Promise<number> {
    let warmed = 0;

    for (const key of keys) {
      const data = await this.l2.get(key);
      if (data !== undefined) {
        await this.l1.set(key, data, this.defaultL1Ttl);
        warmed++;
      }
    }

    logger.info(`[CACHE][MULTI] Warmed ${warmed}/${keys.length} keys from L2 to L1`);
    return warmed;
  }

  /**
   * Invalidate only L1 (useful when you know L2 is source of truth)
   */
  async invalidateL1(keys: string | string[]): Promise<number> {
    return await this.l1.del(keys);
  }

  /**
   * Invalidate only L2 (useful for distributed invalidation)
   */
  async invalidateL2(keys: string | string[]): Promise<number> {
    return await this.l2.del(keys);
  }
}
