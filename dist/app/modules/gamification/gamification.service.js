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
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const gamification_interface_1 = require("./gamification.interface");
const gamification_model_1 = require("./gamification.model");
const user_model_1 = require("../user/user.model");
// ==================== LEADERBOARD ====================
const getLeaderboard = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const leaderboard = yield gamification_model_1.PointsLedger.aggregate([
        { $group: { _id: '$student', totalPoints: { $sum: '$points' } } },
        { $sort: { totalPoints: -1 } },
        { $skip: skip },
        { $limit: limit },
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
            $project: {
                _id: 0,
                studentId: '$_id',
                name: '$student.name',
                profilePicture: '$student.profilePicture',
                totalPoints: 1,
            },
        },
    ]);
    const totalStudents = yield gamification_model_1.PointsLedger.distinct('student');
    return {
        data: leaderboard,
        pagination: {
            page,
            limit,
            total: totalStudents.length,
            totalPage: Math.ceil(totalStudents.length / limit),
        },
    };
});
// ==================== STUDENT POINTS ====================
const getMyPoints = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const totalResult = yield gamification_model_1.PointsLedger.aggregate([
        { $match: { student: studentId } },
        { $group: { _id: null, total: { $sum: '$points' } } },
    ]);
    const totalPoints = ((_a = totalResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const ledgerQuery = new QueryBuilder_1.default(gamification_model_1.PointsLedger.find({ student: studentId }), query)
        .sort()
        .paginate();
    const history = yield ledgerQuery.modelQuery;
    const pagination = yield ledgerQuery.getPaginationInfo();
    return { totalPoints, history, pagination };
});
// ==================== STUDENT BADGES ====================
const getMyBadges = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const badges = yield gamification_model_1.StudentBadge.find({ student: studentId })
        .populate('badge')
        .sort({ earnedAt: -1 });
    return badges;
});
const getMySummary = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const totalResult = yield gamification_model_1.PointsLedger.aggregate([
        { $match: { student: studentId } },
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
const createBadge = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield gamification_model_1.Badge.findOne({ name: payload.name });
    if (existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Badge with this name already exists');
    }
    const result = yield gamification_model_1.Badge.create(payload);
    return result;
});
const getAllBadges = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const badgeQuery = new QueryBuilder_1.default(gamification_model_1.Badge.find(), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate();
    const data = yield badgeQuery.modelQuery;
    const pagination = yield badgeQuery.getPaginationInfo();
    return { pagination, data };
});
const updateBadge = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield gamification_model_1.Badge.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Badge not found');
    }
    const result = yield gamification_model_1.Badge.findByIdAndUpdate(id, payload, { new: true });
    return result;
});
const deleteBadge = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield gamification_model_1.Badge.findById(id);
    if (!existing) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Badge not found');
    }
    yield gamification_model_1.StudentBadge.deleteMany({ badge: id });
    yield gamification_model_1.Badge.findByIdAndDelete(id);
});
// ==================== ADMIN: Manual Points Adjust ====================
const adjustPoints = (studentId, points, description) => __awaiter(void 0, void 0, void 0, function* () {
    yield gamification_model_1.PointsLedger.create({
        student: studentId,
        points,
        reason: gamification_interface_1.POINTS_REASON.ADMIN_ADJUST,
        description,
    });
    yield user_model_1.User.findByIdAndUpdate(studentId, { $inc: { totalPoints: points } });
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
    createBadge,
    getAllBadges,
    updateBadge,
    deleteBadge,
    adjustPoints,
    getAdminStats,
};
