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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityHelper = void 0;
const activity_model_1 = require("../modules/activity/activity.model");
const user_model_1 = require("../modules/user/user.model");
const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};
const trackActivity = (studentId_1, type_1, ...args_1) => __awaiter(void 0, [studentId_1, type_1, ...args_1], void 0, function* (studentId, type, points = 0) {
    const today = getToday();
    const updateFields = {};
    if (type === 'lesson')
        updateFields.lessonsCompleted = 1;
    if (type === 'quiz')
        updateFields.quizzesTaken = 1;
    if (points > 0)
        updateFields.pointsEarned = points;
    // Upsert daily activity
    yield activity_model_1.DailyActivity.findOneAndUpdate({ student: studentId, date: today }, {
        $inc: updateFields,
        $set: { isActive: true },
        $setOnInsert: { student: studentId, date: today },
    }, { upsert: true, new: true });
    // Update streak
    yield updateStreak(studentId, today);
});
const updateStreak = (studentId, today) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(studentId).select('streak');
    if (!user)
        return;
    const streak = user.streak || {
        current: 0,
        longest: 0,
        lastActiveDate: null,
    };
    const lastActive = streak.lastActiveDate
        ? new Date(streak.lastActiveDate)
        : null;
    let newCurrent = streak.current;
    if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            // Same day, no change
            return;
        }
        else if (diffDays === 1) {
            // Consecutive day
            newCurrent = streak.current + 1;
        }
        else {
            // Streak broken
            newCurrent = 1;
        }
    }
    else {
        // First activity ever
        newCurrent = 1;
    }
    const newLongest = Math.max(streak.longest, newCurrent);
    yield user_model_1.User.findByIdAndUpdate(studentId, {
        $set: {
            'streak.current': newCurrent,
            'streak.longest': newLongest,
            'streak.lastActiveDate': today,
        },
    });
});
exports.ActivityHelper = { trackActivity, updateStreak };
