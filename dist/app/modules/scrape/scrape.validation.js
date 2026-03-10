"use strict";
/**
 * Scrape Validation Schemas
 * Zod schemas for API request validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapeValidation = exports.deleteScrapeSchema = exports.getScrapeByIdSchema = exports.getScrapeHistorySchema = exports.createProductScrapeSchema = exports.createScrapeRequestSchema = void 0;
const zod_1 = require("zod");
// URL validation
const urlSchema = zod_1.z
    .string({ required_error: 'URL is required' })
    .url('Invalid URL format')
    .refine(url => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
});
// Engine validation
const engineSchema = zod_1.z.enum(['cheerio', 'puppeteer', 'auto']).optional();
// Mode validation - controls speed vs safety trade-off
// quick: 5-8s (medium risk), balanced: 8-12s (low risk), safe: 15-25s (very low risk)
const modeSchema = zod_1.z.enum(['quick', 'balanced', 'safe']).optional();
// Extractor types validation
const extractorSchema = zod_1.z
    .array(zod_1.z.enum([
    'text',
    'images',
    'links',
    'tables',
    'prices',
    'product',
    'metadata',
    'custom',
]))
    .optional();
// Selectors validation
const selectorsSchema = zod_1.z
    .object({
    container: zod_1.z.string().max(200).optional(),
    title: zod_1.z.string().max(200).optional(),
    price: zod_1.z.string().max(200).optional(),
    originalPrice: zod_1.z.string().max(200).optional(),
    images: zod_1.z.string().max(200).optional(),
    description: zod_1.z.string().max(200).optional(),
    rating: zod_1.z.string().max(200).optional(),
    reviewCount: zod_1.z.string().max(200).optional(),
    availability: zod_1.z.string().max(200).optional(),
    features: zod_1.z.string().max(200).optional(),
    custom: zod_1.z.record(zod_1.z.string().max(200)).optional(),
})
    .optional();
// Browser options validation
const browserOptionsSchema = zod_1.z
    .object({
    headless: zod_1.z.boolean().optional(),
    waitFor: zod_1.z.union([zod_1.z.string().max(200), zod_1.z.number().min(0).max(60000)]).optional(),
    scrollToBottom: zod_1.z.boolean().optional(),
    timeout: zod_1.z.number().min(1000).max(120000).optional(),
})
    .optional();
// Protection options validation
const protectionOptionsSchema = zod_1.z
    .object({
    rotateUserAgent: zod_1.z.boolean().optional(),
    randomDelay: zod_1.z.boolean().optional(),
    minDelay: zod_1.z.number().min(0).max(10000).optional(),
    maxDelay: zod_1.z.number().min(0).max(30000).optional(),
    maxRetries: zod_1.z.number().min(0).max(10).optional(),
})
    .optional();
// ==================== Main Schemas ====================
/**
 * General scrape request validation
 */
exports.createScrapeRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        url: urlSchema,
        engine: engineSchema,
        mode: modeSchema, // 🆕 Optional: 'quick' | 'balanced' | 'safe' (default: balanced)
        extractors: extractorSchema,
        selectors: selectorsSchema,
        browser: browserOptionsSchema,
        protection: protectionOptionsSchema,
        saveToDb: zod_1.z.boolean().optional(),
        tags: zod_1.z.array(zod_1.z.string().max(50)).max(10).optional(),
    }),
});
/**
 * Product scrape request validation
 */
exports.createProductScrapeSchema = zod_1.z.object({
    body: zod_1.z.object({
        url: urlSchema,
        mode: modeSchema, // 🆕 Optional: 'quick' | 'balanced' | 'safe' (default: balanced)
        selectors: zod_1.z
            .object({
            title: zod_1.z.string().max(200).optional(),
            price: zod_1.z.string().max(200).optional(),
            images: zod_1.z.string().max(200).optional(),
            description: zod_1.z.string().max(200).optional(),
            rating: zod_1.z.string().max(200).optional(),
            reviewCount: zod_1.z.string().max(200).optional(),
            availability: zod_1.z.string().max(200).optional(),
            features: zod_1.z.string().max(200).optional(),
        })
            .optional(),
        browser: zod_1.z
            .object({
            waitFor: zod_1.z.union([zod_1.z.string().max(200), zod_1.z.number().min(0).max(60000)]).optional(),
            scrollToBottom: zod_1.z.boolean().optional(),
        })
            .optional(),
    }),
});
/**
 * Get scrape history query validation
 */
exports.getScrapeHistorySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .string()
            .regex(/^\d+$/, 'Page must be a number')
            .transform(Number)
            .optional(),
        limit: zod_1.z
            .string()
            .regex(/^\d+$/, 'Limit must be a number')
            .transform(Number)
            .optional(),
        status: zod_1.z.enum(['success', 'partial', 'failed']).optional(),
        url: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
/**
 * Get scrape by ID validation
 */
exports.getScrapeByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({ required_error: 'Scrape ID is required' })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Scrape ID format'),
    }),
});
/**
 * Delete scrape validation
 */
exports.deleteScrapeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({ required_error: 'Scrape ID is required' })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Scrape ID format'),
    }),
});
// Export all validations
exports.ScrapeValidation = {
    createScrapeRequestSchema: exports.createScrapeRequestSchema,
    createProductScrapeSchema: exports.createProductScrapeSchema,
    getScrapeHistorySchema: exports.getScrapeHistorySchema,
    getScrapeByIdSchema: exports.getScrapeByIdSchema,
    deleteScrapeSchema: exports.deleteScrapeSchema,
};
