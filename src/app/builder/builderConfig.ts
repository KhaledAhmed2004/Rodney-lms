/**
 * Builder Configuration - Centralized config for all builders
 *
 * Provides configurable defaults that can be overridden via environment
 * variables or runtime options.
 *
 * @example
 * ```typescript
 * import { getBuilderConfig } from './builderConfig';
 *
 * const config = getBuilderConfig();
 * const margin = config.pdf.defaultMargins; // '20mm'
 * ```
 */

// ==================== INTERFACES ====================

export interface IPdfConfig {
  /** Default page margins (e.g., '20mm', '1in') */
  defaultMargins: string;
  /** Default font family */
  defaultFont: string;
  /** Puppeteer timeout in milliseconds */
  puppeteerTimeout: number;
  /** Default page format */
  defaultFormat: 'A4' | 'Letter' | 'Legal';
  /** Print background colors/images */
  printBackground: boolean;
}

export interface IExportConfig {
  /** CSV field delimiter */
  csvDelimiter: string;
  /** Date format for export */
  dateFormat: string;
  /** Maximum rows to hold in memory before streaming */
  maxRowsInMemory: number;
  /** Default filename prefix */
  filenamePrefix: string;
  /** Include BOM for Excel CSV compatibility */
  includeBom: boolean;
}

export interface IEmailConfig {
  /** SMTP connection timeout in milliseconds */
  smtpTimeout: number;
  /** Maximum retry attempts for failed sends */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Default theme name */
  defaultTheme: string;
}

export interface INotificationConfig {
  /** Maximum retry attempts for failed channel deliveries */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Batch size for bulk notifications */
  batchSize: number;
  /** Default channels to enable */
  defaultChannels: ('push' | 'socket' | 'email' | 'database')[];
  /** Whether to throw errors or fail silently */
  throwOnError: boolean;
}

export interface IQueryConfig {
  /** Default page size for pagination */
  defaultLimit: number;
  /** Maximum allowed page size */
  maxLimit: number;
  /** Default sort field */
  defaultSort: string;
}

export interface IAggregationConfig {
  /** Default page size for pagination */
  defaultLimit: number;
  /** Maximum allowed page size */
  maxLimit: number;
  /** Enable query metrics recording */
  recordMetrics: boolean;
}

export interface IJobConfig {
  /** Default job priority (1-10) */
  defaultPriority: number;
  /** Default max retry attempts */
  maxRetries: number;
  /** Default retry delay in milliseconds */
  retryDelay: number;
  /** Worker poll interval in milliseconds */
  pollInterval: number;
  /** Default worker concurrency */
  defaultConcurrency: number;
  /** Default job timeout in milliseconds */
  jobTimeout: number;
  /** TTL for completed jobs in seconds (default: 7 days) */
  completedJobTTL: number;
  /** Whether to record job metrics */
  recordMetrics: boolean;
}

export interface ICacheConfig {
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Maximum TTL allowed */
  maxTTL: number;
  /** Default layer: 'memory' | 'redis' | 'multi' */
  defaultLayer: 'memory' | 'redis' | 'multi';
  /** Enable metrics recording */
  enableMetrics: boolean;
  /** Enable debug logging */
  enableLogging: boolean;
  /** Memory (L1) layer configuration */
  memory: {
    enabled: boolean;
    ttl: number;
    checkperiod: number;
    l1TtlRatio: number;
  };
  /** Redis (L2) layer configuration */
  redis: {
    enabled: boolean;
    url?: string;
    prefix: string;
    maxRetries: number;
    retryDelay: number;
  };
}

export interface ISocketConfig {
  /** Default throttle TTL in milliseconds */
  defaultThrottleTTL: number;
  /** Enable debug logging globally */
  enableDebug: boolean;
  /** Enable metrics recording */
  enableMetrics: boolean;
  /** Room prefixes */
  roomPrefixes: {
    chat: string;
    user: string;
  };
}

export interface IBuilderConfig {
  pdf: IPdfConfig;
  export: IExportConfig;
  email: IEmailConfig;
  notification: INotificationConfig;
  query: IQueryConfig;
  aggregation: IAggregationConfig;
  job: IJobConfig;
  cache: ICacheConfig;
  socket: ISocketConfig;
}

// ==================== DEFAULT CONFIG ====================

