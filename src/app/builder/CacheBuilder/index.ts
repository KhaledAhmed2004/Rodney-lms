/**
 * CacheBuilder - Multi-layer caching with chainable API
 *
 * ## Usage
 *
 * ### Memory Only (NodeCache)
 * ```typescript
 * const data = await new CacheBuilder<T>()
 *   .key('session', id)
 *   .memory()
 *   .ttl(60)
 *   .fetch(() => getData())
 *   .execute();
 * ```
 *
 * ### Redis Only
 * ```typescript
 * const config = await new CacheBuilder<T>()
 *   .key('config', 'global')
 *   .redis()
 *   .hours(1)
 *   .fetch(() => loadConfig())
 *   .execute();
 * ```
 *
 * ### Multi-Layer (Default)
 * ```typescript
 * const user = await new CacheBuilder<T>()
 *   .key('user', userId)
 *   .minutes(5)
 *   .fetch(() => User.findById(userId))
 *   .execute();
 * ```
 *
 * ### Invalidation
 * ```typescript
 * await CacheBuilder.invalidate()
 *   .byTag(`user:${userId}`)
 *   .execute();
 * ```
 */

// Main exports
export { CacheBuilder, default } from './CacheBuilder';
export { CacheInvalidator } from './CacheInvalidator';

// Strategy exports
export {
  ICacheStrategy,
  ICacheResult,
  ICacheStats,
  MemoryStrategy,
  IMemoryStrategyOptions,
  RedisStrategy,
  IRedisStrategyOptions,
  MultiLayerStrategy,
  IMultiLayerStrategyOptions,
} from './strategies';

// Type exports
export {
  CacheLayer,
  ICacheContext,
  ICacheBuilderOptions,
  ICacheExecuteResult,
  ICacheInvalidateOptions,
  ICacheInvalidateResult,
  ICacheHealthStatus,
  ICacheConfig,
  DEFAULT_CACHE_CONFIG,
} from './types';
