"use strict";
/**
 * ThrottleManager - Event Throttling for SocketBuilder
 *
 * Manages throttling of socket events using NodeCache.
 * Prevents spam/flooding of events like typing indicators.
 *
 * @example
 * ```typescript
 * // Check if event should be throttled
 * const key = ThrottleManager.generateKey('TYPING_START', chatId, userId);
 * if (ThrottleManager.isThrottled(key)) {
 *   return; // Skip this emission
 * }
 * ThrottleManager.setThrottle(key, 5000); // 5 seconds
 * ```
 *
 * @module SocketBuilder/ThrottleManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleManager = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
// ==================== THROTTLE CACHE ====================
/**
 * In-memory cache for throttling
 * - stdTTL: Default TTL is set per-key
 * - checkperiod: Check for expired keys every 30 seconds
 * - useClones: Disable cloning for performance
 */
const throttleCache = new node_cache_1.default({
    stdTTL: 0, // We set TTL per-key
    checkperiod: 30,
    useClones: false,
});
// ==================== THROTTLE MANAGER CLASS ====================
class ThrottleManagerClass {
    // ==================== KEY GENERATION ====================
    /**
     * Generate a throttle key for an event
     *
     * @param event - Event name
     * @param identifiers - Additional identifiers (chatId, userId, etc.)
     * @returns Unique throttle key
     *
     * @example
     * ```typescript
     * const key = ThrottleManager.generateKey('TYPING_START', chatId, userId);
     * // Returns: "throttle:TYPING_START:abc123:user456"
     * ```
     */
    generateKey(event, ...identifiers) {
        const parts = ['throttle', event, ...identifiers.filter(Boolean)];
        return parts.join(':');
    }
    // ==================== THROTTLE CHECK ====================
    /**
     * Check if an event is currently throttled
     *
     * @param key - Throttle key
     * @returns true if throttled, false otherwise
     */
    isThrottled(key) {
        return throttleCache.has(key);
    }
    // ==================== SET THROTTLE ====================
    /**
     * Set a throttle for an event
     *
     * @param key - Throttle key
     * @param ttlMs - Time-to-live in milliseconds
     */
    setThrottle(key, ttlMs) {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        throttleCache.set(key, 1, ttlSeconds);
    }
    // ==================== CLEAR THROTTLE ====================
    /**
     * Clear a specific throttle
     *
     * @param key - Throttle key to clear
     */
    clearThrottle(key) {
        throttleCache.del(key);
    }
    /**
     * Clear all throttles matching a pattern
     *
     * @param pattern - Pattern to match (e.g., "throttle:TYPING_START:*")
     */
    clearPattern(pattern) {
        const keys = throttleCache.keys();
        const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        let cleared = 0;
        for (const key of keys) {
            if (patternRegex.test(key)) {
                throttleCache.del(key);
                cleared++;
            }
        }
        return cleared;
    }
    /**
     * Clear all throttles
     */
    clearAll() {
        throttleCache.flushAll();
    }
    // ==================== CHECK AND SET ====================
    /**
     * Check if throttled and set throttle if not
     *
     * @param key - Throttle key
     * @param ttlMs - Time-to-live in milliseconds
     * @returns true if was throttled (skipped), false if not throttled (processed)
     *
     * @example
     * ```typescript
     * const key = ThrottleManager.generateKey('TYPING_START', chatId, userId);
     * if (ThrottleManager.checkAndSet(key, 5000)) {
     *   // Was throttled, skip this emission
     *   return;
     * }
     * // Not throttled, proceed with emission
     * ```
     */
    checkAndSet(key, ttlMs) {
        if (this.isThrottled(key)) {
            return true; // Was throttled
        }
        this.setThrottle(key, ttlMs);
        return false; // Not throttled, now set
    }
    // ==================== STATS ====================
    /**
     * Get throttle cache statistics
     */
    getStats() {
        const stats = throttleCache.getStats();
        return {
            keys: throttleCache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
        };
    }
    /**
     * Get remaining TTL for a throttle key
     *
     * @param key - Throttle key
     * @returns Remaining TTL in milliseconds, or 0 if not throttled
     */
    getRemainingTTL(key) {
        const ttl = throttleCache.getTtl(key);
        if (!ttl)
            return 0;
        const remaining = ttl - Date.now();
        return remaining > 0 ? remaining : 0;
    }
}
// ==================== SINGLETON EXPORT ====================
/**
 * Singleton ThrottleManager instance
 */
exports.ThrottleManager = new ThrottleManagerClass();
exports.default = exports.ThrottleManager;
