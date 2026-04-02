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
exports.AnalyticsController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const ExportBuilder_1 = __importDefault(require("../../builder/ExportBuilder"));
const analytics_service_1 = require("./analytics.service");
const getCourseCompletion = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const period = req.query.period;
    const result = yield analytics_service_1.AnalyticsService.getCourseCompletion(period);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course completion rates retrieved successfully',
        data: result,
    });
}));
const getQuizPerformance = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.params;
    const period = req.query.period;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = yield analytics_service_1.AnalyticsService.getQuizPerformance(courseId, period, page, limit);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Quiz performance retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
const getCourseAnalytics = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield analytics_service_1.AnalyticsService.getCourseAnalytics(req.params.courseId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Course analytics retrieved successfully',
        data: result,
    });
}));
const getEngagementHeatmap = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const period = req.query.period || 'quarter';
    const result = yield analytics_service_1.AnalyticsService.getEngagementHeatmap(period);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Engagement heatmap retrieved successfully',
        data: result,
    });
}));
const columnMap = {
    courses: [
        { key: 'title', header: 'Course', width: 30 },
        { key: 'totalEnrollments', header: 'Enrolled', width: 12 },
        { key: 'completedEnrollments', header: 'Completed', width: 12 },
        { key: 'completionRate', header: 'Completion %', width: 14 },
    ],
    quizzes: [
        { key: 'title', header: 'Quiz', width: 30 },
        { key: 'avgScore', header: 'Avg Score', width: 12 },
        { key: 'totalAttempts', header: 'Total Attempts', width: 14 },
        { key: 'passRate', header: 'Pass Rate %', width: 12 },
    ],
    engagement: [
        { key: 'date', header: 'Date', width: 14 },
        { key: 'activeUsers', header: 'Active Users', width: 14 },
    ],
};
const exportAnalytics = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const type = req.query.type;
    const period = req.query.period;
    const course = req.query.course;
    const data = yield analytics_service_1.AnalyticsService.getExportData(type, period, course);
    const format = req.query.format === 'xlsx' ? 'excel' : 'csv';
    const filename = `analytics-${type}-${new Date().toISOString().slice(0, 10)}`;
    yield new ExportBuilder_1.default(data)
        .format(format)
        .columns(columnMap[type])
        .dateFormat('DD/MM/YYYY')
        .sendResponse(res, filename);
}));
exports.AnalyticsController = {
    getCourseCompletion,
    getQuizPerformance,
    getEngagementHeatmap,
    getCourseAnalytics,
    exportAnalytics,
};
