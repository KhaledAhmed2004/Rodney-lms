"use strict";
/**
 * Scrape Routes
 * API routes for scraping operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const scrape_controller_1 = require("./scrape.controller");
const scrape_validation_1 = require("./scrape.validation");
const router = express_1.default.Router();
/**
 * POST /api/v1/scrape
 * Execute general scrape
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.createScrapeRequestSchema), scrape_controller_1.ScrapeController.executeScrape);
/**
 * POST /api/v1/scrape/product
 * Scrape product page (Amazon-optimized)
 */
router.post('/product', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.createProductScrapeSchema), scrape_controller_1.ScrapeController.scrapeProduct);
/**
 * GET /api/v1/scrape/history
 * Get user's scrape history
 */
router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.getScrapeHistorySchema), scrape_controller_1.ScrapeController.getScrapeHistory);
/**
 * GET /api/v1/scrape/stats
 * Get scrape statistics
 */
router.get('/stats', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), scrape_controller_1.ScrapeController.getScrapeStats);
/**
 * GET /api/v1/scrape/:id
 * Get specific scrape result
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.getScrapeByIdSchema), scrape_controller_1.ScrapeController.getScrapeById);
/**
 * DELETE /api/v1/scrape/:id
 * Delete scrape result
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.deleteScrapeSchema), scrape_controller_1.ScrapeController.deleteScrape);
exports.ScrapeRoutes = router;
