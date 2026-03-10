/**
 * CacheBuilder Types - TypeScript interfaces and types
 */

/**
 * Cache layer selection
 */
export type CacheLayer = 'memory' | 'redis' | 'multi';

/**
 * Context passed to condition functions
 */
export interface ICacheContext {
  /** The cache key being used */
  key: string;
  /** Current user info (if available) */
  user?: {
    id: string;
    role: string;
  };
  /** Current request info (if available) */
  request?: {
    path: string;
    method: string;
  };
}

/**
 * Options for CacheBuilder
 */
export interface ICacheBuilderOptions<T> {
  /** Key parts to build the cache key */
  keyParts: (string | number)[];
  /** Time to live in seconds */
  ttl?: number;
  /** Tags for group invalidation */
  tags?: string[];
  /** Cache layer to use */
  layer?: CacheLayer;
  /** Condition to skip cache */
  skipCondition?: (ctx: ICacheContext) => boolean;
  /** Transform function for cached data */
  transform?: (data: T) => T;
  /** Callback when cache hit */
  onHit?: (data: T, source: string) => void;
  /** Callback when cache miss */
  onMiss?: () => void;
  /** Function to fetch fresh data */
  fetch?: () => Promise<T>;
}

/**
 * Result from CacheBuilder.execute()
 */
export interface ICacheExecuteResult<T> {
  /** The data (from cache or fresh) */
  data: T;
  /** Source of the data */
  source: 'memory' | 'redis' | 'fetch' | 'skipped';
  /** Time taken in milliseconds */
  duration: number;
  /** Whether cache was hit */
  hit: boolean;
}

/**
 * Options for cache invalidation
 */
export interface ICacheInvalidateOptions {
  /** Specific keys to invalidate */
  keys?: string[];
  /** Tags to invalidate */
  tags?: string[];
  /** Patterns to match and invalidate */
  patterns?: string[];
  /** Layer to invalidate (default: all layers) */
  layer?: CacheLayer;
}

/**
 * Result from invalidation
 */
export interface ICacheInvalidateResult {
  /** Number of keys deleted */
  deleted: number;
  /** Keys that were deleted */
  keys?: string[];
}

/**
 * Cache health status
 */
export interface ICacheHealthStatus {
  /** Overall health (true if at least L1 is healthy) */
  healthy: boolean;
  /** Memory cache health */
  memory: boolean;
  /** Redis cache health */
  redis: boolean;
}

/**
 * Cache configuration
 */
export interface ICacheConfig {
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Maximum TTL allowed */
  maxTTL: number;
  /** Default layer to use */
  defaultLayer: CacheLayer;
  /** Enable metrics recording */
  enableMetrics: boolean;
  /** Enable debug logging */
  enableLogging: boolean;
  /** Memory layer configuration */
  memory: {
    enabled: boolean;
    ttl: number;
    checkperiod: number;
    l1TtlRatio: number;
  };
  /** Redis layer configuration */
  redis: {
    enabled: boolean;
    url?: string;
    prefix: string;
    maxRetries: number;
    retryDelay: number;
  };
  /** Preset configurations */
  presets: {
    user: { ttl: number; layer: CacheLayer };
    query: { ttl: number; layer: CacheLayer };
    aggregation: { ttl: number; layer: CacheLayer };
    session: { ttl: number; layer: CacheLayer };
    config: { ttl: number; layer: CacheLayer };
  };
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: ICacheConfig = {
  defaultTTL: 600, // 10 minutes
  maxTTL: 86400, // 24 hours
  defaultLayer: 'multi',
  enableMetrics: true,
  enableLogging: true,
  memory: {
    enabled: true,
    ttl: 300, // 5 minutes
    checkperiod: 60,
    l1TtlRatio: 0.2,
  },
  redis: {
    enabled: true,
    prefix: 'cache:',
    maxRetries: 3,
    retryDelay: 100,
  },
  presets: {
    user: { ttl: 300, layer: 'multi' },
    query: { ttl: 60, layer: 'multi' },
    aggregation: { ttl: 120, layer: 'multi' },
    session: { ttl: 60, layer: 'memory' },
    config: { ttl: 3600, layer: 'redis' },
  },
};
