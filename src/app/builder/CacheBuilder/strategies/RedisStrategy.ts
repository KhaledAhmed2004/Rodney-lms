/**
 * RedisStrategy - Redis wrapper for L2 (distributed) caching
 *
 * বৈশিষ্ট্য:
 * - 🌐 Shared across all server instances
 * - 💾 Persistent (survives server restart)
 * - 🔄 Distributed locks, counters, rate limiting
 * - 📊 Larger storage capacity
 *
 * কখন ব্যবহার করবেন:
 * - Data যা সব instances এ same হওয়া দরকার
 * - Server restart এর পরেও data থাকা দরকার
 * - Rate limiting, session sharing, global config
 *
 * @example
 * ```typescript
 * const redis = new RedisStrategy({ url: 'redis://localhost:6379' });
 * await redis.set('config:global', configData, 3600);
 * const config = await redis.get<Config>('config:global');
 * ```
 */

import Redis from 'ioredis';
import { ICacheStrategy } from './ICacheStrategy';
import { logger, errorLogger } from '../../../../shared/logger';

export interface IRedisStrategyOptions {
  /** Redis connection URL (default: process.env.REDIS_URL) */
  url?: string;
  /** Key prefix for namespacing (default: 'cache:') */
  prefix?: string;
  /** Maximum retries per request (default: 3) */
  maxRetries?: number;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in ms (default: 3000) */
  commandTimeout?: number;
}

export class RedisStrategy implements ICacheStrategy {
  readonly name = 'redis';
  private client: Redis | null = null;
  private isConnected = false;
  private prefix: string;
  private options: IRedisStrategyOptions;

