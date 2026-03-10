import { FilterQuery, Query, Model } from 'mongoose';
import { recordDbQuery } from '../logging/requestContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import escapeRegex from 'escape-string-regexp';
import { traceSync, addSpanAttributes } from './builderTracing';
import { getBuilderConfig } from './builderConfig';

// ==================== INTERFACES ====================

/**
 * Fuzzy search options
 */
export interface IFuzzyOptions {
  /** Maximum edit distance (1 = one typo, 2 = two typos). Default: 1 */
  maxDistance?: number;
  /** Minimum prefix that must match exactly. Default: 1 */
  prefixLength?: number;
  /** Minimum word length to apply fuzzy (shorter = exact match). Default: 3 */
  minWordLength?: number;
}

/**
 * Score boost configuration for relevance scoring
 */
export interface IScoreBoosts {
  [field: string]: number;
}

/**
 * Highlight options
 */
export interface IHighlightOptions {
  /** HTML tag to wrap matches. Default: 'mark' */
  tag?: string;
  /** CSS class for the tag. Default: '' */
  className?: string;
  /** Maximum characters around match for fragments. Default: 100 */
  fragmentSize?: number;
}

/**
 * Autocomplete options
 */
export interface IAutocompleteOptions {
  /** Maximum suggestions to return. Default: 10 */
  limit?: number;
  /** Minimum input length to trigger. Default: 2 */
  minLength?: number;
}

/**
 * Result with score and highlights
 */
export interface IScoredResult<T> {
  doc: T;
  _score: number;
  _highlights?: Record<string, string>;
}

/**
 * Advanced search result
 */
