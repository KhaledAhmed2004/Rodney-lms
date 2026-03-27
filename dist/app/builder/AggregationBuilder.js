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
exports.calculateGrowthDynamic = void 0;
const requestContext_1 = require("../logging/requestContext");
const http_status_1 = __importDefault(require("http-status"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const builderTracing_1 = require("./builderTracing");
const builderConfig_1 = require("./builderConfig");
class AggregationBuilder {
    constructor(model) {
        this.pipeline = [];
        this.model = model;
    }
    // ====== PIPELINE BUILDERS ======
    match(conditions) {
        this.pipeline.push({ $match: conditions });
        return this;
    }
    group(groupSpec) {
        this.pipeline.push({ $group: groupSpec });
        return this;
    }
    project(projectSpec) {
        this.pipeline.push({ $project: projectSpec });
        return this;
    }
    sort(sortSpec) {
        this.pipeline.push({ $sort: sortSpec });
        return this;
    }
    limit(limitValue) {
        this.pipeline.push({ $limit: limitValue });
        return this;
    }
    reset() {
        this.pipeline = [];
        return this;
    }
    getPipeline() {
        return this.pipeline;
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, builderTracing_1.traceOperation)('AggregationBuilder', 'execute', () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const config = (0, builderConfig_1.getBuilderConfig)().aggregation;
                const modelName = ((_a = this.model) === null || _a === void 0 ? void 0 : _a.modelName) || ((_c = (_b = this.model) === null || _b === void 0 ? void 0 : _b.collection) === null || _c === void 0 ? void 0 : _c.name);
                (0, builderTracing_1.addSpanAttributes)({
                    'aggregation.model': modelName,
                    'aggregation.pipelineStages': this.pipeline.length,
                });
                const _start = Date.now();
                const res = yield this.model.aggregate(this.pipeline);
                const dur = Date.now() - _start;
                const pipelineSummary = summarizePipeline(this.pipeline);
                if (config.recordMetrics) {
                    (0, requestContext_1.recordDbQuery)(dur, { model: modelName, operation: 'aggregate', cacheHit: false, pipeline: pipelineSummary });
                }
                (0, builderTracing_1.addSpanAttributes)({
                    'aggregation.duration': dur,
                    'aggregation.resultCount': res.length,
                });
                (0, builderTracing_1.recordSpanEvent)('aggregation_complete', { resultCount: res.length });
                return res;
            }));
        });
    }
    // ====== PERIOD CALCULATOR ======
    getPeriodDates(period) {
        const now = new Date();
        let startThis, startLast, endLast;
        switch (period) {
            case 'day':
                startThis = new Date(now);
                startThis.setHours(0, 0, 0, 0);
                startLast = new Date(startThis);
                startLast.setDate(startThis.getDate() - 1);
                endLast = new Date(startThis);
                endLast.setDate(startThis.getDate() - 1);
                endLast.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay(); // Sunday = 0
                startThis = new Date(now);
                startThis.setDate(now.getDate() - day);
                startThis.setHours(0, 0, 0, 0);
                startLast = new Date(startThis);
                startLast.setDate(startThis.getDate() - 7);
                endLast = new Date(startThis);
                endLast.setDate(startThis.getDate() - 1);
                endLast.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startThis = new Date(now.getFullYear(), now.getMonth(), 1);
                startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endLast = new Date(now.getFullYear(), now.getMonth(), 0);
                endLast.setHours(23, 59, 59, 999);
                break;
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startThis = new Date(now.getFullYear(), currentQuarter * 3, 1);
                const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
                const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
                startLast = new Date(lastQuarterYear, lastQuarter * 3, 1);
                endLast = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0);
                endLast.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startThis = new Date(now.getFullYear(), 0, 1);
                startLast = new Date(now.getFullYear() - 1, 0, 1);
                endLast = new Date(now.getFullYear() - 1, 11, 31);
                endLast.setHours(23, 59, 59, 999);
                break;
            default:
                throw new Error('Unsupported period');
        }
        return { startThis, startLast, endLast };
    }
    // ====== GENERIC GROWTH CALCULATION ======
    calculateGrowth() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            var _a, _b, _c;
            try {
                const { sumField, filter = {}, groupBy, period = 'month' } = options;
                const { startThis, startLast, endLast } = this.getPeriodDates(period);
                const buildPipeline = (dateFilter) => {
                    const pipeline = [];
                    const matchConditions = Object.assign({}, filter);
                    if (dateFilter)
                        matchConditions.createdAt = dateFilter;
                    pipeline.push({ $match: matchConditions });
                    const groupSpec = {
                        _id: groupBy ? `$${groupBy}` : null,
                    };
                    groupSpec.total = sumField ? { $sum: `$${sumField}` } : { $sum: 1 };
                    pipeline.push({ $group: groupSpec });
                    if (groupBy) {
                        pipeline.push({ $group: { _id: null, total: { $sum: '$total' } } });
                    }
                    return pipeline;
                };
                const [thisPeriodResult, lastPeriodResult, totalResult] = yield Promise.all([
                    this.model.aggregate(buildPipeline({ $gte: startThis })),
                    this.model.aggregate(buildPipeline({ $gte: startLast, $lte: endLast })),
                    this.model.aggregate(buildPipeline()),
                ]);
                const thisPeriodCount = ((_a = thisPeriodResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
                const lastPeriodCount = ((_b = lastPeriodResult[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
                const total = ((_c = totalResult[0]) === null || _c === void 0 ? void 0 : _c.total) || 0;
                // Growth calculation
                let growth = 0;
                let growthType = 'no_change';
                if (lastPeriodCount > 0) {
                    growth = ((thisPeriodCount - lastPeriodCount) / lastPeriodCount) * 100;
                    growthType =
                        growth > 0 ? 'increase' : growth < 0 ? 'decrease' : 'no_change';
                }
                else if (thisPeriodCount > 0 && lastPeriodCount === 0) {
                    growth = 100;
                    growthType = 'increase';
                }
                const formattedGrowth = (growth > 0 ? '+' : '') + growth.toFixed(2) + '%';
                return {
                    total,
                    thisPeriodCount,
                    lastPeriodCount,
                    growth: Math.abs(growth),
                    formattedGrowth,
                    growthType,
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Failed to calculate growth: ${errorMessage}`);
            }
        });
    }
    // ====== REVENUE BREAKDOWN ======
    getRevenueBreakdown(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sumField, groupByField, filter = {}, limit = 10 } = options;
            this.pipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: `$${groupByField}`,
                        totalRevenue: { $sum: `$${sumField}` },
                        count: { $sum: 1 },
                        averageRevenue: { $avg: `$${sumField}` },
                    },
                },
                { $sort: { totalRevenue: -1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        [groupByField]: '$_id',
                        totalRevenue: { $round: ['$totalRevenue', 2] },
                        count: 1,
                        averageRevenue: { $round: ['$averageRevenue', 2] },
                    },
                },
            ];
            return yield this.execute();
        });
    }
    // ====== TIME TRENDS ======
    getTimeTrends(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { timeUnit, dateField = 'createdAt', startDate, filter = {}, sumField, gapFill = true, } = options;
            const now = new Date();
            const field = `$${dateField}`;
            // Date range: startDate → now (or current year if no startDate)
            const rangeStart = startDate !== null && startDate !== void 0 ? startDate : new Date(now.getFullYear(), 0, 1);
            const dateFilter = Object.assign(Object.assign({}, filter), { [dateField]: { $gte: rangeStart } });
            // Dynamic date grouping
            const dateGrouping = {
                day: { year: { $year: field }, month: { $month: field }, day: { $dayOfMonth: field } },
                week: { year: { $year: field }, week: { $week: field } },
                month: { year: { $year: field }, month: { $month: field } },
                year: { year: { $year: field } },
            };
            const groupSpec = {
                _id: dateGrouping[timeUnit],
                count: { $sum: 1 },
            };
            if (sumField) {
                groupSpec.total = { $sum: `$${sumField}` };
            }
            this.pipeline = [
                { $match: dateFilter },
                { $group: groupSpec },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
            ];
            const results = yield this.execute();
            const hasSumField = !!sumField;
            // Build lookup for gap filling
            const lookup = new Map();
            results.forEach((r) => {
                const key = this.buildPeriodKey(timeUnit, r._id);
                lookup.set(key, Object.assign({ count: r.count }, (hasSumField && { total: r.total })));
            });
            if (!gapFill) {
                return results.map((r) => this.formatTrendItem(timeUnit, r._id, r.count, hasSumField ? r.total : undefined));
            }
            // Gap-fill: generate all periods in range
            const periods = this.generatePeriods(timeUnit, rangeStart, now);
            return periods.map(p => {
                var _a, _b;
                const data = lookup.get(p.key);
                return this.formatTrendItem(timeUnit, p.id, (_a = data === null || data === void 0 ? void 0 : data.count) !== null && _a !== void 0 ? _a : 0, hasSumField ? ((_b = data === null || data === void 0 ? void 0 : data.total) !== null && _b !== void 0 ? _b : 0) : undefined);
            });
        });
    }
    // Format a single trend item to { period, label, count, total? }
    formatTrendItem(timeUnit, id, count, total) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let period;
        let label;
        switch (timeUnit) {
            case 'month':
                period = `${id.year}-${String(id.month).padStart(2, '0')}`;
                label = `${monthNames[id.month - 1]} ${id.year}`;
                break;
            case 'week':
                period = `${id.year}-W${String(id.week).padStart(2, '0')}`;
                label = `Week ${id.week}`;
                break;
            case 'day':
                period = `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
                label = `${monthNames[id.month - 1]} ${id.day}`;
                break;
            case 'year':
                period = `${id.year}`;
                label = `${id.year}`;
                break;
            default:
                period = JSON.stringify(id);
                label = period;
        }
        const item = { period, label, count };
        if (total !== undefined)
            item.total = total;
        return item;
    }
    // Build a lookup key from _id
    buildPeriodKey(timeUnit, id) {
        switch (timeUnit) {
            case 'month': return `${id.year}-${id.month}`;
            case 'week': return `${id.year}-${id.week}`;
            case 'day': return `${id.year}-${id.month}-${id.day}`;
            case 'year': return `${id.year}`;
            default: return JSON.stringify(id);
        }
    }
    // Generate all periods in a date range for gap filling
    generatePeriods(timeUnit, start, end) {
        const periods = [];
        const current = new Date(start);
        switch (timeUnit) {
            case 'month':
                current.setDate(1);
                while (current <= end) {
                    const year = current.getFullYear();
                    const month = current.getMonth() + 1;
                    periods.push({ key: `${year}-${month}`, id: { year, month } });
                    current.setMonth(current.getMonth() + 1);
                }
                break;
            case 'day':
                while (current <= end) {
                    const year = current.getFullYear();
                    const month = current.getMonth() + 1;
                    const day = current.getDate();
                    periods.push({ key: `${year}-${month}-${day}`, id: { year, month, day } });
                    current.setDate(current.getDate() + 1);
                }
                break;
            case 'year': {
                const startYear = start.getFullYear();
                const endYear = end.getFullYear();
                for (let y = startYear; y <= endYear; y++) {
                    periods.push({ key: `${y}`, id: { year: y } });
                }
                break;
            }
            case 'week': {
                // Week gap-fill: generate week numbers from start to end
                const getWeek = (d) => {
                    const oneJan = new Date(d.getFullYear(), 0, 1);
                    return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay()) / 7);
                };
                while (current <= end) {
                    const year = current.getFullYear();
                    const week = getWeek(current);
                    const key = `${year}-${week}`;
                    if (!periods.some(p => p.key === key)) {
                        periods.push({ key, id: { year, week } });
                    }
                    current.setDate(current.getDate() + 7);
                }
                break;
            }
        }
        return periods;
    }
    // ====== TOP PERFORMERS ======
    getTopPerformers(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sumField, groupByField, filter = {}, limit = 10, period, } = options;
                let dateFilter = {};
                if (period) {
                    const { startThis } = this.getPeriodDates(period);
                    dateFilter = { createdAt: { $gte: startThis } };
                }
                this.pipeline = [
                    { $match: Object.assign(Object.assign({}, filter), dateFilter) },
                    {
                        $group: {
                            _id: `$${groupByField}`,
                            totalValue: { $sum: `$${sumField}` },
                            count: { $sum: 1 },
                            averageValue: { $avg: `$${sumField}` },
                            firstSeen: { $min: '$createdAt' },
                            lastSeen: { $max: '$createdAt' },
                        },
                    },
                    { $sort: { totalValue: -1 } },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            [groupByField]: '$_id',
                            totalValue: { $round: ['$totalValue', 2] },
                            count: 1,
                            averageValue: { $round: ['$averageValue', 2] },
                            firstSeen: 1,
                            lastSeen: 1,
                            rank: { $add: [{ $indexOfArray: [[], null] }, 1] },
                        },
                    },
                ];
                return yield this.execute();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Failed to get top performers: ${errorMessage}`);
            }
        });
    }
}
// ====== HELPER FUNCTION ======
const calculateGrowthDynamic = (Model_1, ...args_1) => __awaiter(void 0, [Model_1, ...args_1], void 0, function* (Model, options = {}) {
    try {
        const aggregationBuilder = new AggregationBuilder(Model);
        return yield aggregationBuilder.calculateGrowth(options);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new ApiError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Failed to calculate growth dynamically: ${errorMessage}`);
    }
});
exports.calculateGrowthDynamic = calculateGrowthDynamic;
exports.default = AggregationBuilder;
// Compact summary for aggregation pipeline
function summarizePipeline(pipeline) {
    const parts = [];
    for (const stage of pipeline) {
        const key = stage && typeof stage === 'object' ? Object.keys(stage)[0] : undefined;
        if (!key)
            continue;
        const val = stage[key];
        switch (key) {
            case '$match': {
                const conds = val && typeof val === 'object' ? Object.keys(val) : [];
                const firstKey = conds[0];
                let display = `$match`;
                if (firstKey) {
                    const v = val[firstKey];
                    const repr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    display = `$match(${firstKey}=${repr})`;
                }
                parts.push(display);
                break;
            }
            case '$group': {
                const idVal = (val === null || val === void 0 ? void 0 : val._id) !== undefined ? val._id : undefined;
                const idRepr = idVal !== undefined ? String(idVal) : undefined;
                parts.push(idRepr ? `$group(_id='${idRepr}')` : `$group`);
                break;
            }
            case '$sort': {
                const keys = val && typeof val === 'object' ? Object.keys(val) : [];
                parts.push(keys.length ? `$sort(${keys.join(',')})` : `$sort`);
                break;
            }
            case '$project': {
                const keys = val && typeof val === 'object' ? Object.keys(val) : [];
                parts.push(keys.length ? `$project(${keys.length} fields)` : `$project`);
                break;
            }
            case '$lookup': {
                const from = (val === null || val === void 0 ? void 0 : val.from) ? String(val.from) : undefined;
                parts.push(from ? `$lookup(from='${from}')` : `$lookup`);
                break;
            }
            default:
                parts.push(key);
        }
    }
    return parts.join(' → ');
}