export const defaultBuilderConfig: IBuilderConfig = {
  pdf: {
    defaultMargins: '20mm',
    defaultFont: 'Arial, Helvetica, sans-serif',
    puppeteerTimeout: 30000,
    defaultFormat: 'A4',
    printBackground: true,
  },
  export: {
    csvDelimiter: ',',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    maxRowsInMemory: 10000,
    filenamePrefix: 'export',
    includeBom: true,
  },
  email: {
    smtpTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    defaultTheme: 'default',
  },
  notification: {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 100,
    defaultChannels: [],
    throwOnError: false,
  },
  query: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultSort: '-createdAt',
  },
  aggregation: {
    defaultLimit: 10,
    maxLimit: 100,
    recordMetrics: true,
  },
  job: {
    defaultPriority: 5,
    maxRetries: 3,
    retryDelay: 5000,
    pollInterval: 1000,
    defaultConcurrency: 5,
    jobTimeout: 60000,
    completedJobTTL: 60 * 60 * 24 * 7, // 7 days
    recordMetrics: true,
  },
  cache: {
    defaultTTL: 300, // 5 minutes
    maxTTL: 86400, // 24 hours
    defaultLayer: 'multi',
    enableMetrics: true,
    enableLogging: true,
    memory: {
      enabled: true,
      ttl: 60, // 1 minute default for L1
      checkperiod: 60,
      l1TtlRatio: 0.2, // L1 gets 20% of L2 TTL
    },
    redis: {
      enabled: true,
      url: undefined, // Will use REDIS_URL env var
      prefix: 'cache:',
      maxRetries: 3,
      retryDelay: 100,
    },
  },
  socket: {
    defaultThrottleTTL: 5000, // 5 seconds default throttle
    enableDebug: false,
    enableMetrics: true,
    roomPrefixes: {
      chat: 'chat::',
      user: 'user::',
    },
  },
};

// ==================== CONFIG CACHE ====================

let cachedConfig: IBuilderConfig | null = null;

// ==================== CONFIG GETTER ====================

/**
 * Get builder configuration with environment overrides
 *
 * Environment variables (optional):
 * - BUILDER_PDF_TIMEOUT: Puppeteer timeout
 * - BUILDER_EXPORT_MAX_ROWS: Max rows in memory
 * - BUILDER_EMAIL_MAX_RETRIES: Email retry attempts
 * - BUILDER_NOTIFICATION_BATCH_SIZE: Notification batch size
 * - BUILDER_QUERY_DEFAULT_LIMIT: Default pagination limit
 * - BUILDER_QUERY_MAX_LIMIT: Maximum pagination limit
 */
