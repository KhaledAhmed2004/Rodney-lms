import { Model, PipelineStage } from 'mongoose';
import { recordDbQuery } from '../logging/requestContext';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { traceOperation, addSpanAttributes, recordSpanEvent } from './builderTracing';
import { getBuilderConfig } from './builderConfig';

interface IGrowthOptions {
  sumField?: string; // Field to sum for revenue calculations
  filter?: Record<string, any>; // Additional filters
  groupBy?: string; // Field to group by (optional)
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'; // Growth period
}

interface IStatistic {
  total: number;
  thisPeriodCount: number;
  lastPeriodCount: number;
  growth: number;
  formattedGrowth: string;
  growthType: 'increase' | 'decrease' | 'no_change';
}

class AggregationBuilder<T> {
  private model: Model<T>;
  private pipeline: PipelineStage[] = [];

  constructor(model: Model<T>) {
    this.model = model;
  }

  // ====== PIPELINE BUILDERS ======
  match(conditions: Record<string, any>) {
    this.pipeline.push({ $match: conditions });
    return this;
  }

  group(groupSpec: Record<string, any>) {
    this.pipeline.push({ $group: groupSpec });
    return this;
  }

  project(projectSpec: Record<string, any>) {
    this.pipeline.push({ $project: projectSpec });
    return this;
  }

  sort(sortSpec: Record<string, any>) {
    this.pipeline.push({ $sort: sortSpec });
    return this;
  }

