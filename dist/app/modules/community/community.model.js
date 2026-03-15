"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostReply = exports.PostLike = exports.Post = void 0;
const mongoose_1 = require("mongoose");
const postSchema = new mongoose_1.Schema({
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    course: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    image: { type: String },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
}, { timestamps: true });
postSchema.index({ author: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ course: 1 });
exports.Post = (0, mongoose_1.model)('Post', postSchema);
const postLikeSchema = new mongoose_1.Schema({
    post: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });
postLikeSchema.index({ post: 1, user: 1 }, { unique: true });
exports.PostLike = (0, mongoose_1.model)('PostLike', postLikeSchema);
const postReplySchema = new mongoose_1.Schema({
    post: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    parentReply: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'PostReply',
        default: null,
    },
}, { timestamps: true });
postReplySchema.index({ post: 1, createdAt: 1 });
postReplySchema.index({ author: 1 });
postReplySchema.index({ parentReply: 1 });
exports.PostReply = (0, mongoose_1.model)('PostReply', postReplySchema);