export function getBuilderConfig(): IBuilderConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config: IBuilderConfig = {
    pdf: {
      ...defaultBuilderConfig.pdf,
      puppeteerTimeout: parseInt(
        process.env.BUILDER_PDF_TIMEOUT || String(defaultBuilderConfig.pdf.puppeteerTimeout)
      ),
    },
    export: {
      ...defaultBuilderConfig.export,
      maxRowsInMemory: parseInt(
        process.env.BUILDER_EXPORT_MAX_ROWS || String(defaultBuilderConfig.export.maxRowsInMemory)
      ),
      csvDelimiter: process.env.BUILDER_CSV_DELIMITER || defaultBuilderConfig.export.csvDelimiter,
    },
    email: {
      ...defaultBuilderConfig.email,
      maxRetries: parseInt(
        process.env.BUILDER_EMAIL_MAX_RETRIES || String(defaultBuilderConfig.email.maxRetries)
      ),
      smtpTimeout: parseInt(
        process.env.BUILDER_EMAIL_TIMEOUT || String(defaultBuilderConfig.email.smtpTimeout)
      ),
    },
    notification: {
      ...defaultBuilderConfig.notification,
      maxRetries: parseInt(
        process.env.BUILDER_NOTIFICATION_MAX_RETRIES ||
          String(defaultBuilderConfig.notification.maxRetries)
      ),
      batchSize: parseInt(
        process.env.BUILDER_NOTIFICATION_BATCH_SIZE ||
          String(defaultBuilderConfig.notification.batchSize)
      ),
      throwOnError: process.env.BUILDER_NOTIFICATION_THROW_ON_ERROR === 'true',
    },
    query: {
      ...defaultBuilderConfig.query,
      defaultLimit: parseInt(
        process.env.BUILDER_QUERY_DEFAULT_LIMIT || String(defaultBuilderConfig.query.defaultLimit)
      ),
      maxLimit: parseInt(
        process.env.BUILDER_QUERY_MAX_LIMIT || String(defaultBuilderConfig.query.maxLimit)
      ),
    },
    aggregation: {
      ...defaultBuilderConfig.aggregation,
      defaultLimit: parseInt(
        process.env.BUILDER_AGG_DEFAULT_LIMIT ||
          String(defaultBuilderConfig.aggregation.defaultLimit)
      ),
      maxLimit: parseInt(
        process.env.BUILDER_AGG_MAX_LIMIT || String(defaultBuilderConfig.aggregation.maxLimit)
      ),
      recordMetrics: process.env.BUILDER_AGG_RECORD_METRICS !== 'false',
    },
    job: {
      ...defaultBuilderConfig.job,
      defaultPriority: parseInt(
        process.env.BUILDER_JOB_DEFAULT_PRIORITY || String(defaultBuilderConfig.job.defaultPriority)
      ),
      maxRetries: parseInt(
        process.env.BUILDER_JOB_MAX_RETRIES || String(defaultBuilderConfig.job.maxRetries)
      ),
      retryDelay: parseInt(
        process.env.BUILDER_JOB_RETRY_DELAY || String(defaultBuilderConfig.job.retryDelay)
      ),
      pollInterval: parseInt(
        process.env.BUILDER_JOB_POLL_INTERVAL || String(defaultBuilderConfig.job.pollInterval)
      ),
      defaultConcurrency: parseInt(
        process.env.BUILDER_JOB_CONCURRENCY || String(defaultBuilderConfig.job.defaultConcurrency)
      ),
      jobTimeout: parseInt(
        process.env.BUILDER_JOB_TIMEOUT || String(defaultBuilderConfig.job.jobTimeout)
      ),
      completedJobTTL: parseInt(
        process.env.BUILDER_JOB_COMPLETED_TTL || String(defaultBuilderConfig.job.completedJobTTL)
      ),
      recordMetrics: process.env.BUILDER_JOB_RECORD_METRICS !== 'false',
    },
    cache: {
      ...defaultBuilderConfig.cache,
      defaultTTL: parseInt(
        process.env.CACHE_DEFAULT_TTL || String(defaultBuilderConfig.cache.defaultTTL)
      ),
      maxTTL: parseInt(process.env.CACHE_MAX_TTL || String(defaultBuilderConfig.cache.maxTTL)),
      defaultLayer: (process.env.CACHE_DEFAULT_LAYER as 'memory' | 'redis' | 'multi') ||
        defaultBuilderConfig.cache.defaultLayer,
      enableMetrics: process.env.CACHE_ENABLE_METRICS !== 'false',
      enableLogging: process.env.CACHE_ENABLE_LOGGING !== 'false',
      memory: {
        ...defaultBuilderConfig.cache.memory,
        enabled: process.env.CACHE_MEMORY_ENABLED !== 'false',
        ttl: parseInt(
          process.env.CACHE_MEMORY_TTL || String(defaultBuilderConfig.cache.memory.ttl)
        ),
        l1TtlRatio: parseFloat(
          process.env.CACHE_L1_TTL_RATIO || String(defaultBuilderConfig.cache.memory.l1TtlRatio)
        ),
      },
      redis: {
        ...defaultBuilderConfig.cache.redis,
        enabled: process.env.CACHE_REDIS_ENABLED !== 'false',
        url: process.env.REDIS_URL || defaultBuilderConfig.cache.redis.url,
        prefix: process.env.CACHE_REDIS_PREFIX || defaultBuilderConfig.cache.redis.prefix,
        maxRetries: parseInt(
          process.env.CACHE_REDIS_MAX_RETRIES || String(defaultBuilderConfig.cache.redis.maxRetries)
        ),
      },
    },
    socket: {
      ...defaultBuilderConfig.socket,
      defaultThrottleTTL: parseInt(
        process.env.SOCKET_DEFAULT_THROTTLE_TTL ||
          String(defaultBuilderConfig.socket.defaultThrottleTTL)
      ),
      enableDebug: process.env.SOCKET_ENABLE_DEBUG === 'true',
      enableMetrics: process.env.SOCKET_ENABLE_METRICS !== 'false',
      roomPrefixes: {
        chat: process.env.SOCKET_CHAT_PREFIX || defaultBuilderConfig.socket.roomPrefixes.chat,
        user: process.env.SOCKET_USER_PREFIX || defaultBuilderConfig.socket.roomPrefixes.user,
      },
    },
  };

  cachedConfig = config;
  return config;
}

/**
 * Clear config cache (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Override config at runtime (useful for testing)
 */
export function setBuilderConfig(config: Partial<IBuilderConfig>): void {
  cachedConfig = {
    ...getBuilderConfig(),
    ...config,
  };
}

/**
 * Get cache-specific configuration
 * Shorthand for getBuilderConfig().cache
 */
export function getCacheConfig(): ICacheConfig {
  return getBuilderConfig().cache;
}

export default {
  getBuilderConfig,
  getCacheConfig,
  clearConfigCache,
  setBuilderConfig,
  defaultBuilderConfig,
};
