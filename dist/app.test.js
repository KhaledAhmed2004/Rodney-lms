"use strict";
/**
 * Test Application
 *
 * A lightweight version of the app for testing.
 * Skips complex logging/tracing systems that cause issues with vitest.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const globalErrorHandler_1 = __importDefault(require("./app/middlewares/globalErrorHandler"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// CORS - allow all in test
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
// Webhook routes need raw body for signature verification
app.use('/api/v1/payments/webhook', express_1.default.raw({ type: 'application/json' }));
// JSON parser for other routes (skip webhooks)
app.use((req, res, next) => {
    if (req.path.includes('/webhook')) {
        return next();
    }
    express_1.default.json()(req, res, next);
});
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Static files
app.use('/public', express_1.default.static('public'));
// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', environment: 'test' });
});
// API routes
app.use('/api/v1', routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Not Found',
    });
});
// Global error handler
app.use(globalErrorHandler_1.default);
exports.default = app;
