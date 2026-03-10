"use strict";
/**
 * Scrape Service
 * Business logic for scraping operations
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
exports.ScrapeService = void 0;
const mongoose_1 = require("mongoose");
const scrapeHelper_1 = require("../../../helpers/scrapeHelper");
const scrape_model_1 = require("./scrape.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const logger_1 = require("../../../shared/logger");
/**
 * Execute scrape request
 * URL scrape করে result return করে
 */
const executeScrape = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logger_1.logger.info(`[ScrapeService] User ${user.id} scraping: ${payload.url}`);
    // Build scrape options
    const options = {
        url: payload.url,
        engine: payload.engine,
        extractors: payload.extractors,
        selectors: payload.selectors,
        browser: payload.browser,
        protection: payload.protection,
        userId: user.id,
        saveToDb: (_a = payload.saveToDb) !== null && _a !== void 0 ? _a : true,
    };
    // Execute scrape
    const result = yield scrapeHelper_1.scrapeHelper.scrape(options);
    // Save to database if requested
    if (options.saveToDb !== false) {
        const savedResult = yield scrape_model_1.ScrapeResult.create({
            url: result.url,
            status: result.status,
            engine: result.engine,
            data: result.data,
            timing: result.timing,
            protection: result.protection,
            errors: result.errors,
            userId: new mongoose_1.Types.ObjectId(user.id),
            tags: payload.tags,
        });
        logger_1.logger.info(`[ScrapeService] Result saved: ${savedResult._id}`);
        return Object.assign(Object.assign({}, result), { _id: savedResult._id.toString(), savedToDb: true });
    }
    return Object.assign(Object.assign({}, result), { savedToDb: false });
});
/**
 * Scrape product page
 * Product page থেকে product data extract করে
 */
const scrapeProduct = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    logger_1.logger.info(`[ScrapeService] User ${user.id} scraping product: ${payload.url}`);
    const startTime = Date.now();
    // Build options for product scraping
    // Don't set default waitFor here - let pipeline's site-specific options handle it
    // (e.g., AliExpress gets 5000ms, Amazon gets different timing, etc.)
    const options = {
        url: payload.url,
        extractors: ['product'],
        selectors: payload.selectors,
        browser: payload.browser, // Pass through user's options, pipeline will add defaults
        userId: user.id,
    };
    // Execute scrape
    const result = yield scrapeHelper_1.scrapeHelper.scrape(options);
    if (result.status === 'failed') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, ((_b = (_a = result.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) || 'Product scrape failed');
    }
    if (!result.data.product) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Could not extract product data from this page');
    }
    // Save to database
    yield scrape_model_1.ScrapeResult.create({
        url: result.url,
        status: result.status,
        engine: result.engine,
        data: result.data,
        timing: result.timing,
        protection: result.protection,
        errors: result.errors,
        userId: new mongoose_1.Types.ObjectId(user.id),
    });
    return {
        success: true,
        product: result.data.product,
        timing: {
            totalMs: Date.now() - startTime,
        },
    };
});
/**
 * Get user's scrape history
 * User এর scrape history pagination সহ
 */
const getScrapeHistory = (user, query) => __awaiter(void 0, void 0, void 0, function* () {
    const scrapeQuery = new QueryBuilder_1.default(scrape_model_1.ScrapeResult.find({ userId: new mongoose_1.Types.ObjectId(user.id) }), query)
        .search(['url', 'data.text.title', 'data.product.title'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const results = yield scrapeQuery.modelQuery;
    const paginationInfo = yield scrapeQuery.getPaginationInfo();
    return {
        data: results,
        pagination: paginationInfo,
    };
});
/**
 * Get single scrape result by ID
 */
const getScrapeById = (user, scrapeId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield scrape_model_1.ScrapeResult.findOne({
        _id: new mongoose_1.Types.ObjectId(scrapeId),
        userId: new mongoose_1.Types.ObjectId(user.id),
    });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Scrape result not found');
    }
    return result;
});
/**
 * Delete scrape result
 */
const deleteScrape = (user, scrapeId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield scrape_model_1.ScrapeResult.findOneAndDelete({
        _id: new mongoose_1.Types.ObjectId(scrapeId),
        userId: new mongoose_1.Types.ObjectId(user.id),
    });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Scrape result not found');
    }
    logger_1.logger.info(`[ScrapeService] Deleted scrape: ${scrapeId}`);
});
/**
 * Delete scrapes by tag
 */
const deleteScrapesByTag = (user, tag) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield scrape_model_1.ScrapeResult.deleteMany({
        userId: new mongoose_1.Types.ObjectId(user.id),
        tags: tag,
    });
    logger_1.logger.info(`[ScrapeService] Deleted ${result.deletedCount} scrapes with tag: ${tag}`);
    return result.deletedCount;
});
/**
 * Get scrape statistics for user
 */
const getScrapeStats = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const stats = yield scrape_model_1.ScrapeResult.aggregate([
        {
            $match: { userId: new mongoose_1.Types.ObjectId(user.id) },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);
    const totalScrapes = yield scrape_model_1.ScrapeResult.countDocuments({
        userId: new mongoose_1.Types.ObjectId(user.id),
    });
    const statusCounts = {
        success: 0,
        partial: 0,
        failed: 0,
    };
    for (const stat of stats) {
        statusCounts[stat._id] = stat.count;
    }
    return Object.assign({ total: totalScrapes }, statusCounts);
});
exports.ScrapeService = {
    executeScrape,
    scrapeProduct,
    getScrapeHistory,
    getScrapeById,
    deleteScrape,
    deleteScrapesByTag,
    getScrapeStats,
};
