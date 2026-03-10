"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_CONFIG = exports.MultiLayerStrategy = exports.RedisStrategy = exports.MemoryStrategy = exports.CacheInvalidator = exports.default = exports.CacheBuilder = void 0;
// Main exports
var CacheBuilder_1 = require("./CacheBuilder");
Object.defineProperty(exports, "CacheBuilder", { enumerable: true, get: function () { return CacheBuilder_1.CacheBuilder; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(CacheBuilder_1).default; } });
var CacheInvalidator_1 = require("./CacheInvalidator");
Object.defineProperty(exports, "CacheInvalidator", { enumerable: true, get: function () { return CacheInvalidator_1.CacheInvalidator; } });
// Strategy exports
var strategies_1 = require("./strategies");
Object.defineProperty(exports, "MemoryStrategy", { enumerable: true, get: function () { return strategies_1.MemoryStrategy; } });
Object.defineProperty(exports, "RedisStrategy", { enumerable: true, get: function () { return strategies_1.RedisStrategy; } });
Object.defineProperty(exports, "MultiLayerStrategy", { enumerable: true, get: function () { return strategies_1.MultiLayerStrategy; } });
// Type exports
var types_1 = require("./types");
Object.defineProperty(exports, "DEFAULT_CACHE_CONFIG", { enumerable: true, get: function () { return types_1.DEFAULT_CACHE_CONFIG; } });
