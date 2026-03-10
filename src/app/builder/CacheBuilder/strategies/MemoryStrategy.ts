/**
 * MemoryStrategy - NodeCache wrapper for L1 (in-memory) caching
 *
 * বৈশিষ্ট্য:
 * - ⚡ Ultra-fast access (0.01ms)
 * - 🔒 Per-instance cache (server restart এ হারিয়ে যায়)
 * - 🚀 No network latency
 * - ⏱️ Automatic TTL expiration
 *
 * কখন ব্যবহার করবেন:
 * - Short-lived data (sessions, temp tokens)
 * - Per-instance data যা share করার দরকার নেই
 * - Ultra-fast access দরকার
 *
 * @example
 * ```typescript
 * const memory = new MemoryStrategy({ ttl: 300 });
 * await memory.set('user:123', userData, 60);
 * const user = await memory.get<User>('user:123');
 * ```
 */

import NodeCache = require('node-cache');
import { ICacheStrategy } from './ICacheStrategy';
import { logger } from '../../../../shared/logger';

export interface IMemoryStrategyOptions {
  /** Default TTL in seconds (default: 300 = 5 minutes) */
  ttl?: number;
  /** Check period for expired keys in seconds (default: 60) */
  checkperiod?: number;
  /** Whether to clone objects (default: false for performance) */
  useClones?: boolean;
  /** Maximum number of keys to store (default: unlimited) */
  maxKeys?: number;
}

export class MemoryStrategy implements ICacheStrategy {
  readonly name = 'memory';
  private cache: NodeCache;
  private options: IMemoryStrategyOptions;

  constructor(options: IMemoryStrategyOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 300,
      checkperiod: options.checkperiod ?? 60,
      useClones: options.useClones ?? false,
      maxKeys: options.maxKeys,
    };

    this.cache = new NodeCache({
      stdTTL: this.options.ttl!,
      checkperiod: this.options.checkperiod!,
      useClones: this.options.useClones!,
      maxKeys: this.options.maxKeys ?? -1,
    });

    // Log cache events in debug mode
    this.cache.on('expired', (key: string) => {
      logger.debug(`[CACHE][MEMORY] Key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.debug('[CACHE][MEMORY] Cache flushed');
    });

    logger.info(
      `[CACHE][MEMORY] ✅ Initialized | TTL: ${this.options.ttl}s | Check: ${this.options.checkperiod}s`
    );
  }

  /**
   * Get a value from memory cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        logger.debug(`[CACHE][MEMORY] GET ${key} → HIT`);
      } else {
        logger.debug(`[CACHE][MEMORY] GET ${key} → MISS`);
      }
      return value;
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] GET ${key} → ERROR: ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * Set a value in memory cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      // Check max keys limit
      if (this.options.maxKeys && this.cache.keys().length >= this.options.maxKeys) {
        // Remove oldest key (simple LRU approximation)
        const keys = this.cache.keys();
        if (keys.length > 0) {
          this.cache.del(keys[0]);
        }
      }

      const success = this.cache.set(key, value, ttl ?? this.options.ttl!);
      logger.debug(
        `[CACHE][MEMORY] SET ${key} → ${success ? 'OK' : 'FAIL'} | TTL: ${ttl ?? this.options.ttl}s`
      );
      return success;
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] SET ${key} → ERROR: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Delete one or more keys from memory cache
   */
  async del(keys: string | string[]): Promise<number> {
    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const deleted = this.cache.del(keyArray);
      logger.debug(`[CACHE][MEMORY] DEL ${keyArray.join(', ')} → ${deleted} deleted`);
      return deleted;
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] DEL → ERROR: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Check if a key exists in memory cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = this.cache.has(key);
      logger.debug(`[CACHE][MEMORY] HAS ${key} → ${exists ? 'YES' : 'NO'}`);
      return exists;
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] HAS ${key} → ERROR: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async flush(): Promise<void> {
    try {
      this.cache.flushAll();
      logger.info('[CACHE][MEMORY] FLUSH → All keys deleted');
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] FLUSH → ERROR: ${(error as Error).message}`);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern?: string): Promise<string[]> {
    try {
      const allKeys = this.cache.keys();

      if (!pattern) {
        return allKeys;
      }

      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\*/g, '.*') // Convert * to .*
        .replace(/\?/g, '.'); // Convert ? to .

      const regex = new RegExp(`^${regexPattern}$`);
      const matchedKeys = allKeys.filter((k) => regex.test(k));

      logger.debug(
        `[CACHE][MEMORY] KEYS ${pattern ?? '*'} → ${matchedKeys.length} keys`
      );
      return matchedKeys;
    } catch (error) {
      logger.warn(`[CACHE][MEMORY] KEYS → ERROR: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Memory cache is always available
   */
  async isHealthy(): Promise<boolean> {
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    keys: number;
    ksize: number;
    vsize: number;
  } {
    return this.cache.getStats();
  }

  /**
   * Get TTL remaining for a key
   */
  getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }

  /**
   * Update TTL for an existing key
   */
  touch(key: string, ttl: number): boolean {
    return this.cache.ttl(key, ttl);
  }
}