  constructor(options: IRedisStrategyOptions = {}) {
    this.options = {
      url: options.url ?? process.env.REDIS_URL,
      prefix: options.prefix ?? 'cache:',
      maxRetries: options.maxRetries ?? 3,
      connectTimeout: options.connectTimeout ?? 5000,
      commandTimeout: options.commandTimeout ?? 3000,
    };
    this.prefix = this.options.prefix!;

    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private initialize(): void {
    const redisUrl = this.options.url;

    if (!redisUrl) {
      logger.warn(
        '[CACHE][REDIS] ⚠️ No REDIS_URL provided. Redis caching disabled. ' +
          'Set REDIS_URL environment variable to enable Redis.'
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: this.options.maxRetries,
        connectTimeout: this.options.connectTimeout,
        commandTimeout: this.options.commandTimeout,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.warn(`[CACHE][REDIS] Max retries reached, giving up`);
            return null; // Stop retrying
          }
          const delay = Math.min(times * 200, 3000);
          logger.debug(`[CACHE][REDIS] Retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },
        lazyConnect: true,
      });

      // Connection events
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('[CACHE][REDIS] ✅ Connected successfully');
      });

      this.client.on('ready', () => {
        logger.info('[CACHE][REDIS] ✅ Ready to accept commands');
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        errorLogger.error(`[CACHE][REDIS] ❌ Error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('[CACHE][REDIS] ⚠️ Connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('[CACHE][REDIS] 🔄 Reconnecting...');
      });

      // Connect (non-blocking)
      this.client.connect().catch((err: Error) => {
        errorLogger.error(`[CACHE][REDIS] ❌ Initial connection failed: ${err.message}`);
      });
    } catch (error) {
      errorLogger.error(
        `[CACHE][REDIS] ❌ Failed to initialize: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return this.prefix + key;
  }

  /**
   * Check if Redis is available
   */
  private checkConnection(): boolean {
    if (!this.client || !this.isConnected) {
      logger.debug('[CACHE][REDIS] Not connected, skipping operation');
      return false;
    }
    return true;
  }

  /**
   * Get a value from Redis cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.checkConnection()) return undefined;

    try {
      const data = await this.client!.get(this.getKey(key));

      if (data === null) {
        logger.debug(`[CACHE][REDIS] GET ${key} → MISS`);
        return undefined;
      }

      logger.debug(`[CACHE][REDIS] GET ${key} → HIT`);
      return JSON.parse(data) as T;
    } catch (error) {
      errorLogger.error(
        `[CACHE][REDIS] GET ${key} → ERROR: ${(error as Error).message}`
      );
      return undefined;
    }
  }

  /**
   * Set a value in Redis cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.checkConnection()) return false;

    try {
      const serialized = JSON.stringify(value);
      const prefixedKey = this.getKey(key);

      if (ttl && ttl > 0) {
        await this.client!.setex(prefixedKey, ttl, serialized);
      } else {
        await this.client!.set(prefixedKey, serialized);
      }

      logger.debug(
        `[CACHE][REDIS] SET ${key} → OK | TTL: ${ttl ?? 'none'}s | Size: ${serialized.length} bytes`
      );
      return true;
    } catch (error) {
      errorLogger.error(
        `[CACHE][REDIS] SET ${key} → ERROR: ${(error as Error).message}`
      );
      return false;
    }
  }

  /**
   * Delete one or more keys from Redis cache
   */
  async del(keys: string | string[]): Promise<number> {
    if (!this.checkConnection()) return 0;

    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const prefixedKeys = keyArray.map((k) => this.getKey(k));

      if (prefixedKeys.length === 0) return 0;

      const deleted = await this.client!.del(...prefixedKeys);
      logger.debug(`[CACHE][REDIS] DEL ${keyArray.join(', ')} → ${deleted} deleted`);
      return deleted;
    } catch (error) {
      errorLogger.error(`[CACHE][REDIS] DEL → ERROR: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Check if a key exists in Redis cache
   */
  async has(key: string): Promise<boolean> {
    if (!this.checkConnection()) return false;

    try {
      const exists = await this.client!.exists(this.getKey(key));
      logger.debug(`[CACHE][REDIS] HAS ${key} → ${exists === 1 ? 'YES' : 'NO'}`);
      return exists === 1;
    } catch (error) {
      errorLogger.error(`[CACHE][REDIS] HAS ${key} → ERROR: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Clear all cached data (only keys with our prefix)
   */
  async flush(): Promise<void> {
    if (!this.checkConnection()) return;

    try {
      const pattern = this.prefix + '*';
      const keys = await this.client!.keys(pattern);

      if (keys.length > 0) {
        await this.client!.del(...keys);
        logger.info(`[CACHE][REDIS] FLUSH → ${keys.length} keys deleted`);
      } else {
        logger.info('[CACHE][REDIS] FLUSH → No keys to delete');
      }
    } catch (error) {
      errorLogger.error(`[CACHE][REDIS] FLUSH → ERROR: ${(error as Error).message}`);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern?: string): Promise<string[]> {
    if (!this.checkConnection()) return [];

    try {
      const searchPattern = pattern
        ? this.prefix + pattern
        : this.prefix + '*';

      const keys = await this.client!.keys(searchPattern);

      // Remove prefix from keys before returning
      const cleanedKeys = keys.map((k) => k.replace(this.prefix, ''));

      logger.debug(
        `[CACHE][REDIS] KEYS ${pattern ?? '*'} → ${cleanedKeys.length} keys`
      );
      return cleanedKeys;
    } catch (error) {
      errorLogger.error(`[CACHE][REDIS] KEYS → ERROR: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Check if Redis is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get TTL remaining for a key
   */
  async getTtl(key: string): Promise<number> {
    if (!this.checkConnection()) return -2;

    try {
      return await this.client!.ttl(this.getKey(key));
    } catch {
      return -2;
    }
  }

  /**
   * Update TTL for an existing key
   */
  async touch(key: string, ttl: number): Promise<boolean> {
    if (!this.checkConnection()) return false;

    try {
      const result = await this.client!.expire(this.getKey(key), ttl);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, amount = 1): Promise<number | null> {
    if (!this.checkConnection()) return null;

    try {
      if (amount === 1) {
        return await this.client!.incr(this.getKey(key));
      }
      return await this.client!.incrby(this.getKey(key), amount);
    } catch {
      return null;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, amount = 1): Promise<number | null> {
    if (!this.checkConnection()) return null;

    try {
      if (amount === 1) {
        return await this.client!.decr(this.getKey(key));
      }
      return await this.client!.decrby(this.getKey(key), amount);
    } catch {
      return null;
    }
  }

  /**
   * Get the underlying Redis client for advanced operations
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Check if connected to Redis
   */
  isConnectedToRedis(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('[CACHE][REDIS] Disconnected');
    }
  }
}
