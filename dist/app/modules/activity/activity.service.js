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
exports.ActivityService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const activity_model_1 = require("./activity.model");
const user_model_1 = require("../user/user.model");
const getCalendar = (studentId, month, year) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const m = month !== null && month !== void 0 ? month : now.getMonth() + 1;
    const y = year !== null && year !== void 0 ? year : now.getFullYear();
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);
    const activeDays = yield activity_model_1.DailyActivity.find({
        student: studentId,
        date: { $gte: startDate, $lt: endDate },
    })
        .sort({ date: 1 })
        .select('date -_id')
        .lean();
    const days = activeDays.map(d => d.date);
    return { month: m, year: y, days };
});
const getStreak = (studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const user = yield user_model_1.User.findById(studentId).select('streak');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    return {
        current: ((_a = user.streak) === null || _a === void 0 ? void 0 : _a.current) || 0,
        longest: ((_b = user.streak) === null || _b === void 0 ? void 0 : _b.longest) || 0,
        lastActiveDate: ((_c = user.streak) === null || _c === void 0 ? void 0 : _c.lastActiveDate) || null,
    };
});
const getAdminOverview = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [todayActive, weekActive, monthActive, dailyStats] = yield Promise.all([
        activity_model_1.DailyActivity.countDocuments({ date: today, isActive: true }),
        activity_model_1.DailyActivity.distinct('student', {
            date: { $gte: sevenDaysAgo },
            isActive: true,
        }).then(r => r.length),
        activity_model_1.DailyActivity.distinct('student', {
            date: { $gte: thirtyDaysAgo },
            isActive: true,
        }).then(r => r.length),
        activity_model_1.DailyActivity.aggregate([
            { $match: { date: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: '$date',
                    activeUsers: { $sum: 1 },
                    totalLessons: { $sum: '$lessonsCompleted' },
                    totalQuizzes: { $sum: '$quizzesTaken' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);
    return {
        todayActive,
        weekActive,
        monthActive,
        dailyStats,
    };
});
exports.ActivityService = { getCalendar, getStreak, getAdminOverview };
