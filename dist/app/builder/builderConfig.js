"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBuilderConfig = void 0;
exports.getBuilderConfig = getBuilderConfig;
exports.clearConfigCache = clearConfigCache;
exports.setBuilderConfig = setBuilderConfig;
exports.getCacheConfig = getCacheConfig;
// ==================== DEFAULT CONFIG ====================
exports.defaultBuilderConfig = {
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
let cachedConfig = null;
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
function getBuilderConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const config = {
        pdf: Object.assign(Object.assign({}, exports.defaultBuilderConfig.pdf), { puppeteerTimeout: parseInt(process.env.BUILDER_PDF_TIMEOUT || String(exports.defaultBuilderConfig.pdf.puppeteerTimeout)) }),
        export: Object.assign(Object.assign({}, exports.defaultBuilderConfig.export), { maxRowsInMemory: parseInt(process.env.BUILDER_EXPORT_MAX_ROWS || String(exports.defaultBuilderConfig.export.maxRowsInMemory)), csvDelimiter: process.env.BUILDER_CSV_DELIMITER || exports.defaultBuilderConfig.export.csvDelimiter }),
        email: Object.assign(Object.assign({}, exports.defaultBuilderConfig.email), { maxRetries: parseInt(process.env.BUILDER_EMAIL_MAX_RETRIES || String(exports.defaultBuilderConfig.email.maxRetries)), smtpTimeout: parseInt(process.env.BUILDER_EMAIL_TIMEOUT || String(exports.defaultBuilderConfig.email.smtpTimeout)) }),
        notification: Object.assign(Object.assign({}, exports.defaultBuilderConfig.notification), { maxRetries: parseInt(process.env.BUILDER_NOTIFICATION_MAX_RETRIES ||
                String(exports.defaultBuilderConfig.notification.maxRetries)), batchSize: parseInt(process.env.BUILDER_NOTIFICATION_BATCH_SIZE ||
                String(exports.defaultBuilderConfig.notification.batchSize)), throwOnError: process.env.BUILDER_NOTIFICATION_THROW_ON_ERROR === 'true' }),
        query: Object.assign(Object.assign({}, exports.defaultBuilderConfig.query), { defaultLimit: parseInt(process.env.BUILDER_QUERY_DEFAULT_LIMIT || String(exports.defaultBuilderConfig.query.defaultLimit)), maxLimit: parseInt(process.env.BUILDER_QUERY_MAX_LIMIT || String(exports.defaultBuilderConfig.query.maxLimit)) }),
        aggregation: Object.assign(Object.assign({}, exports.defaultBuilderConfig.aggregation), { defaultLimit: parseInt(process.env.BUILDER_AGG_DEFAULT_LIMIT ||
                String(exports.defaultBuilderConfig.aggregation.defaultLimit)), maxLimit: parseInt(process.env.BUILDER_AGG_MAX_LIMIT || String(exports.defaultBuilderConfig.aggregation.maxLimit)), recordMetrics: process.env.BUILDER_AGG_RECORD_METRICS !== 'false' }),
        job: Object.assign(Object.assign({}, exports.defaultBuilderConfig.job), { defaultPriority: parseInt(process.env.BUILDER_JOB_DEFAULT_PRIORITY || String(exports.defaultBuilderConfig.job.defaultPriority)), maxRetries: parseInt(process.env.BUILDER_JOB_MAX_RETRIES || String(exports.defaultBuilderConfig.job.maxRetries)), retryDelay: parseInt(process.env.BUILDER_JOB_RETRY_DELAY || String(exports.defaultBuilderConfig.job.retryDelay)), pollInterval: parseInt(process.env.BUILDER_JOB_POLL_INTERVAL || String(exports.defaultBuilderConfig.job.pollInterval)), defaultConcurrency: parseInt(process.env.BUILDER_JOB_CONCURRENCY || String(exports.defaultBuilderConfig.job.defaultConcurrency)), jobTimeout: parseInt(process.env.BUILDER_JOB_TIMEOUT || String(exports.defaultBuilderConfig.job.jobTimeout)), completedJobTTL: parseInt(process.env.BUILDER_JOB_COMPLETED_TTL || String(exports.defaultBuilderConfig.job.completedJobTTL)), recordMetrics: process.env.BUILDER_JOB_RECORD_METRICS !== 'false' }),
        cache: Object.assign(Object.assign({}, exports.defaultBuilderConfig.cache), { defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || String(exports.defaultBuilderConfig.cache.defaultTTL)), maxTTL: parseInt(process.env.CACHE_MAX_TTL || String(exports.defaultBuilderConfig.cache.maxTTL)), defaultLayer: process.env.CACHE_DEFAULT_LAYER ||
                exports.defaultBuilderConfig.cache.defaultLayer, enableMetrics: process.env.CACHE_ENABLE_METRICS !== 'false', enableLogging: process.env.CACHE_ENABLE_LOGGING !== 'false', memory: Object.assign(Object.assign({}, exports.defaultBuilderConfig.cache.memory), { enabled: process.env.CACHE_MEMORY_ENABLED !== 'false', ttl: parseInt(process.env.CACHE_MEMORY_TTL || String(exports.defaultBuilderConfig.cache.memory.ttl)), l1TtlRatio: parseFloat(process.env.CACHE_L1_TTL_RATIO || String(exports.defaultBuilderConfig.cache.memory.l1TtlRatio)) }), redis: Object.assign(Object.assign({}, exports.defaultBuilderConfig.cache.redis), { enabled: process.env.CACHE_REDIS_ENABLED !== 'false', url: process.env.REDIS_URL || exports.defaultBuilderConfig.cache.redis.url, prefix: process.env.CACHE_REDIS_PREFIX || exports.defaultBuilderConfig.cache.redis.prefix, maxRetries: parseInt(process.env.CACHE_REDIS_MAX_RETRIES || String(exports.defaultBuilderConfig.cache.redis.maxRetries)) }) }),
        socket: Object.assign(Object.assign({}, exports.defaultBuilderConfig.socket), { defaultThrottleTTL: parseInt(process.env.SOCKET_DEFAULT_THROTTLE_TTL ||
                String(exports.defaultBuilderConfig.socket.defaultThrottleTTL)), enableDebug: process.env.SOCKET_ENABLE_DEBUG === 'true', enableMetrics: process.env.SOCKET_ENABLE_METRICS !== 'false', roomPrefixes: {
                chat: process.env.SOCKET_CHAT_PREFIX || exports.defaultBuilderConfig.socket.roomPrefixes.chat,
                user: process.env.SOCKET_USER_PREFIX || exports.defaultBuilderConfig.socket.roomPrefixes.user,
            } }),
    };
    cachedConfig = config;
    return config;
}
/**
 * Clear config cache (useful for testing)
 */
function clearConfigCache() {
    cachedConfig = null;
}
/**
 * Override config at runtime (useful for testing)
 */
function setBuilderConfig(config) {
    cachedConfig = Object.assign(Object.assign({}, getBuilderConfig()), config);
}
/**
 * Get cache-specific configuration
 * Shorthand for getBuilderConfig().cache
 */
function getCacheConfig() {
    return getBuilderConfig().cache;
}
exports.default = {
    getBuilderConfig,
    getCacheConfig,
    clearConfigCache,
    setBuilderConfig,
    defaultBuilderConfig: exports.defaultBuilderConfig,
};
