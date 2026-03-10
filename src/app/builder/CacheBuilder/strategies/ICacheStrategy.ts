/**
 * ICacheStrategy - Common interface for all cache strategies
 *
 * এই interface টি Memory (NodeCache) এবং Redis উভয় strategy এর জন্য
 * একটি common API provide করে।
 *
 * @example
 * ```typescript
 * class MyStrategy implements ICacheStrategy {
 *   name = 'my-strategy';
 *   async get<T>(key: string): Promise<T | undefined> { ... }
 *   // ... other methods
 * }
 * ```
 */
export interface ICacheStrategy {
  /**
   * Strategy name for logging and debugging
   */
  readonly name: string;

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   * @returns true if successfully stored
   */
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * Delete one or more keys from cache
   * @param keys - Single key or array of keys
   * @returns Number of keys deleted
   */
  del(keys: string | string[]): Promise<number>;

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns true if key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cached data
   */
  flush(): Promise<void>;

  /**
   * Get all keys matching a pattern
   * @param pattern - Glob-style pattern (e.g., "user:*")
   * @returns Array of matching keys
   */
  getKeys(pattern?: string): Promise<string[]>;

  /**
   * Check if the cache strategy is healthy and available
   * @returns true if the cache is operational
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Cache operation result with metadata
 */
export interface ICacheResult<T> {
  /** The cached/fetched data */
  data: T;
  /** Source of the data: 'memory', 'redis', or 'fetch' */
  source: 'memory' | 'redis' | 'fetch';
  /** Whether the data is stale (for stale-while-revalidate) */
  stale: boolean;
  /** Time-to-live remaining in seconds */
  ttl: number;
}

/**
 * Cache statistics
 */
export interface ICacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Total number of keys stored */
  keys: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
}
