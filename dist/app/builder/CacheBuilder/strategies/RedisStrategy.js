"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStrategy = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../../../shared/logger");
class RedisStrategy {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e;
        this.name = 'redis';
        this.client = null;
        this.isConnected = false;
        this.options = {
            url: (_a = options.url) !== null && _a !== void 0 ? _a : process.env.REDIS_URL,
            prefix: (_b = options.prefix) !== null && _b !== void 0 ? _b : 'cache:',
            maxRetries: (_c = options.maxRetries) !== null && _c !== void 0 ? _c : 3,
            connectTimeout: (_d = options.connectTimeout) !== null && _d !== void 0 ? _d : 5000,
            commandTimeout: (_e = options.commandTimeout) !== null && _e !== void 0 ? _e : 3000,
        };
        this.prefix = this.options.prefix;
        this.initialize();
    }
    /**
     * Initialize Redis connection
     */
    initialize() {
        const redisUrl = this.options.url;
        if (!redisUrl) {
            logger_1.logger.warn('[CACHE][REDIS] ⚠️ No REDIS_URL provided. Redis caching disabled. ' +
                'Set REDIS_URL environment variable to enable Redis.');
            return;
        }
        try {
            this.client = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: this.options.maxRetries,
                connectTimeout: this.options.connectTimeout,
                commandTimeout: this.options.commandTimeout,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger_1.logger.warn(`[CACHE][REDIS] Max retries reached, giving up`);
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 200, 3000);
                    logger_1.logger.debug(`[CACHE][REDIS] Retry attempt ${times}, waiting ${delay}ms`);
                    return delay;
                },
                lazyConnect: true,
            });
            // Connection events
            this.client.on('connect', () => {
                this.isConnected = true;
                logger_1.logger.info('[CACHE][REDIS] ✅ Connected successfully');
            });
            this.client.on('ready', () => {
                logger_1.logger.info('[CACHE][REDIS] ✅ Ready to accept commands');
            });
            this.client.on('error', (err) => {
                this.isConnected = false;
                logger_1.errorLogger.error(`[CACHE][REDIS] ❌ Error: ${err.message}`);
            });
            this.client.on('close', () => {
                this.isConnected = false;
                logger_1.logger.warn('[CACHE][REDIS] ⚠️ Connection closed');
            });
            this.client.on('reconnecting', () => {
                logger_1.logger.info('[CACHE][REDIS] 🔄 Reconnecting...');
            });
            // Connect (non-blocking)
            this.client.connect().catch((err) => {
                logger_1.errorLogger.error(`[CACHE][REDIS] ❌ Initial connection failed: ${err.message}`);
            });
        }
        catch (error) {
            logger_1.errorLogger.error(`[CACHE][REDIS] ❌ Failed to initialize: ${error.message}`);
        }
    }
    /**
     * Get prefixed key
     */
    getKey(key) {
        return this.prefix + key;
    }
    /**
     * Check if Redis is available
     */
    checkConnection() {
        if (!this.client || !this.isConnected) {
            logger_1.logger.debug('[CACHE][REDIS] Not connected, skipping operation');
            return false;
        }
        return true;
    }
    /**
     * Get a value from Redis cache
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return undefined;
            try {
                const data = yield this.client.get(this.getKey(key));
                if (data === null) {
                    logger_1.logger.debug(`[CACHE][REDIS] GET ${key} → MISS`);
                    return undefined;
                }
                logger_1.logger.debug(`[CACHE][REDIS] GET ${key} → HIT`);
                return JSON.parse(data);
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] GET ${key} → ERROR: ${error.message}`);
                return undefined;
            }
        });
    }
    /**
     * Set a value in Redis cache
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return false;
            try {
                const serialized = JSON.stringify(value);
                const prefixedKey = this.getKey(key);
                if (ttl && ttl > 0) {
                    yield this.client.setex(prefixedKey, ttl, serialized);
                }
                else {
                    yield this.client.set(prefixedKey, serialized);
                }
                logger_1.logger.debug(`[CACHE][REDIS] SET ${key} → OK | TTL: ${ttl !== null && ttl !== void 0 ? ttl : 'none'}s | Size: ${serialized.length} bytes`);
                return true;
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] SET ${key} → ERROR: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * Delete one or more keys from Redis cache
     */
    del(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return 0;
            try {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                const prefixedKeys = keyArray.map((k) => this.getKey(k));
                if (prefixedKeys.length === 0)
                    return 0;
                const deleted = yield this.client.del(...prefixedKeys);
                logger_1.logger.debug(`[CACHE][REDIS] DEL ${keyArray.join(', ')} → ${deleted} deleted`);
                return deleted;
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] DEL → ERROR: ${error.message}`);
                return 0;
            }
        });
    }
    /**
     * Check if a key exists in Redis cache
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return false;
            try {
                const exists = yield this.client.exists(this.getKey(key));
                logger_1.logger.debug(`[CACHE][REDIS] HAS ${key} → ${exists === 1 ? 'YES' : 'NO'}`);
                return exists === 1;
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] HAS ${key} → ERROR: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * Clear all cached data (only keys with our prefix)
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return;
            try {
                const pattern = this.prefix + '*';
                const keys = yield this.client.keys(pattern);
                if (keys.length > 0) {
                    yield this.client.del(...keys);
                    logger_1.logger.info(`[CACHE][REDIS] FLUSH → ${keys.length} keys deleted`);
                }
                else {
                    logger_1.logger.info('[CACHE][REDIS] FLUSH → No keys to delete');
                }
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] FLUSH → ERROR: ${error.message}`);
            }
        });
    }
    /**
     * Get all keys matching a pattern
     */
    getKeys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return [];
            try {
                const searchPattern = pattern
                    ? this.prefix + pattern
                    : this.prefix + '*';
                const keys = yield this.client.keys(searchPattern);
                // Remove prefix from keys before returning
                const cleanedKeys = keys.map((k) => k.replace(this.prefix, ''));
                logger_1.logger.debug(`[CACHE][REDIS] KEYS ${pattern !== null && pattern !== void 0 ? pattern : '*'} → ${cleanedKeys.length} keys`);
                return cleanedKeys;
            }
            catch (error) {
                logger_1.errorLogger.error(`[CACHE][REDIS] KEYS → ERROR: ${error.message}`);
                return [];
            }
        });
    }
    /**
     * Check if Redis is healthy
     */
    isHealthy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.client)
                return false;
            try {
                const result = yield this.client.ping();
                return result === 'PONG';
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Get TTL remaining for a key
     */
    getTtl(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return -2;
            try {
                return yield this.client.ttl(this.getKey(key));
            }
            catch (_a) {
                return -2;
            }
        });
    }
    /**
     * Update TTL for an existing key
     */
    touch(key, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.checkConnection())
                return false;
            try {
                const result = yield this.client.expire(this.getKey(key), ttl);
                return result === 1;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Increment a numeric value
     */
    incr(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, amount = 1) {
            if (!this.checkConnection())
                return null;
            try {
                if (amount === 1) {
                    return yield this.client.incr(this.getKey(key));
                }
                return yield this.client.incrby(this.getKey(key), amount);
            }
            catch (_a) {
                return null;
            }
        });
    }
    /**
     * Decrement a numeric value
     */
    decr(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, amount = 1) {
            if (!this.checkConnection())
                return null;
            try {
                if (amount === 1) {
                    return yield this.client.decr(this.getKey(key));
                }
                return yield this.client.decrby(this.getKey(key), amount);
            }
            catch (_a) {
                return null;
            }
        });
    }
    /**
     * Get the underlying Redis client for advanced operations
     */
    getClient() {
        return this.client;
    }
    /**
     * Check if connected to Redis
     */
    isConnectedToRedis() {
        return this.isConnected;
    }
    /**
     * Disconnect from Redis
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.quit();
                this.isConnected = false;
                logger_1.logger.info('[CACHE][REDIS] Disconnected');
            }
        });
    }
}
exports.RedisStrategy = RedisStrategy;
