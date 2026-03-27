"use strict";
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
exports.DashboardController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const dashboard_service_1 = require("./dashboard.service");
const VALID_ACTIVITY_TYPES = ['ENROLLMENT', 'COMPLETION', 'QUIZ_ATTEMPT'];
const getSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield dashboard_service_1.DashboardService.getSummary();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Dashboard summary retrieved successfully',
        data: result,
    });
}));
const getTrends = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const months = req.query.months
        ? parseInt(req.query.months, 10)
        : 6;
    if (isNaN(months) || months < 1 || months > 24) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'months must be a number between 1 and 24');
    }
    const result = yield dashboard_service_1.DashboardService.getTrends(months);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trends retrieved successfully',
        data: result,
    });
}));
const getRecentActivity = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = req.query.limit
        ? parseInt(req.query.limit, 10)
        : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'limit must be a number between 1 and 100');
    }
    const type = req.query.type;
    if (type && !VALID_ACTIVITY_TYPES.includes(type)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
    }
    const result = yield dashboard_service_1.DashboardService.getRecentActivity(limit, type);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Recent activity retrieved successfully',
        data: result,
    });
}));
exports.DashboardController = { getSummary, getTrends, getRecentActivity };
