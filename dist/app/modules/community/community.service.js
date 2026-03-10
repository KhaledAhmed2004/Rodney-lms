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
exports.CommunityService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const community_model_1 = require("./community.model");
const createPost = (authorId, content, image) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.create({ author: authorId, content, image });
    return post;
});
const getAllPosts = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const postQuery = new QueryBuilder_1.default(community_model_1.Post.find({ status: 'ACTIVE' }).populate('author', 'name profilePicture'), query)
        .search(['content'])
        .sort()
        .paginate();
    const data = yield postQuery.modelQuery;
    const pagination = yield postQuery.getPaginationInfo();
    // Add isLiked flag for current user
    let postsWithLikeStatus = data;
    if (userId) {
        const postIds = data.map((p) => p._id);
        const userLikes = yield community_model_1.PostLike.find({
            post: { $in: postIds },
            user: userId,
        });
        const likedPostIds = new Set(userLikes.map(l => l.post.toString()));
        postsWithLikeStatus = data.map((p) => (Object.assign(Object.assign({}, p.toObject()), { isLiked: likedPostIds.has(p._id.toString()) })));
    }
    return { pagination, data: postsWithLikeStatus };
});
const getPostById = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(id).populate('author', 'name profilePicture');
    if (!post || post.status !== 'ACTIVE') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    const replies = yield community_model_1.PostReply.find({ post: id, status: 'ACTIVE' })
        .populate('author', 'name profilePicture')
        .sort({ createdAt: 1 });
    let isLiked = false;
    if (userId) {
        const like = yield community_model_1.PostLike.findOne({ post: id, user: userId });
        isLiked = !!like;
    }
    return Object.assign(Object.assign({}, post.toObject()), { isLiked,
        replies });
});
const deletePost = (id, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(id);
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    if (post.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to delete this post');
    }
    yield community_model_1.Post.findByIdAndUpdate(id, { status: 'DELETED' });
    yield community_model_1.PostReply.updateMany({ post: id }, { status: 'DELETED' });
});
const toggleLike = (postId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(postId);
    if (!post || post.status !== 'ACTIVE') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    const existingLike = yield community_model_1.PostLike.findOne({ post: postId, user: userId });
    if (existingLike) {
        yield community_model_1.PostLike.findByIdAndDelete(existingLike._id);
        yield community_model_1.Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
        return { liked: false };
    }
    else {
        yield community_model_1.PostLike.create({ post: postId, user: userId });
        yield community_model_1.Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
        return { liked: true };
    }
});
const createReply = (postId, authorId, content) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(postId);
    if (!post || post.status !== 'ACTIVE') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    const reply = yield community_model_1.PostReply.create({
        post: postId,
        author: authorId,
        content,
    });
    yield community_model_1.Post.findByIdAndUpdate(postId, { $inc: { repliesCount: 1 } });
    return reply;
});
const deleteReply = (replyId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const reply = yield community_model_1.PostReply.findById(replyId);
    if (!reply) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Reply not found');
    }
    if (reply.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to delete this reply');
    }
    yield community_model_1.PostReply.findByIdAndUpdate(replyId, { status: 'DELETED' });
    yield community_model_1.Post.findByIdAndUpdate(reply.post, { $inc: { repliesCount: -1 } });
});
// Admin
const getFlaggedPosts = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const postQuery = new QueryBuilder_1.default(community_model_1.Post.find({ status: 'HIDDEN' }).populate('author', 'name email profilePicture'), query)
        .sort()
        .paginate();
    const data = yield postQuery.modelQuery;
    const pagination = yield postQuery.getPaginationInfo();
    return { pagination, data };
});
exports.CommunityService = {
    createPost,
    getAllPosts,
    getPostById,
    deletePost,
    toggleLike,
    createReply,
    deleteReply,
    getFlaggedPosts,
};