  limit(limitValue: number) {
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

  async execute(): Promise<any[]> {
    return traceOperation('AggregationBuilder', 'execute', async () => {
      const config = getBuilderConfig().aggregation;
      const modelName = (this.model as any)?.modelName || (this.model as any)?.collection?.name;

      addSpanAttributes({
        'aggregation.model': modelName,
        'aggregation.pipelineStages': this.pipeline.length,
      });

      const _start = Date.now();
      const res = await this.model.aggregate(this.pipeline);
      const dur = Date.now() - _start;

      const pipelineSummary = summarizePipeline(this.pipeline);

      if (config.recordMetrics) {
        recordDbQuery(dur, { model: modelName, operation: 'aggregate', cacheHit: false, pipeline: pipelineSummary });
      }

      addSpanAttributes({
        'aggregation.duration': dur,
        'aggregation.resultCount': res.length,
      });

      recordSpanEvent('aggregation_complete', { resultCount: res.length });

      return res;
    });
  }

  // ====== PERIOD CALCULATOR ======
  private getPeriodDates(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  ) {
    const now = new Date();
    let startThis: Date, startLast: Date, endLast: Date;

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
        const lastQuarterYear =
          currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
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
  async calculateGrowth(options: IGrowthOptions = {}): Promise<IStatistic> {
    try {
      const { sumField, filter = {}, groupBy, period = 'month' } = options;
      const { startThis, startLast, endLast } = this.getPeriodDates(period);

      const buildPipeline = (dateFilter?: Record<string, any>) => {
        const pipeline: PipelineStage[] = [];
        const matchConditions = { ...filter };
        if (dateFilter) matchConditions.createdAt = dateFilter;

        pipeline.push({ $match: matchConditions });

        const groupSpec: Record<string, any> = {
          _id: groupBy ? `$${groupBy}` : null,
        };
        groupSpec.total = sumField ? { $sum: `$${sumField}` } : { $sum: 1 };
        pipeline.push({ $group: groupSpec });

        if (groupBy) {
          pipeline.push({ $group: { _id: null, total: { $sum: '$total' } } });
        }

        return pipeline;
      };

      const [thisPeriodResult, lastPeriodResult, totalResult] =
        await Promise.all([
          this.model.aggregate(buildPipeline({ $gte: startThis })),
          this.model.aggregate(
            buildPipeline({ $gte: startLast, $lte: endLast })
          ),
          this.model.aggregate(buildPipeline()),
        ]);

      const thisPeriodCount = thisPeriodResult[0]?.total || 0;
      const lastPeriodCount = lastPeriodResult[0]?.total || 0;
      const total = totalResult[0]?.total || 0;

      // Growth calculation
      let growth = 0;
      let growthType: 'increase' | 'decrease' | 'no_change' = 'no_change';

      if (lastPeriodCount > 0) {
        growth = ((thisPeriodCount - lastPeriodCount) / lastPeriodCount) * 100;
        growthType =
          growth > 0 ? 'increase' : growth < 0 ? 'decrease' : 'no_change';
      } else if (thisPeriodCount > 0 && lastPeriodCount === 0) {
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Failed to calculate growth: ${errorMessage}`
      );
    }
  }

  // ====== REVENUE BREAKDOWN ======
  async getRevenueBreakdown(options: {
    sumField: string;
    groupByField: string;
    filter?: Record<string, any>;
    limit?: number;
  }) {
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

    return await this.execute();
  }

  // ====== TIME TRENDS ======
  async getTimeTrends(options: {
    timeUnit: 'day' | 'week' | 'month' | 'year';
    dateField?: string;
    startDate?: Date;
    filter?: Record<string, any>;
    sumField?: string;
    gapFill?: boolean;
  }) {
    const {
      timeUnit,
      dateField = 'createdAt',
      startDate,
      filter = {},
      sumField,
      gapFill = true,
    } = options;

    const now = new Date();
    const field = `$${dateField}`;

    // Date range: startDate → now (or current year if no startDate)
    const rangeStart = startDate ?? new Date(now.getFullYear(), 0, 1);
    const dateFilter = {
      ...filter,
      [dateField]: { $gte: rangeStart },
    };

    // Dynamic date grouping
    const dateGrouping = {
      day: { year: { $year: field }, month: { $month: field }, day: { $dayOfMonth: field } },
      week: { year: { $year: field }, week: { $week: field } },
      month: { year: { $year: field }, month: { $month: field } },
      year: { year: { $year: field } },
    };

    const groupSpec: Record<string, any> = {
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

    const results = await this.execute();
    const hasSumField = !!sumField;

    // Build lookup for gap filling
    const lookup = new Map<string, { count: number; total?: number }>();
    results.forEach((r: any) => {
      const key = this.buildPeriodKey(timeUnit, r._id);
      lookup.set(key, { count: r.count, ...(hasSumField && { total: r.total }) });
    });

    if (!gapFill) {
      return results.map((r: any) => this.formatTrendItem(timeUnit, r._id, r.count, hasSumField ? r.total : undefined));
    }

    // Gap-fill: generate all periods in range
    const periods = this.generatePeriods(timeUnit, rangeStart, now);
    return periods.map(p => {
      const data = lookup.get(p.key);
      return this.formatTrendItem(timeUnit, p.id, data?.count ?? 0, hasSumField ? (data?.total ?? 0) : undefined);
    });
  }

  // Format a single trend item to { period, label, count, total? }
  private formatTrendItem(
    timeUnit: string,
    id: any,
    count: number,
    total?: number
  ): { period: string; label: string; count: number; total?: number } {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let period: string;
    let label: string;

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

    const item: { period: string; label: string; count: number; total?: number } = { period, label, count };
    if (total !== undefined) item.total = total;
    return item;
  }

  // Build a lookup key from _id
  private buildPeriodKey(timeUnit: string, id: any): string {
    switch (timeUnit) {
      case 'month': return `${id.year}-${id.month}`;
      case 'week': return `${id.year}-${id.week}`;
      case 'day': return `${id.year}-${id.month}-${id.day}`;
      case 'year': return `${id.year}`;
      default: return JSON.stringify(id);
    }
  }

  // Generate all periods in a date range for gap filling
  private generatePeriods(timeUnit: string, start: Date, end: Date): Array<{ key: string; id: any }> {
    const periods: Array<{ key: string; id: any }> = [];
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
        const getWeek = (d: Date) => {
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
  async getTopPerformers(options: {
    sumField: string;
    groupByField: string;
    filter?: Record<string, any>;
    limit?: number;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  }) {
    try {
      const {
        sumField,
        groupByField,
        filter = {},
        limit = 10,
        period,
      } = options;

      let dateFilter = {};
      if (period) {
        const { startThis } = this.getPeriodDates(period);
        dateFilter = { createdAt: { $gte: startThis } };
      }

      this.pipeline = [
        { $match: { ...filter, ...dateFilter } },
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

      return await this.execute();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Failed to get top performers: ${errorMessage}`
      );
    }
  }
}

// ====== HELPER FUNCTION ======
const calculateGrowthDynamic = async (
  Model: any,
  options: {
    sumField?: string;
    filter?: Record<string, any>;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  } = {}
) => {
  try {
    const aggregationBuilder = new AggregationBuilder(Model);
    return await aggregationBuilder.calculateGrowth(options);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to calculate growth dynamically: ${errorMessage}`
    );
  }
};

export default AggregationBuilder;
// Compact summary for aggregation pipeline
function summarizePipeline(pipeline: PipelineStage[]): string {
  const parts: string[] = [];
  for (const stage of pipeline) {
    const key = stage && typeof stage === 'object' ? Object.keys(stage as any)[0] : undefined;
    if (!key) continue;
    const val: any = (stage as any)[key];
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
        const idVal = val?._id !== undefined ? val._id : undefined;
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
        const from = val?.from ? String(val.from) : undefined;
        parts.push(from ? `$lookup(from='${from}')` : `$lookup`);
        break;
      }
      default:
        parts.push(key);
    }
  }
  return parts.join(' → ');
}
export { calculateGrowthDynamic };
