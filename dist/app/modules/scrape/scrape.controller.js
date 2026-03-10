"use strict";
/**
 * Scrape Controller
 * HTTP request handlers for scraping operations
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
exports.ScrapeController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const scrape_service_1 = require("./scrape.service");
/**
 * Execute general scrape
 * POST /api/v1/scrape
 */
const executeScrape = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield scrape_service_1.ScrapeService.executeScrape(user, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: result.status === 'success'
            ? 'Scrape completed successfully'
            : result.status === 'partial'
                ? 'Scrape completed with some errors'
                : 'Scrape failed',
        data: result,
    });
}));
/**
 * Scrape product page
 * POST /api/v1/scrape/product
 */
const scrapeProduct = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield scrape_service_1.ScrapeService.scrapeProduct(user, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Product scraped successfully',
        data: result,
    });
}));
/**
 * Get user's scrape history
 * GET /api/v1/scrape/history
 */
const getScrapeHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield scrape_service_1.ScrapeService.getScrapeHistory(user, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Scrape history retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    });
}));
/**
 * Get scrape by ID
 * GET /api/v1/scrape/:id
 */
const getScrapeById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield scrape_service_1.ScrapeService.getScrapeById(user, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Scrape result retrieved successfully',
        data: result,
    });
}));
/**
 * Delete scrape by ID
 * DELETE /api/v1/scrape/:id
 */
const deleteScrape = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    yield scrape_service_1.ScrapeService.deleteScrape(user, req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Scrape result deleted successfully',
    });
}));
/**
 * Get scrape statistics
 * GET /api/v1/scrape/stats
 */
const getScrapeStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield scrape_service_1.ScrapeService.getScrapeStats(user);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Scrape statistics retrieved successfully',
        data: result,
    });
}));
exports.ScrapeController = {
    executeScrape,
    scrapeProduct,
    getScrapeHistory,
    getScrapeById,
    deleteScrape,
    getScrapeStats,
};
