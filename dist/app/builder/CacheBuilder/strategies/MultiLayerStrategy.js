"use strict";
/**
 * MultiLayerStrategy - L1 (Memory) + L2 (Redis) Combined Caching
 *
 * এটি default caching strategy যা দুটি layer ব্যবহার করে:
 * - L1: Memory (NodeCache) - Ultra fast, per-instance
 * - L2: Redis - Shared across instances, persistent
 *
 * Flow:
 * READ:  L1 (Memory) → Miss → L2 (Redis) → Miss → Database
 * WRITE: Database → L2 (Redis) → L1 (Memory)
 * INVALIDATE: L1 + L2 simultaneously
 *
 * বৈশিষ্ট্য:
 * - ⚡ Ultra-fast reads from L1 (memory)
 * - 🌐 Shared data via L2 (Redis)
 * - 🔄 Automatic L1 promotion (Redis hit → Memory cache)
 * - 💪 Graceful degradation (Redis down → Memory only)
 *
 * @example
 * ```typescript
 * const multi = new MultiLayerStrategy();
 * await multi.set('user:123', userData, 300); // 5 min
 * const user = await multi.get<User>('user:123');
 * // First: checks memory, then Redis
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
exports.MultiLayerStrategy = void 0;
const MemoryStrategy_1 = require("./MemoryStrategy");
const RedisStrategy_1 = require("./RedisStrategy");
const logger_1 = require("../../../../shared/logger");
class MultiLayerStrategy {
    constructor(options = {}) {
        var _a, _b, _c;
        this.name = 'multi-layer';
        this.l1TtlRatio = (_a = options.l1TtlRatio) !== null && _a !== void 0 ? _a : 0.2;
        this.minL1Ttl = (_b = options.minL1Ttl) !== null && _b !== void 0 ? _b : 30;
        this.defaultL1Ttl = (_c = options.defaultL1Ttl) !== null && _c !== void 0 ? _c : 60;
        // Initialize L1 (Memory)
        this.l1 = new MemoryStrategy_1.MemoryStrategy(Object.assign({ ttl: this.defaultL1Ttl, checkperiod: 60 }, options.memory));
        // Initialize L2 (Redis)
        this.l2 = new RedisStrategy_1.RedisStrategy(options.redis);
        logger_1.logger.info(`[CACHE][MULTI] ✅ Initialized | L1 Ratio: ${this.l1TtlRatio * 100}% | Min L1 TTL: ${this.minL1Ttl}s`);
    }
    /**
     * Calculate L1 TTL from L2 TTL
     */
    calculateL1Ttl(l2Ttl) {
        if (!l2Ttl)
            return this.defaultL1Ttl;
        return Math.max(Math.floor(l2Ttl * this.l1TtlRatio), this.minL1Ttl);
    }
    /**
     * Get a value - checks L1 first, then L2
     * L2 hit → promotes to L1 for faster subsequent access
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Step 1: Try L1 (Memory) - Ultra fast
            const l1Data = yield this.l1.get(key);
            if (l1Data !== undefined) {
                logger_1.logger.debug(`[CACHE][MULTI] GET ${key} → L1 HIT`);
                return l1Data;
            }
            // Step 2: Try L2 (Redis) - Shared cache
            const l2Data = yield this.l2.get(key);
            if (l2Data !== undefined) {
                logger_1.logger.debug(`[CACHE][MULTI] GET ${key} → L2 HIT (promoting to L1)`);
                // Promote to L1 for faster subsequent access
                // Use default L1 TTL since we don't know original TTL
                yield this.l1.set(key, l2Data, this.defaultL1Ttl);
                return l2Data;
            }
            // Both miss
            logger_1.logger.debug(`[CACHE][MULTI] GET ${key} → MISS (L1 + L2)`);
            return undefined;
        });
    }
    /**
     * Set a value in both L1 and L2
     * L1 gets shorter TTL (20% of L2 by default)
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const l1Ttl = this.calculateL1Ttl(ttl);
            // Write to both layers in parallel
            const [l1Ok, l2Ok] = yield Promise.all([
                this.l1.set(key, value, l1Ttl),
                this.l2.set(key, value, ttl),
            ]);
            const success = l1Ok || l2Ok; // Success if either works
            logger_1.logger.debug(`[CACHE][MULTI] SET ${key} → L1: ${l1Ok ? 'OK' : 'FAIL'} (${l1Ttl}s), L2: ${l2Ok ? 'OK' : 'FAIL'} (${ttl !== null && ttl !== void 0 ? ttl : 'default'}s)`);
            return success;
        });
    }
    /**
     * Delete from both L1 and L2
     */
    del(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete from both layers in parallel
            const [l1Count, l2Count] = yield Promise.all([
                this.l1.del(keys),
                this.l2.del(keys),
            ]);
            const totalDeleted = Math.max(l1Count, l2Count);
            const keyArray = Array.isArray(keys) ? keys : [keys];
            logger_1.logger.debug(`[CACHE][MULTI] DEL ${keyArray.join(', ')} → L1: ${l1Count}, L2: ${l2Count}`);
            return totalDeleted;
        });
    }
    /**
     * Check if key exists in either L1 or L2
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check L1 first (faster)
            const l1Has = yield this.l1.has(key);
            if (l1Has)
                return true;
            // Then check L2
            return yield this.l2.has(key);
        });
    }
    /**
     * Flush both L1 and L2
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([this.l1.flush(), this.l2.flush()]);
            logger_1.logger.info('[CACHE][MULTI] FLUSH → Both layers cleared');
        });
    }
    /**
     * Get keys from both layers (deduplicated)
     */
    getKeys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const [l1Keys, l2Keys] = yield Promise.all([
                this.l1.getKeys(pattern),
                this.l2.getKeys(pattern),
            ]);
            // Combine and deduplicate
            const allKeys = Array.from(new Set([...l1Keys, ...l2Keys]));
            logger_1.logger.debug(`[CACHE][MULTI] KEYS ${pattern !== null && pattern !== void 0 ? pattern : '*'} → L1: ${l1Keys.length}, L2: ${l2Keys.length}, Total: ${allKeys.length}`);
            return allKeys;
        });
    }
    /**
     * Check health - L1 must be healthy, L2 is optional
     */
    isHealthy() {
        return __awaiter(this, void 0, void 0, function* () {
            const l1Healthy = yield this.l1.isHealthy();
            // L2 being down is acceptable (graceful degradation)
            return l1Healthy;
        });
    }
    /**
     * Get detailed health status
     */
    getHealthStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const [l1Healthy, l2Healthy] = yield Promise.all([
                this.l1.isHealthy(),
                this.l2.isHealthy(),
            ]);
            return {
                healthy: l1Healthy, // Overall health based on L1
                l1: { healthy: l1Healthy, name: 'memory' },
                l2: { healthy: l2Healthy, name: 'redis' },
            };
        });
    }
    /**
     * Get statistics from both layers
     */
    getStats() {
        return {
            l1: this.l1.getStats(),
            l2: { connected: this.l2.isConnectedToRedis() },
        };
    }
    /**
     * Get L1 (Memory) strategy directly
     */
    getL1() {
        return this.l1;
    }
    /**
     * Get L2 (Redis) strategy directly
     */
    getL2() {
        return this.l2;
    }
    /**
     * Sync L1 from L2 (useful for cache warming)
     */
    warmL1(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            let warmed = 0;
            for (const key of keys) {
                const data = yield this.l2.get(key);
                if (data !== undefined) {
                    yield this.l1.set(key, data, this.defaultL1Ttl);
                    warmed++;
                }
            }
            logger_1.logger.info(`[CACHE][MULTI] Warmed ${warmed}/${keys.length} keys from L2 to L1`);
            return warmed;
        });
    }
    /**
     * Invalidate only L1 (useful when you know L2 is source of truth)
     */
    invalidateL1(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.l1.del(keys);
        });
    }
    /**
     * Invalidate only L2 (useful for distributed invalidation)
     */
    invalidateL2(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.l2.del(keys);
        });
    }
}
exports.MultiLayerStrategy = MultiLayerStrategy;
