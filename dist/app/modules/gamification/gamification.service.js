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
exports.GamificationService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const gamification_model_1 = require("./gamification.model");
// ==================== LEADERBOARD ====================
const getLeaderboard = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const result = yield gamification_model_1.PointsLedger.aggregate([
        { $group: { _id: '$student', totalPoints: { $sum: '$points' } } },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'student',
                pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
            },
        },
        { $unwind: '$student' },
        {
            $lookup: {
                from: 'studentbadges',
                localField: '_id',
                foreignField: 'student',
                as: 'badges',
            },
        },
        {
            $project: {
                _id: 0,
                studentId: '$_id',
                name: '$student.name',
                profilePicture: '$student.profilePicture',
                totalPoints: 1,
                badgeCount: { $size: '$badges' },
            },
        },
        {
            $facet: {
                data: [
                    { $sort: { totalPoints: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ]);
    const data = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    const total = (_e = (_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.total[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
    };
});
// ==================== STUDENT POINTS ====================
const getMyPoints = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const totalResult = yield gamification_model_1.PointsLedger.aggregate([
        { $match: { student: new mongoose_1.Types.ObjectId(studentId) } },
        { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    const totalPoints = ((_a = totalResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const ledgerQuery = new QueryBuilder_1.default(gamification_model_1.PointsLedger.find({ student: studentId }).select('points reason description referenceId referenceType createdAt'), query)
        .sort()
        .paginate();
    const history = yield ledgerQuery.modelQuery;
    const pagination = yield ledgerQuery.getPaginationInfo();
    return { totalPoints, history, pagination };
});
// ==================== STUDENT BADGES ====================
const getMyBadges = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const [allBadges, studentBadges] = yield Promise.all([
        gamification_model_1.Badge.find({ isActive: true }).select('name description icon').lean(),
        gamification_model_1.StudentBadge.find({ student: studentId }).select('badge earnedAt').lean(),
    ]);
    const earnedMap = new Map(studentBadges.map(sb => [sb.badge.toString(), sb.earnedAt]));
    const badges = allBadges.map(badge => {
        const earnedAt = earnedMap.get(badge._id.toString()) || null;
        return {
            name: badge.name,
            icon: badge.icon,
            description: badge.description,
            earned: !!earnedAt,
            earnedAt,
        };
    });
    // Earned first (by earnedAt desc), then unearned
    badges.sort((a, b) => {
        if (a.earned && !b.earned)
            return -1;
        if (!a.earned && b.earned)
            return 1;
        if (a.earned && b.earned) {
            return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
        }
        return 0;
    });
    const earnedCount = badges.filter(b => b.earned).length;
    return {
        totalBadges: allBadges.length,
        earnedBadges: earnedCount,
        badges,
    };
});
const getMySummary = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const totalResult = yield gamification_model_1.PointsLedger.aggregate([
        { $match: { student: new mongoose_1.Types.ObjectId(studentId) } },
        { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    const totalPoints = ((_a = totalResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const totalBadges = yield gamification_model_1.StudentBadge.countDocuments({ student: studentId });
    const topBadge = yield gamification_model_1.StudentBadge.findOne({ student: studentId })
        .populate('badge', 'name icon')
        .sort({ earnedAt: -1 });
    return {
        totalPoints,
        totalBadges,
        topBadge: topBadge ? topBadge.badge : null,
    };
});
// ==================== BADGE CRUD (Admin) ====================
const getBadgeById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const badge = yield gamification_model_1.Badge.findById(id).select('-createdAt -updatedAt -__v');
    if (!badge) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Badge not found');
    }
    return badge;
});
const getAllBadges = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const badgeQuery = new QueryBuilder_1.default(gamification_model_1.Badge.find().select('-createdAt -updatedAt -__v'), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate();
    const data = yield badgeQuery.modelQuery;
    const pagination = yield badgeQuery.getPaginationInfo();
    return { pagination, data };
});
const updateBadge = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const existing = yield gamification_model_1.Badge.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Badge not found');
    }
    const updateData = {};
    if (payload.description !== undefined)
        updateData.description = payload.description;
    if (payload.isActive !== undefined)
        updateData.isActive = payload.isActive;
    if (((_a = payload.criteria) === null || _a === void 0 ? void 0 : _a.threshold) !== undefined) {
        updateData['criteria.threshold'] = payload.criteria.threshold;
    }
    if (payload.icon) {
        if (existing.icon)
            (0, fileHandler_1.deleteFile)(existing.icon).catch(() => { });
        updateData.icon = payload.icon;
    }
    if (Object.keys(updateData).length === 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No valid fields to update');
    }
    const result = yield gamification_model_1.Badge.findByIdAndUpdate(id, updateData, { new: true })
        .select('-createdAt -updatedAt -__v');
    return result;
});
// ==================== ADMIN STATS ====================
const getAdminStats = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [totalPointsDistributed, topEarners, mostEarnedBadges] = yield Promise.all([
        gamification_model_1.PointsLedger.aggregate([
            { $match: { points: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$points' } } },
        ]),
        gamification_model_1.PointsLedger.aggregate([
            { $group: { _id: '$student', total: { $sum: '$points' } } },
            { $sort: { total: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student',
                    pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
                },
            },
            { $unwind: '$student' },
        ]),
        gamification_model_1.StudentBadge.aggregate([
            { $group: { _id: '$badge', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'badges',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'badge',
                    pipeline: [{ $project: { name: 1, icon: 1 } }],
                },
            },
            { $unwind: '$badge' },
        ]),
    ]);
    return {
        totalPointsDistributed: ((_a = totalPointsDistributed[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        topEarners,
        mostEarnedBadges,
    };
});
exports.GamificationService = {
    getLeaderboard,
    getMyPoints,
    getMyBadges,
    getMySummary,
    getAllBadges,
    getBadgeById,
    updateBadge,
    getAdminStats,
};
