"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bookmark = void 0;
const mongoose_1 = require("mongoose");
const bookmarkSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    target: {
        type: mongoose_1.Schema.Types.ObjectId,
        refPath: 'targetModel',
        required: true,
    },
    targetModel: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Prevent duplicate bookmarks: same user cannot bookmark same target twice per model
bookmarkSchema.index({ user: 1, target: 1, targetModel: 1 }, { unique: true });
exports.Bookmark = (0, mongoose_1.model)('Bookmark', bookmarkSchema);
