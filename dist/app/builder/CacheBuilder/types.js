"use strict";
/**
 * CacheBuilder Types - TypeScript interfaces and types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_CONFIG = void 0;
/**
 * Default cache configuration
 */
exports.DEFAULT_CACHE_CONFIG = {
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