export interface IAdvancedSearchResult<T> {
  data: IScoredResult<T>[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPage: number;
  };
  meta?: {
    searchTerm?: string;
    took?: number;
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate fuzzy regex patterns for a word
 * Handles: substitution, deletion, insertion, transposition
 */
function generateFuzzyPatterns(word: string, maxDistance: number = 1): string[] {
  const escaped = escapeRegex(word);
  const patterns: string[] = [escaped]; // exact match always included

  if (word.length < 3) return patterns; // too short for fuzzy

  if (maxDistance >= 1) {
    // 1. Character substitution (replace any char with wildcard)
    for (let i = 0; i < word.length; i++) {
      patterns.push(
        escapeRegex(word.slice(0, i)) + '.' + escapeRegex(word.slice(i + 1))
      );
    }

    // 2. Character deletion (missing character in input)
    for (let i = 0; i < word.length; i++) {
      patterns.push(
        escapeRegex(word.slice(0, i)) + escapeRegex(word.slice(i + 1))
      );
    }

    // 3. Character insertion (extra character in input)
    for (let i = 0; i <= word.length; i++) {
      patterns.push(
        escapeRegex(word.slice(0, i)) + '.' + escapeRegex(word.slice(i))
      );
    }

    // 4. Adjacent transposition (swapped characters)
    for (let i = 0; i < word.length - 1; i++) {
      patterns.push(
        escapeRegex(word.slice(0, i)) +
        escapeRegex(word[i + 1]) +
        escapeRegex(word[i]) +
        escapeRegex(word.slice(i + 2))
      );
    }
  }

  // Distance 2: double substitution at different positions
  if (maxDistance >= 2) {
    for (let i = 0; i < word.length; i++) {
      for (let j = i + 2; j < word.length; j++) {
        patterns.push(
          escapeRegex(word.slice(0, i)) + '.' +
          escapeRegex(word.slice(i + 1, j)) + '.' +
          escapeRegex(word.slice(j + 1))
        );
      }
    }
  }

  // Remove duplicates
  return [...new Set(patterns)];
}

/**
 * Calculate relevance score for a document
 */
function calculateScore(
  doc: any,
  searchTerms: string[],
  fields: string[],
  boosts: IScoreBoosts
): number {
  let score = 0;
  const docObj = doc.toObject ? doc.toObject() : doc;

  for (const field of fields) {
    const fieldValue = getNestedValue(docObj, field);
    if (!fieldValue) continue;

    const text = String(fieldValue).toLowerCase();
    const boost = boosts[field] || 1;

    for (const term of searchTerms) {
      const termLower = term.toLowerCase();

      // Exact word match: highest score
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(termLower)}\\b`, 'gi');
      const exactMatches = (text.match(wordBoundaryRegex) || []).length;
      score += exactMatches * 10 * boost;

      // Partial match: lower score
      if (text.includes(termLower) && exactMatches === 0) {
        score += 3 * boost;
      }

      // Starts with: bonus
      if (text.startsWith(termLower)) {
        score += 5 * boost;
      }
    }
  }

  return score;
}

/**
 * Apply highlighting to text
 */
function highlightText(
  text: string,
  searchTerms: string[],
  options: IHighlightOptions
): string {
  const { tag = 'mark', className = '', fragmentSize = 100 } = options;

  let result = text;
  const openTag = className ? `<${tag} class="${className}">` : `<${tag}>`;
  const closeTag = `</${tag}>`;

  for (const term of searchTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, `${openTag}$1${closeTag}`);
  }

  // If text is too long, extract fragment around first match
  if (result.length > fragmentSize * 2) {
    const firstMatchIndex = result.indexOf(openTag);
    if (firstMatchIndex > fragmentSize) {
      const start = Math.max(0, firstMatchIndex - fragmentSize);
      result = '...' + result.slice(start);
    }
    if (result.length > fragmentSize * 2) {
      result = result.slice(0, fragmentSize * 2) + '...';
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ==================== AUTOCOMPLETE CACHE ====================

const autocompleteCache = new Map<string, { data: string[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

function getCachedAutocomplete(key: string): string[] | null {
  const cached = autocompleteCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  autocompleteCache.delete(key);
  return null;
}

function setCachedAutocomplete(key: string, data: string[]): void {
  // Limit cache size
  if (autocompleteCache.size > 1000) {
    const oldestKey = autocompleteCache.keys().next().value;
    if (oldestKey) autocompleteCache.delete(oldestKey);
  }
  autocompleteCache.set(key, { data, timestamp: Date.now() });
}

// ==================== QUERYBUILDER CLASS ====================

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  // Advanced search state
  private _searchTerms: string[] = [];
  private _searchFields: string[] = [];
  private _scoreBoosts: IScoreBoosts = {};
  private _highlightOptions: IHighlightOptions | null = null;
  private _enableScoring = false;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  // 🔍 Searching across multiple fields
  search(searchableFields: string[]) {
    if (this?.query?.searchTerm) {
      // Sanitize search term to prevent NoSQL injection via regex
      const sanitizedTerm = escapeRegex(String(this.query.searchTerm));

      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          field =>
            ({
              [field]: {
                $regex: sanitizedTerm,
                $options: 'i',
              },
            } as FilterQuery<T>)
        ),
      });
    }
    return this;
  }

  // 🔎 Text search using MongoDB text indexes (for models with text index)
  textSearch() {
    if (this?.query?.searchTerm) {
      const term = this.query.searchTerm as string;
      this.modelQuery = this.modelQuery.find({ $text: { $search: term } } as FilterQuery<T>);
    }
    return this;
  }

  // 🔎 Filtering
  filter() {
    const queryObj = { ...this.query };
    const excludeFields = [
      'searchTerm',
      'sort',
      'page',
      'limit',
      'fields',
      'timeFilter',
      'start',
      'end',
      'category', // we will handle this separately
      'latitude', // we will handle this separately
      'longitude', // we will handle this separately
      'distance', // we will handle this separately
    ];
    excludeFields.forEach(el => delete queryObj[el]);

    this.modelQuery = this.modelQuery.find(queryObj as FilterQuery<T>);

    // ✅ Category filtering (support single or multiple)
    if (this?.query?.category) {
      const categories = (this.query.category as string)
        .split(',')
        .map(cat => cat.trim());

      // Apply category filter
      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(), // keep previous filters
        taskCategory: { $in: categories },
      } as FilterQuery<T>);
    }

    return this;
  }

  // 📍 Location-based filtering using index-friendly bounding box
  locationFilter() {
    if (this?.query?.latitude && this?.query?.longitude && this?.query?.distance) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const distanceKm = parseFloat(this.query.distance as string);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || isNaN(distanceKm)) {
        throw new Error('Invalid latitude, longitude, or distance values');
      }

      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }

      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      if (distanceKm <= 0) {
        throw new Error('Distance must be greater than 0');
      }

      // Bounding box approximation (fast and index-friendly)
      const latDelta = distanceKm / 111.32; // ~ km per degree latitude
      const latRad = (lat * Math.PI) / 180;
      const cosLat = Math.cos(latRad);
      const lngDelta = distanceKm / (111.32 * (cosLat || 1e-6)); // avoid division by zero at poles

      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLng = lng - lngDelta;
      const maxLng = lng + lngDelta;

      this.modelQuery = this.modelQuery.find({
        latitude: { $gte: minLat, $lte: maxLat },
        longitude: { $gte: minLng, $lte: maxLng },
      } as FilterQuery<T>);
    }

    return this;
  }

  // 🌍 Geospatial: find by proximity using $near on GeoJSON Point `location`
  geoNear() {
    const hasCoords = this?.query?.latitude && this?.query?.longitude;
    const hasMax = this?.query?.distance || this?.query?.maxDistance;
    if (hasCoords && hasMax) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const field = (this?.query?.geoField as string) || 'location';
      const maxKm = this.query.distance ? parseFloat(this.query.distance as string) : undefined;
      const maxMetersExplicit = this.query.maxDistance ? parseFloat(this.query.maxDistance as string) : undefined;
      const minKm = this.query.minDistance ? parseFloat(this.query.minDistance as string) : undefined;

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid latitude or longitude values');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      const maxMeters = typeof maxKm === 'number' && !isNaN(maxKm)
        ? Math.max(0, maxKm * 1000)
        : (typeof maxMetersExplicit === 'number' && !isNaN(maxMetersExplicit) ? Math.max(0, maxMetersExplicit) : undefined);

      const minMeters = typeof minKm === 'number' && !isNaN(minKm)
        ? Math.max(0, minKm * 1000)
        : undefined;

      const nearClause: Record<string, unknown> = {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
      };
      if (typeof maxMeters === 'number') {
        (nearClause as any).$maxDistance = maxMeters;
      }
      if (typeof minMeters === 'number') {
        (nearClause as any).$minDistance = minMeters;
      }

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $near: nearClause },
      } as FilterQuery<T>);
    }
    return this;
  }

  // 🌐 Geospatial: within a circle using $geoWithin + $centerSphere
  geoWithinCircle() {
    if (this?.query?.latitude && this?.query?.longitude && (this?.query?.radius || this?.query?.distance)) {
      const lat = parseFloat(this.query.latitude as string);
      const lng = parseFloat(this.query.longitude as string);
      const field = (this?.query?.geoField as string) || 'location';
      const radiusKm = this.query.radius ? parseFloat(this.query.radius as string) : parseFloat(this.query.distance as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
        throw new Error('Invalid latitude, longitude, or radius values');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }
      if (radiusKm <= 0) {
        throw new Error('Radius must be greater than 0');
      }

      const earthRadiusKm = 6378.1;
      const radiusInRadians = radiusKm / earthRadiusKm;

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $geoWithin: { $centerSphere: [[lng, lat], radiusInRadians] } },
      } as FilterQuery<T>);
    }
    return this;
  }

  // 🧭 Geospatial: within a bounding box using $geoWithin + $box
  geoWithinBox() {
    const hasSW = this?.query?.swLat && this?.query?.swLng;
    const hasNE = this?.query?.neLat && this?.query?.neLng;
    if (hasSW && hasNE) {
      const swLat = parseFloat(this.query.swLat as string);
      const swLng = parseFloat(this.query.swLng as string);
      const neLat = parseFloat(this.query.neLat as string);
      const neLng = parseFloat(this.query.neLng as string);
      const field = (this?.query?.geoField as string) || 'location';

      if ([swLat, swLng, neLat, neLng].some(v => isNaN(v))) {
        throw new Error('Invalid bounding box coordinates');
      }
      if (swLat < -90 || swLat > 90 || neLat < -90 || neLat > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }
      if (swLng < -180 || swLng > 180 || neLng < -180 || neLng > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: { $geoWithin: { $box: [[swLng, swLat], [neLng, neLat]] } },
      } as FilterQuery<T>);
    }
    return this;
  }

  // 🔷 Geospatial: within a polygon using $geoWithin + $polygon
  geoWithinPolygon() {
    const field = (this?.query?.geoField as string) || 'location';
    const polygonRaw = (this?.query?.polygon as string) || (this?.query?.poly as string);
    if (!polygonRaw) return this;

    let coordinates: Array<[number, number]> = [];
    try {
      // Try JSON first
      const parsed = JSON.parse(polygonRaw);
      if (Array.isArray(parsed)) {
        coordinates = parsed.map((pair: any) => [parseFloat(pair[0]), parseFloat(pair[1])]);
      }
    } catch {
      // Fallback: "lng,lat;lng,lat;..."
      coordinates = polygonRaw.split(';')
        .map(p => p.trim())
        .filter(Boolean)
        .map(pairStr => {
          const [lngStr, latStr] = pairStr.split(',').map(s => s.trim());
          return [parseFloat(lngStr), parseFloat(latStr)] as [number, number];
        });
    }

    // Basic validation
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      throw new Error('Polygon must have at least 3 points');
    }

    // Validate ranges and ensure closure
    coordinates.forEach(([lng, lat]) => {
      if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid polygon coordinates');
      if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90 degrees');
      if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180 degrees');
    });

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      // Auto-close the ring
      coordinates.push([first[0], first[1]]);
    }

    this.modelQuery = this.modelQuery.find({
      ...this.modelQuery.getFilter(),
      [field]: { $geoWithin: { $polygon: coordinates } },
    } as FilterQuery<T>);

    return this;
  }

  // 🔀 Convenience: choose geo mode from query params
  geoQuery() {
    const mode = (this?.query?.geoMode as string) || 'near';
    if (mode === 'near') return this.geoNear();
    if (mode === 'circle') return this.geoWithinCircle();
    if (mode === 'box') return this.geoWithinBox();
    if (mode === 'polygon') return this.geoWithinPolygon();
    return this;
  }

  // ⏰ Date filtering (recently, weekly, monthly, custom)
  dateFilter() {
    if (this?.query?.timeFilter) {
      const now = new Date();
      let dateRange: Record<string, Date> = {};

      if (this.query.timeFilter === 'recently') {
        // Last 24 hours
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        dateRange = { $gte: yesterday, $lte: now };
      } else if (this.query.timeFilter === 'weekly') {
        // Current week (Mon–Sun)
        dateRange = {
          $gte: startOfWeek(now, { weekStartsOn: 1 }),
          $lte: endOfWeek(now, { weekStartsOn: 1 }),
        };
      } else if (this.query.timeFilter === 'monthly') {
        // Current month
        dateRange = {
          $gte: startOfMonth(now),
          $lte: endOfMonth(now),
        };
      } else if (this.query.timeFilter === 'custom') {
        // Custom range: requires ?start=YYYY-MM-DD&end=YYYY-MM-DD
        if (!this.query.start || !this.query.end) {
          throw new Error(
            "Custom date filter requires both 'start' and 'end' query parameters."
          );
        }

        const startDate = new Date(this.query.start as string);
        const endDate = new Date(this.query.end as string);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error(
            "Invalid date format. Use 'YYYY-MM-DD' format for 'start' and 'end'."
          );
        }

        if (startDate > endDate) {
          throw new Error("'start' date cannot be after 'end' date.");
        }

        dateRange = { $gte: startDate, $lte: endDate };
      }

      if (Object.keys(dateRange).length > 0) {
        this.modelQuery = this.modelQuery.find({
          ...this.modelQuery.getFilter(),
          createdAt: dateRange,
        });
      }
    }

    return this;
  }

  // ↕️ Sorting
  sort() {
    let sort = (this?.query?.sort as string) || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }

  // 📄 Pagination
  paginate() {
    const config = getBuilderConfig().query;
    let limit = Number(this?.query?.limit) || config.defaultLimit;
    let page = Number(this?.query?.page) || 1;

    // Enforce max limit
    if (limit > config.maxLimit) {
      limit = config.maxLimit;
    }

    let skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    // Add tracing attributes
    addSpanAttributes({
      'query.page': page,
      'query.limit': limit,
      'query.skip': skip,
    });

    return this;
  }

  // 🎯 Field selection
  fields() {
    let fields =
      (this?.query?.fields as string)?.split(',').join(' ') || '-__v';
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  // 🔗 Populating relations and select all fields if undefined
  populate(populateFields: string[], selectFields?: Record<string, unknown>) {
    this.modelQuery = this.modelQuery.populate(
      populateFields.map(field => ({
        path: field,
        select: selectFields?.[field] ?? undefined,
      }))
    );
    return this;
  }

  // 🎯 Populate with match conditions for filtering
  populateWithMatch(
    path: string,
    matchConditions: Record<string, unknown> = {},
    selectFields?: string
  ) {
    this.modelQuery = this.modelQuery.populate({
      path,
      match: matchConditions,
      select: selectFields ?? '-__v',
    });
    return this;
  }

  // 🔍 Search within populated fields
  searchInPopulatedFields(
    path: string,
    searchableFields: string[],
    searchTerm: string,
    additionalMatch: Record<string, unknown> = {}
  ) {
    if (searchTerm) {
      // Sanitize search term to prevent NoSQL injection via regex
      const sanitizedTerm = escapeRegex(searchTerm);

      const searchConditions = {
        $and: [
          {
            $or: searchableFields.map(field => ({
              [field]: {
                $regex: sanitizedTerm,
                $options: 'i',
              },
            })),
          },
          additionalMatch,
        ],
      };

      this.modelQuery = this.modelQuery.populate({
        path,
        match: searchConditions,
        select: '-__v',
      });
    }
    return this;
  }

  // 🧹 Filter out documents with null populated fields
  filterNullPopulatedFields() {
    return this;
  }

  // 📊 Get filtered results with custom pagination
  async getFilteredResults(populatedFieldsToCheck: string[] = []) {
    const _start = Date.now();
    const results = await this.modelQuery;
    // Rely on the global Mongoose metrics plugin to record model/operation for this find.
    // Removing the manual record prevents duplicate hits and avoids 'n/a' metadata entries.

    // Filter out documents where specified populated fields are null
    const filteredResults = results.filter((doc: any) => {
      if (populatedFieldsToCheck.length === 0) {
        return true; // No filtering if no fields specified
      }

      return populatedFieldsToCheck.every((fieldPath: string) => {
        const value = doc.get ? doc.get(fieldPath) : doc[fieldPath];
        return value !== null && value !== undefined;
      });
    });

    // Calculate pagination based on filtered results
    const total = filteredResults.length;
    const limit = Number(this?.query?.limit) || 10;
    const page = Number(this?.query?.page) || 1;
    const totalPage = Math.ceil(total / limit);

    const pagination = {
      total,
      limit,
      page,
      totalPage,
    };

    return {
      data: filteredResults,
      pagination,
    };
  }

  // 📊 Pagination info
  async getPaginationInfo() {
    const _start = Date.now();
    const total = await this.modelQuery.model.countDocuments(
      this.modelQuery.getFilter()
    );
    const dur = Date.now() - _start;
    const modelName = (this.modelQuery.model as any)?.modelName || (this.modelQuery.model as any)?.collection?.name;
    recordDbQuery(dur, { model: modelName, operation: 'countDocuments', cacheHit: false });
    const limit = Number(this?.query?.limit) || 10;
    const page = Number(this?.query?.page) || 1;
    const totalPage = Math.ceil(total / limit);

    return {
      total,
      limit,
      page,
      totalPage,
    };
  }

  // ==================== ADVANCED SEARCH METHODS ====================

  /**
   * 🔍 Fuzzy search with typo tolerance
   *
   * Finds documents even when search terms have typos.
   * Uses Levenshtein distance algorithm to generate pattern variations.
   *
   * @param searchableFields - Fields to search in
   * @param options - Fuzzy search configuration
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // Basic fuzzy search - finds "laptop" when user types "lapto"
   * new QueryBuilder(Product.find(), { searchTerm: 'lapto' })
   *   .fuzzySearch(['name', 'description'])
   *   .paginate();
   *
   * // With options - allow 2 typos
   * new QueryBuilder(Product.find(), { searchTerm: 'samsng galaxi' })
   *   .fuzzySearch(['name', 'brand'], {
   *     maxDistance: 2,    // Allow 2 typos per word
   *     prefixLength: 1,   // First letter must match
   *     minWordLength: 3   // Only apply fuzzy to words >= 3 chars
   *   })
   *   .filter()
   *   .paginate();
   * ```
   */
  fuzzySearch(
    searchableFields: string[],
    options: IFuzzyOptions = {}
  ): this {
    const {
      maxDistance = 1,
      prefixLength = 1,
      minWordLength = 3
    } = options;

    // Check if searchTerm exists
    if (!this.query?.searchTerm) {
      return this;
    }

    const searchTerm = String(this.query.searchTerm).trim();
    if (!searchTerm) {
      return this;
    }

    // Store for scoring/highlighting later
    this._searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    this._searchFields = searchableFields;

    // Generate patterns for each word
    const wordPatterns = this._searchTerms.map(word => {
      // Short words: exact match only (faster)
      if (word.length < minWordLength) {
        return escapeRegex(word);
      }

      // Keep prefix fixed (reduces false positives, improves performance)
      const prefix = word.slice(0, prefixLength);
      const rest = word.slice(prefixLength);

      // Generate fuzzy patterns for the rest
      const fuzzyPatterns = generateFuzzyPatterns(rest, maxDistance);
      const combinedPattern = fuzzyPatterns.join('|');

      // Combine: exact prefix + fuzzy rest
      return escapeRegex(prefix) + '(' + combinedPattern + ')';
    });

    // Build $or conditions for all fields and all words
    const orConditions: FilterQuery<T>[] = [];

    for (const field of searchableFields) {
      for (const pattern of wordPatterns) {
        orConditions.push({
          [field]: {
            $regex: pattern,
            $options: 'i' // case insensitive
          }
        } as FilterQuery<T>);
      }
    }

    // Apply to query
    if (orConditions.length > 0) {
      this.modelQuery = this.modelQuery.find({
        $or: orConditions
      });
    }

    // Add tracing attributes
    addSpanAttributes({
      'search.type': 'fuzzy',
      'search.maxDistance': maxDistance,
      'search.wordsCount': this._searchTerms.length,
      'search.fieldsCount': searchableFields.length,
    });

    return this;
  }

  /**
   * 📊 Enable relevance scoring with optional field boosts
   *
   * Calculates a relevance score for each result based on match quality.
   * Use with execute() to get scored results sorted by relevance.
   *
   * @param boosts - Optional field weight multipliers
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // Basic scoring - all fields equal weight
   * new QueryBuilder(Product.find(), { searchTerm: 'gaming laptop' })
   *   .fuzzySearch(['name', 'description'])
   *   .withScore()
   *   .execute();
   *
   * // With boosts - name matches worth 3x, tags worth 2x
   * new QueryBuilder(Product.find(), { searchTerm: 'gaming' })
   *   .fuzzySearch(['name', 'description', 'tags'])
   *   .withScore({ name: 3, description: 1, tags: 2 })
   *   .execute();
   * // Result: Products with "gaming" in name rank higher
   * ```
   */
  withScore(boosts: IScoreBoosts = {}): this {
    this._enableScoring = true;
    this._scoreBoosts = boosts;

    addSpanAttributes({
      'search.scoring': true,
      'search.boostFields': Object.keys(boosts).join(','),
    });

    return this;
  }

  /**
   * 🖍️ Enable highlighting of matched terms in results
   *
   * Wraps matched search terms in HTML tags for visual feedback.
   * Use with execute() to get highlighted results.
   *
   * @param fields - Fields to highlight (defaults to search fields)
   * @param options - Highlight configuration
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // Basic highlighting with <mark> tag
   * new QueryBuilder(Product.find(), { searchTerm: 'gaming laptop' })
   *   .fuzzySearch(['name', 'description'])
   *   .highlight()
   *   .execute();
   * // Result: { _highlights: { name: '<mark>Gaming</mark> <mark>Laptop</mark> Pro' } }
   *
   * // Custom tag and class
   * new QueryBuilder(Product.find(), { searchTerm: 'gaming' })
   *   .fuzzySearch(['name', 'description'])
   *   .highlight(['name'], { tag: 'span', className: 'search-match' })
   *   .execute();
   * // Result: { _highlights: { name: '<span class="search-match">Gaming</span> Laptop' } }
   * ```
   */
  highlight(
    fields?: string[],
    options: IHighlightOptions = {}
  ): this {
    this._highlightOptions = {
      tag: options.tag || 'mark',
      className: options.className || '',
      fragmentSize: options.fragmentSize || 100,
    };

    // Use provided fields or fall back to search fields
    if (fields && fields.length > 0) {
      this._searchFields = fields;
    }

    addSpanAttributes({
      'search.highlight': true,
      'search.highlightTag': this._highlightOptions.tag,
    });

    return this;
  }

  /**
   * 📏 Filter by numeric range
   *
   * Adds min/max filter for any numeric field.
   * Cleaner alternative to manual filter() for range queries.
   *
   * @param field - Field name to filter
   * @param min - Minimum value (inclusive), undefined to skip
   * @param max - Maximum value (inclusive), undefined to skip
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // Price range
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .range('price', 100, 500)
   *   .paginate();
   *
   * // Minimum only (4+ stars)
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .range('rating', 4)
   *   .paginate();
   *
   * // Maximum only (under $100)
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .range('price', undefined, 100)
   *   .paginate();
   * ```
   */
  range(field: string, min?: number, max?: number): this {
    const rangeQuery: Record<string, number> = {};

    if (min !== undefined && !isNaN(min)) {
      rangeQuery.$gte = min;
    }
    if (max !== undefined && !isNaN(max)) {
      rangeQuery.$lte = max;
    }

    if (Object.keys(rangeQuery).length > 0) {
      this.modelQuery = this.modelQuery.find({
        ...this.modelQuery.getFilter(),
        [field]: rangeQuery,
      } as FilterQuery<T>);

      addSpanAttributes({
        [`filter.${field}.min`]: min ?? 'none',
        [`filter.${field}.max`]: max ?? 'none',
      });
    }

    return this;
  }

  /**
   * 💰 Filter by price range (convenience method)
   *
   * Shorthand for range('price', min, max).
   * Also checks query params for minPrice/maxPrice.
   *
   * @param min - Minimum price, or undefined to use query.minPrice
   * @param max - Maximum price, or undefined to use query.maxPrice
   * @param field - Price field name (default: 'price')
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // Explicit range
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .priceRange(100, 500)
   *   .paginate();
   *
   * // From query params: ?minPrice=100&maxPrice=500
   * new QueryBuilder(Product.find(), req.query)
   *   .search(['name'])
   *   .priceRange()  // Uses req.query.minPrice and req.query.maxPrice
   *   .paginate();
   *
   * // Custom price field
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .priceRange(100, 500, 'salePrice')
   *   .paginate();
   * ```
   */
  priceRange(min?: number, max?: number, field: string = 'price'): this {
    const minPrice = min ?? (this.query?.minPrice ? Number(this.query.minPrice) : undefined);
    const maxPrice = max ?? (this.query?.maxPrice ? Number(this.query.maxPrice) : undefined);

    return this.range(field, minPrice, maxPrice);
  }

  /**
   * ⭐ Filter by rating range (convenience method)
   *
   * Shorthand for range('rating', min, max).
   * Also checks query params for minRating/maxRating.
   *
   * @param min - Minimum rating, or undefined to use query.minRating
   * @param max - Maximum rating (optional)
   * @param field - Rating field name (default: 'rating')
   * @returns this (chainable)
   *
   * @example
   * ```typescript
   * // 4+ stars
   * new QueryBuilder(Product.find(), query)
   *   .search(['name'])
   *   .ratingRange(4)
   *   .paginate();
   *
   * // From query params: ?minRating=4
   * new QueryBuilder(Product.find(), req.query)
   *   .search(['name'])
   *   .ratingRange()
   *   .paginate();
   * ```
   */
  ratingRange(min?: number, max?: number, field: string = 'rating'): this {
    const minRating = min ?? (this.query?.minRating ? Number(this.query.minRating) : undefined);
    const maxRating = max ?? (this.query?.maxRating ? Number(this.query.maxRating) : undefined);

    return this.range(field, minRating, maxRating);
  }

  /**
   * 🔮 Get autocomplete suggestions for a field
   *
   * Returns unique values that start with the given prefix.
   * Results are cached for 1 minute for performance.
   *
   * @param field - Field to get suggestions from
   * @param options - Autocomplete configuration
   * @returns Promise<string[]> - Array of suggestions
   *
   * @example
   * ```typescript
   * // Basic autocomplete
   * const suggestions = await new QueryBuilder(Product.find(), { searchTerm: 'lap' })
   *   .autocomplete('name');
   * // Returns: ['Laptop', 'Laptop Stand', 'Laptop Bag', ...]
   *
   * // With options
   * const suggestions = await new QueryBuilder(Product.find(), { searchTerm: 'sam' })
   *   .autocomplete('brand', { limit: 5, minLength: 2 });
   * // Returns: ['Samsung', 'Samsonite', ...]
   *
   * // In controller
   * app.get('/api/autocomplete', async (req, res) => {
   *   const { q, field } = req.query;
   *   const suggestions = await new QueryBuilder(Product.find(), { searchTerm: q })
   *     .autocomplete(field as string, { limit: 10 });
   *   res.json({ suggestions });
   * });
   * ```
   */
  async autocomplete(
    field: string,
    options: IAutocompleteOptions = {}
  ): Promise<string[]> {
    const { limit = 10, minLength = 2 } = options;

    const searchTerm = this.query?.searchTerm
      ? String(this.query.searchTerm).trim()
      : '';

    // Check minimum length
    if (searchTerm.length < minLength) {
      return [];
    }

    // Check cache first
    const cacheKey = `${(this.modelQuery.model as any)?.modelName}:${field}:${searchTerm.toLowerCase()}`;
    const cached = getCachedAutocomplete(cacheKey);
    if (cached) {
      addSpanAttributes({ 'autocomplete.cacheHit': true });
      return cached;
    }

    const startTime = Date.now();

    // Use aggregation for distinct values with prefix match
    const Model = this.modelQuery.model as Model<T>;
    const results = await Model.aggregate([
      {
        $match: {
          [field]: { $regex: `^${escapeRegex(searchTerm)}`, $options: 'i' }
        }
      },
      {
        $group: { _id: `$${field}` }
      },
      {
        $limit: limit
      },
      {
        $project: { value: '$_id', _id: 0 }
      }
    ]);

    const suggestions = results.map(r => r.value).filter(Boolean);

    // Cache results
    setCachedAutocomplete(cacheKey, suggestions);

    addSpanAttributes({
      'autocomplete.field': field,
      'autocomplete.prefix': searchTerm,
      'autocomplete.resultsCount': suggestions.length,
      'autocomplete.took': Date.now() - startTime,
      'autocomplete.cacheHit': false,
    });

    return suggestions;
  }

  /**
   * 🚀 Execute query with advanced search features
   *
   * Returns results with relevance scores and highlights (if enabled).
   * Use after fuzzySearch(), withScore(), and highlight().
   *
   * @returns Promise<IAdvancedSearchResult<T>> - Scored and highlighted results
   *
   * @example
   * ```typescript
   * // Full featured search
   * const result = await new QueryBuilder(Product.find(), { searchTerm: 'gaming lapto' })
   *   .fuzzySearch(['name', 'description', 'tags'])
   *   .withScore({ name: 3, description: 1, tags: 2 })
   *   .highlight(['name', 'description'])
   *   .filter()
   *   .priceRange(500, 2000)
   *   .paginate()
   *   .execute();
   *
   * // Result structure:
   * // {
   * //   data: [
   * //     {
   * //       doc: { _id: '...', name: 'Gaming Laptop Pro', ... },
   * //       _score: 85,
   * //       _highlights: {
   * //         name: '<mark>Gaming</mark> <mark>Laptop</mark> Pro',
   * //         description: 'Best <mark>gaming</mark> experience...'
   * //       }
   * //     },
   * //     ...
   * //   ],
   * //   pagination: { total: 45, page: 1, limit: 10, totalPage: 5 },
   * //   meta: { searchTerm: 'gaming lapto', took: 23 }
   * // }
   *
   * // Simple execute without scoring
   * const result = await new QueryBuilder(Product.find(), { searchTerm: 'laptop' })
   *   .fuzzySearch(['name'])
   *   .paginate()
   *   .execute();
   * ```
   */
  async execute(): Promise<IAdvancedSearchResult<T>> {
    const startTime = Date.now();

    // Execute the query
    const results = await this.modelQuery;

    // Get pagination info
    const pagination = await this.getPaginationInfo();

    // Process results with scoring and highlighting
    let scoredResults: IScoredResult<T>[];

    if (this._enableScoring || this._highlightOptions) {
      scoredResults = results.map(doc => {
        const result: IScoredResult<T> = {
          doc,
          _score: 0,
        };

        // Calculate score if enabled
        if (this._enableScoring && this._searchTerms.length > 0) {
          result._score = calculateScore(
            doc,
            this._searchTerms,
            this._searchFields,
            this._scoreBoosts
          );
        }

        // Apply highlighting if enabled
        if (this._highlightOptions && this._searchTerms.length > 0) {
          const highlights: Record<string, string> = {};
          const docObj = (doc as any).toObject ? (doc as any).toObject() : doc;

          for (const field of this._searchFields) {
            const value = getNestedValue(docObj, field);
            if (value) {
              highlights[field] = highlightText(
                String(value),
                this._searchTerms,
                this._highlightOptions
              );
            }
          }

          if (Object.keys(highlights).length > 0) {
            result._highlights = highlights;
          }
        }

        return result;
      });

      // Sort by score if scoring is enabled
      if (this._enableScoring) {
        scoredResults.sort((a, b) => b._score - a._score);
      }
    } else {
      // No scoring/highlighting - wrap documents
      scoredResults = results.map(doc => ({ doc, _score: 0 }));
    }

    const took = Date.now() - startTime;

    addSpanAttributes({
      'search.resultsCount': scoredResults.length,
      'search.took': took,
    });

    return {
      data: scoredResults,
      pagination,
      meta: {
        searchTerm: this._searchTerms.join(' ') || undefined,
        took,
      },
    };
  }

  /**
   * 📦 Execute and return plain documents (backward compatible)
   *
   * Same as execute() but returns plain documents without score wrapper.
   * Useful when you don't need scores but want highlighting.
   *
   * @returns Promise<{ data: T[], pagination: {...}, highlights?: Map }>
   *
   * @example
   * ```typescript
   * const { data, pagination } = await new QueryBuilder(Product.find(), query)
   *   .fuzzySearch(['name'])
   *   .paginate()
   *   .executeSimple();
   *
   * // data is T[] not IScoredResult<T>[]
   * ```
   */
  async executeSimple(): Promise<{
    data: T[];
    pagination: { total: number; page: number; limit: number; totalPage: number };
  }> {
    const result = await this.execute();
    return {
      data: result.data.map(r => r.doc),
      pagination: result.pagination,
    };
  }
}

export default QueryBuilder;
