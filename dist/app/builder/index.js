"use strict";
/**
 * Builder Module Exports
 *
 * Central export for all builder utilities.
 *
 * @example
 * ```typescript
 * import {
 *   QueryBuilder,
 *   AggregationBuilder,
 *   PDFBuilder,
 *   ExportBuilder,
 *   EmailBuilder,
 *   JobBuilder,
 *   JobWorker,
 *   CacheBuilder,
 *   BuilderError,
 *   getBuilderConfig
 * } from '@/app/builder';
 * ```
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = exports.getCommonTemplate = exports.CommonTemplates = exports.ResponseTemplate = exports.TransformPipeline = exports.ResponseBuilderInstance = exports.ResponseBuilder = exports.ThrottleManager = exports.SocketBuilder = exports.MultiLayerStrategy = exports.RedisStrategy = exports.MemoryStrategy = exports.CacheInvalidator = exports.CacheBuilder = exports.registerBuiltInHandlers = exports.dispatchJob = exports.Job = exports.JobStorage = exports.JobScheduler = exports.JobWorker = exports.JobQueue = exports.JobBuilder = exports.SocketHelper = exports.RequestHelper = exports.AuthHelper = exports.BaseFactory = exports.TestNotificationFactory = exports.PaymentFactory = exports.MessageFactory = exports.ChatFactory = exports.UserFactory = exports.TestBuilder = exports.NotificationScheduler = exports.NotificationBuilder = exports.EmailBuilder = exports.ExportBuilder = exports.PDFBuilder = exports.getCacheConfig = exports.defaultBuilderConfig = exports.clearConfigCache = exports.setBuilderConfig = exports.getBuilderConfig = exports.getCurrentTraceId = exports.recordSpanEvent = exports.addSpanAttributes = exports.traceSync = exports.traceOperation = exports.BuilderError = exports.AggregationBuilder = exports.QueryBuilder = void 0;
exports.DEFAULT_EXCLUDES = exports.MONGODB_FIELDS = exports.SENSITIVE_FIELDS = void 0;
// Query Builders
var QueryBuilder_1 = require("./QueryBuilder");
Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return __importDefault(QueryBuilder_1).default; } });
var AggregationBuilder_1 = require("./AggregationBuilder");
Object.defineProperty(exports, "AggregationBuilder", { enumerable: true, get: function () { return __importDefault(AggregationBuilder_1).default; } });
// Builder Infrastructure
var BuilderError_1 = require("./BuilderError");
Object.defineProperty(exports, "BuilderError", { enumerable: true, get: function () { return BuilderError_1.BuilderError; } });
var builderTracing_1 = require("./builderTracing");
Object.defineProperty(exports, "traceOperation", { enumerable: true, get: function () { return builderTracing_1.traceOperation; } });
Object.defineProperty(exports, "traceSync", { enumerable: true, get: function () { return builderTracing_1.traceSync; } });
Object.defineProperty(exports, "addSpanAttributes", { enumerable: true, get: function () { return builderTracing_1.addSpanAttributes; } });
Object.defineProperty(exports, "recordSpanEvent", { enumerable: true, get: function () { return builderTracing_1.recordSpanEvent; } });
Object.defineProperty(exports, "getCurrentTraceId", { enumerable: true, get: function () { return builderTracing_1.getCurrentTraceId; } });
var builderConfig_1 = require("./builderConfig");
Object.defineProperty(exports, "getBuilderConfig", { enumerable: true, get: function () { return builderConfig_1.getBuilderConfig; } });
Object.defineProperty(exports, "setBuilderConfig", { enumerable: true, get: function () { return builderConfig_1.setBuilderConfig; } });
Object.defineProperty(exports, "clearConfigCache", { enumerable: true, get: function () { return builderConfig_1.clearConfigCache; } });
Object.defineProperty(exports, "defaultBuilderConfig", { enumerable: true, get: function () { return builderConfig_1.defaultBuilderConfig; } });
var builderConfig_2 = require("./builderConfig");
Object.defineProperty(exports, "getCacheConfig", { enumerable: true, get: function () { return builderConfig_2.getCacheConfig; } });
// Document Builders
var PDFBuilder_1 = require("./PDFBuilder");
Object.defineProperty(exports, "PDFBuilder", { enumerable: true, get: function () { return __importDefault(PDFBuilder_1).default; } });
var ExportBuilder_1 = require("./ExportBuilder");
Object.defineProperty(exports, "ExportBuilder", { enumerable: true, get: function () { return __importDefault(ExportBuilder_1).default; } });
// Communication Builders
var EmailBuilder_1 = require("./EmailBuilder");
Object.defineProperty(exports, "EmailBuilder", { enumerable: true, get: function () { return EmailBuilder_1.EmailBuilder; } });
var NotificationBuilder_1 = require("./NotificationBuilder");
Object.defineProperty(exports, "NotificationBuilder", { enumerable: true, get: function () { return NotificationBuilder_1.NotificationBuilder; } });
Object.defineProperty(exports, "NotificationScheduler", { enumerable: true, get: function () { return NotificationBuilder_1.NotificationScheduler; } });
// Testing Builder
var TestBuilder_1 = require("./TestBuilder");
Object.defineProperty(exports, "TestBuilder", { enumerable: true, get: function () { return TestBuilder_1.TestBuilder; } });
// TestBuilder - Factory exports (for direct use if needed)
var TestBuilder_2 = require("./TestBuilder");
Object.defineProperty(exports, "UserFactory", { enumerable: true, get: function () { return TestBuilder_2.UserFactory; } });
Object.defineProperty(exports, "ChatFactory", { enumerable: true, get: function () { return TestBuilder_2.ChatFactory; } });
Object.defineProperty(exports, "MessageFactory", { enumerable: true, get: function () { return TestBuilder_2.MessageFactory; } });
Object.defineProperty(exports, "PaymentFactory", { enumerable: true, get: function () { return TestBuilder_2.PaymentFactory; } });
Object.defineProperty(exports, "TestNotificationFactory", { enumerable: true, get: function () { return TestBuilder_2.NotificationFactory; } });
Object.defineProperty(exports, "BaseFactory", { enumerable: true, get: function () { return TestBuilder_2.BaseFactory; } });
// TestBuilder - Helper exports
var TestBuilder_3 = require("./TestBuilder");
Object.defineProperty(exports, "AuthHelper", { enumerable: true, get: function () { return TestBuilder_3.AuthHelper; } });
Object.defineProperty(exports, "RequestHelper", { enumerable: true, get: function () { return TestBuilder_3.RequestHelper; } });
Object.defineProperty(exports, "SocketHelper", { enumerable: true, get: function () { return TestBuilder_3.SocketHelper; } });
// Job Builder
var JobBuilder_1 = require("./JobBuilder");
Object.defineProperty(exports, "JobBuilder", { enumerable: true, get: function () { return JobBuilder_1.JobBuilder; } });
Object.defineProperty(exports, "JobQueue", { enumerable: true, get: function () { return JobBuilder_1.JobQueue; } });
Object.defineProperty(exports, "JobWorker", { enumerable: true, get: function () { return JobBuilder_1.JobWorker; } });
Object.defineProperty(exports, "JobScheduler", { enumerable: true, get: function () { return JobBuilder_1.JobScheduler; } });
Object.defineProperty(exports, "JobStorage", { enumerable: true, get: function () { return JobBuilder_1.JobStorage; } });
Object.defineProperty(exports, "Job", { enumerable: true, get: function () { return JobBuilder_1.Job; } });
Object.defineProperty(exports, "dispatchJob", { enumerable: true, get: function () { return JobBuilder_1.dispatchJob; } });
Object.defineProperty(exports, "registerBuiltInHandlers", { enumerable: true, get: function () { return JobBuilder_1.registerBuiltInHandlers; } });
// Cache Builder
var CacheBuilder_1 = require("./CacheBuilder");
Object.defineProperty(exports, "CacheBuilder", { enumerable: true, get: function () { return CacheBuilder_1.CacheBuilder; } });
var CacheBuilder_2 = require("./CacheBuilder");
Object.defineProperty(exports, "CacheInvalidator", { enumerable: true, get: function () { return CacheBuilder_2.CacheInvalidator; } });
// CacheBuilder - Strategy exports
var CacheBuilder_3 = require("./CacheBuilder");
Object.defineProperty(exports, "MemoryStrategy", { enumerable: true, get: function () { return CacheBuilder_3.MemoryStrategy; } });
Object.defineProperty(exports, "RedisStrategy", { enumerable: true, get: function () { return CacheBuilder_3.RedisStrategy; } });
Object.defineProperty(exports, "MultiLayerStrategy", { enumerable: true, get: function () { return CacheBuilder_3.MultiLayerStrategy; } });
// Socket Builder
var SocketBuilder_1 = require("./SocketBuilder");
Object.defineProperty(exports, "SocketBuilder", { enumerable: true, get: function () { return SocketBuilder_1.SocketBuilder; } });
Object.defineProperty(exports, "ThrottleManager", { enumerable: true, get: function () { return SocketBuilder_1.ThrottleManager; } });
// Response Builder
var ResponseBuilder_1 = require("./ResponseBuilder");
Object.defineProperty(exports, "ResponseBuilder", { enumerable: true, get: function () { return ResponseBuilder_1.ResponseBuilder; } });
Object.defineProperty(exports, "ResponseBuilderInstance", { enumerable: true, get: function () { return ResponseBuilder_1.ResponseBuilderInstance; } });
Object.defineProperty(exports, "TransformPipeline", { enumerable: true, get: function () { return ResponseBuilder_1.TransformPipeline; } });
Object.defineProperty(exports, "ResponseTemplate", { enumerable: true, get: function () { return ResponseBuilder_1.ResponseTemplate; } });
Object.defineProperty(exports, "CommonTemplates", { enumerable: true, get: function () { return ResponseBuilder_1.CommonTemplates; } });
Object.defineProperty(exports, "getCommonTemplate", { enumerable: true, get: function () { return ResponseBuilder_1.getCommonTemplate; } });
Object.defineProperty(exports, "createTemplate", { enumerable: true, get: function () { return ResponseBuilder_1.createTemplate; } });
Object.defineProperty(exports, "SENSITIVE_FIELDS", { enumerable: true, get: function () { return ResponseBuilder_1.SENSITIVE_FIELDS; } });
Object.defineProperty(exports, "MONGODB_FIELDS", { enumerable: true, get: function () { return ResponseBuilder_1.MONGODB_FIELDS; } });
Object.defineProperty(exports, "DEFAULT_EXCLUDES", { enumerable: true, get: function () { return ResponseBuilder_1.DEFAULT_EXCLUDES; } });
