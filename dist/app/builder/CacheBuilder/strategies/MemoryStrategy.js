"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStrategy = void 0;
const NodeCache = require("node-cache");
const logger_1 = require("../../../../shared/logger");
class MemoryStrategy {
    constructor(options = {}) {
        var _a, _b, _c, _d;
        this.name = 'memory';
        this.options = {
            ttl: (_a = options.ttl) !== null && _a !== void 0 ? _a : 300,
            checkperiod: (_b = options.checkperiod) !== null && _b !== void 0 ? _b : 60,
            useClones: (_c = options.useClones) !== null && _c !== void 0 ? _c : false,
            maxKeys: options.maxKeys,
        };
        this.cache = new NodeCache({
            stdTTL: this.options.ttl,
            checkperiod: this.options.checkperiod,
            useClones: this.options.useClones,
            maxKeys: (_d = this.options.maxKeys) !== null && _d !== void 0 ? _d : -1,
        });
        // Log cache events in debug mode
        this.cache.on('expired', (key) => {
            logger_1.logger.debug(`[CACHE][MEMORY] Key expired: ${key}`);
        });
        this.cache.on('flush', () => {
            logger_1.logger.debug('[CACHE][MEMORY] Cache flushed');
        });
        logger_1.logger.info(`[CACHE][MEMORY] ✅ Initialized | TTL: ${this.options.ttl}s | Check: ${this.options.checkperiod}s`);
    }
    /**
     * Get a value from memory cache
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const value = this.cache.get(key);
                if (value !== undefined) {
                    logger_1.logger.debug(`[CACHE][MEMORY] GET ${key} → HIT`);
                }
                else {
                    logger_1.logger.debug(`[CACHE][MEMORY] GET ${key} → MISS`);
                }
                return value;
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] GET ${key} → ERROR: ${error.message}`);
                return undefined;
            }
        });
    }
    /**
     * Set a value in memory cache
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check max keys limit
                if (this.options.maxKeys && this.cache.keys().length >= this.options.maxKeys) {
                    // Remove oldest key (simple LRU approximation)
                    const keys = this.cache.keys();
                    if (keys.length > 0) {
                        this.cache.del(keys[0]);
                    }
                }
                const success = this.cache.set(key, value, ttl !== null && ttl !== void 0 ? ttl : this.options.ttl);
                logger_1.logger.debug(`[CACHE][MEMORY] SET ${key} → ${success ? 'OK' : 'FAIL'} | TTL: ${ttl !== null && ttl !== void 0 ? ttl : this.options.ttl}s`);
                return success;
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] SET ${key} → ERROR: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * Delete one or more keys from memory cache
     */
    del(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                const deleted = this.cache.del(keyArray);
                logger_1.logger.debug(`[CACHE][MEMORY] DEL ${keyArray.join(', ')} → ${deleted} deleted`);
                return deleted;
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] DEL → ERROR: ${error.message}`);
                return 0;
            }
        });
    }
    /**
     * Check if a key exists in memory cache
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exists = this.cache.has(key);
                logger_1.logger.debug(`[CACHE][MEMORY] HAS ${key} → ${exists ? 'YES' : 'NO'}`);
                return exists;
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] HAS ${key} → ERROR: ${error.message}`);
                return false;
            }
        });
    }
    /**
     * Clear all cached data
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.cache.flushAll();
                logger_1.logger.info('[CACHE][MEMORY] FLUSH → All keys deleted');
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] FLUSH → ERROR: ${error.message}`);
            }
        });
    }
    /**
     * Get all keys matching a pattern
     */
    getKeys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
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
                logger_1.logger.debug(`[CACHE][MEMORY] KEYS ${pattern !== null && pattern !== void 0 ? pattern : '*'} → ${matchedKeys.length} keys`);
                return matchedKeys;
            }
            catch (error) {
                logger_1.logger.warn(`[CACHE][MEMORY] KEYS → ERROR: ${error.message}`);
                return [];
            }
        });
    }
    /**
     * Memory cache is always available
     */
    isHealthy() {
        return __awaiter(this, void 0, void 0, function* () {
            return true;
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return this.cache.getStats();
    }
    /**
     * Get TTL remaining for a key
     */
    getTtl(key) {
        return this.cache.getTtl(key);
    }
    /**
     * Update TTL for an existing key
     */
    touch(key, ttl) {
        return this.cache.ttl(key, ttl);
    }
}
exports.MemoryStrategy = MemoryStrategy;
