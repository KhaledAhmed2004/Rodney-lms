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
const fileHandler_1 = require("../../middlewares/fileHandler");
const course_model_1 = require("../course/course.model");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const community_model_1 = require("./community.model");
const gamificationHelper_1 = require("../../helpers/gamificationHelper");
const gamification_interface_1 = require("../gamification/gamification.interface");
const validateCourseId = (courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const course = yield course_model_1.Course.findById(courseId).select('_id');
    if (!course) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Course not found');
    }
});
const createPost = (authorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (payload.courseId)
        yield validateCourseId(payload.courseId);
    const post = yield community_model_1.Post.create({
        author: authorId,
        title: payload.title,
        course: payload.courseId || undefined,
        content: payload.content,
        image: payload.image,
    });
    const result = (yield community_model_1.Post.findById(post._id)
        .select('_id title content course image createdAt')
        .populate('course', 'title')).toObject();
    // Gamification: award points for community post
    try {
        yield gamificationHelper_1.GamificationHelper.awardPoints(authorId, gamification_interface_1.POINTS_REASON.COMMUNITY_POST, post._id.toString(), 'Post');
        yield gamificationHelper_1.GamificationHelper.checkAndAwardBadges(authorId);
    }
    catch ( /* points failure should not block post creation */_b) { /* points failure should not block post creation */ }
    return Object.assign(Object.assign({}, result), { course: ((_a = result.course) === null || _a === void 0 ? void 0 : _a.title) || null });
});
const getAllPosts = (query, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const baseFilter = {};
    if (query.courseId) {
        baseFilter.course = query.courseId;
    }
    // Pre-filter: exclude posts by deleted users for accurate pagination
    const deletedUserIds = yield user_model_1.User.find({ status: user_1.USER_STATUS.DELETE }).distinct('_id');
    if (deletedUserIds.length > 0) {
        baseFilter.author = { $nin: deletedUserIds };
    }
    const postQuery = new QueryBuilder_1.default(community_model_1.Post.find(baseFilter)
        .select('author title course content image likesCount repliesCount createdAt')
        .populate('author', 'name profilePicture role')
        .populate('course', 'title'), query)
        .search(['title', 'content'])
        .sort()
        .paginate();
    const data = yield postQuery.modelQuery;
    const pagination = yield postQuery.getPaginationInfo();
    // Add isLiked flag for current user + flatten course to title string
    let postsWithLikeStatus;
    if (userId) {
        const postIds = data.map((p) => p._id);
        const userLikes = yield community_model_1.PostLike.find({
            post: { $in: postIds },
            user: userId,
        });
        const likedPostIds = new Set(userLikes.map(l => l.post.toString()));
        postsWithLikeStatus = data.map((p) => {
            var _a;
            return (Object.assign(Object.assign({}, p.toObject()), { course: ((_a = p.course) === null || _a === void 0 ? void 0 : _a.title) || null, isLiked: likedPostIds.has(p._id.toString()) }));
        });
    }
    else {
        postsWithLikeStatus = data.map((p) => {
            var _a;
            return (Object.assign(Object.assign({}, p.toObject()), { course: ((_a = p.course) === null || _a === void 0 ? void 0 : _a.title) || null }));
        });
    }
    return { pagination, data: postsWithLikeStatus };
});
const getPostById = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const post = yield community_model_1.Post.findById(id)
        .select('author title course content image likesCount repliesCount createdAt')
        .populate({
        path: 'author',
        select: 'name profilePicture role',
        match: { status: { $ne: 'DELETE' } },
    })
        .populate('course', 'title');
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    const allReplies = yield community_model_1.PostReply.find({ post: id })
        .select('author content parentReply createdAt')
        .populate({
        path: 'author',
        select: 'name profilePicture role',
        match: { status: { $ne: 'DELETE' } },
    })
        .sort({ createdAt: 1 })
        .lean();
    // Build nested reply structure (1-level)
    const topLevelReplies = [];
    const childrenMap = new Map();
    for (const reply of allReplies) {
        if (reply.parentReply) {
            const parentId = reply.parentReply.toString();
            if (!childrenMap.has(parentId))
                childrenMap.set(parentId, []);
            childrenMap.get(parentId).push(reply);
        }
        else {
            topLevelReplies.push(Object.assign(Object.assign({}, reply), { children: [] }));
        }
    }
    for (const topReply of topLevelReplies) {
        topReply.children = childrenMap.get(topReply._id.toString()) || [];
    }
    let isLiked = false;
    if (userId) {
        const like = yield community_model_1.PostLike.findOne({ post: id, user: userId });
        isLiked = !!like;
    }
    const postObj = post.toObject();
    return Object.assign(Object.assign({}, postObj), { course: ((_a = postObj.course) === null || _a === void 0 ? void 0 : _a.title) || null, isLiked, replies: topLevelReplies });
});
const deletePost = (id, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(id);
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    if (post.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to delete this post');
    }
    if (post.image)
        (0, fileHandler_1.deleteFile)(post.image).catch(() => { });
    yield community_model_1.Post.findByIdAndDelete(id);
    yield community_model_1.PostReply.deleteMany({ post: id });
    yield community_model_1.PostLike.deleteMany({ post: id });
});
const toggleLike = (postId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(postId);
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    // Atomic unlike — findOneAndDelete prevents race condition
    const removed = yield community_model_1.PostLike.findOneAndDelete({
        post: postId,
        user: userId,
    });
    // Recalculate count from source of truth (self-healing, no drift)
    const syncLikesCount = () => __awaiter(void 0, void 0, void 0, function* () {
        const count = yield community_model_1.PostLike.countDocuments({ post: postId });
        yield community_model_1.Post.findByIdAndUpdate(postId, { likesCount: count });
    });
    if (removed) {
        yield syncLikesCount();
        return { liked: false };
    }
    // Like — catch duplicate key (race condition: concurrent double-click)
    try {
        yield community_model_1.PostLike.create({ post: postId, user: userId });
        yield syncLikesCount();
        return { liked: true };
    }
    catch (err) {
        if (err.code === 11000) {
            return { liked: true };
        }
        throw err;
    }
});
const createReply = (postId, authorId, content, parentReplyId) => __awaiter(void 0, void 0, void 0, function* () {
    const post = yield community_model_1.Post.findById(postId);
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    if (parentReplyId) {
        const parentReply = yield community_model_1.PostReply.findById(parentReplyId);
        if (!parentReply) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Parent reply not found');
        }
        if (parentReply.post.toString() !== postId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Parent reply does not belong to this post');
        }
        if (parentReply.parentReply) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reply to a nested reply (max 1 level)');
        }
    }
    const reply = yield community_model_1.PostReply.create({
        post: postId,
        author: authorId,
        content,
        parentReply: parentReplyId || null,
    });
    const repliesCount = yield community_model_1.PostReply.countDocuments({ post: postId });
    yield community_model_1.Post.findByIdAndUpdate(postId, { repliesCount });
    return (yield community_model_1.PostReply.findById(reply._id).select('_id content parentReply createdAt'));
});
const deleteReply = (replyId, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    const reply = yield community_model_1.PostReply.findById(replyId);
    if (!reply) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Reply not found');
    }
    if (reply.author.toString() !== userId && userRole !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to delete this reply');
    }
    // Cascade delete: if top-level reply, delete its children too
    let deleteCount = 1;
    if (!reply.parentReply) {
        const childResult = yield community_model_1.PostReply.deleteMany({ parentReply: replyId });
        deleteCount += childResult.deletedCount;
    }
    yield community_model_1.PostReply.findByIdAndDelete(replyId);
    const repliesCount = yield community_model_1.PostReply.countDocuments({ post: reply.post });
    yield community_model_1.Post.findByIdAndUpdate(reply.post, { repliesCount });
});
const getMyPosts = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseFilter = {
        author: userId,
    };
    if (query.courseId) {
        baseFilter.course = query.courseId;
    }
    const postQuery = new QueryBuilder_1.default(community_model_1.Post.find(baseFilter)
        .select('author title course content image likesCount repliesCount createdAt')
        .populate({
        path: 'author',
        select: 'name profilePicture role',
        match: { status: { $ne: 'DELETE' } },
    })
        .populate('course', 'title'), query)
        .search(['title', 'content'])
        .sort()
        .paginate();
    const data = yield postQuery.modelQuery;
    const pagination = yield postQuery.getPaginationInfo();
    const postIds = data.map((p) => p._id);
    const userLikes = yield community_model_1.PostLike.find({
        post: { $in: postIds },
        user: userId,
    });
    const likedPostIds = new Set(userLikes.map(l => l.post.toString()));
    const postsWithLikeStatus = data.map((p) => {
        var _a;
        return (Object.assign(Object.assign({}, p.toObject()), { course: ((_a = p.course) === null || _a === void 0 ? void 0 : _a.title) || null, isLiked: likedPostIds.has(p._id.toString()) }));
    });
    return { pagination, data: postsWithLikeStatus };
});
const updatePost = (postId, userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const post = yield community_model_1.Post.findById(postId);
    if (!post) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Post not found');
    }
    if (post.author.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to edit this post');
    }
    const update = {};
    const unset = {};
    if (payload.title !== undefined)
        update.title = payload.title;
    if (payload.content !== undefined)
        update.content = payload.content;
    if (payload.removeImage && !payload.image) {
        if (post.image)
            (0, fileHandler_1.deleteFile)(post.image).catch(() => { });
        unset.image = 1;
    }
    else if (payload.image) {
        if (post.image)
            (0, fileHandler_1.deleteFile)(post.image).catch(() => { });
        update.image = payload.image;
    }
    if (payload.courseId === null) {
        unset.course = 1;
    }
    else if (payload.courseId !== undefined) {
        yield validateCourseId(payload.courseId);
        update.course = payload.courseId;
    }
    const updateQuery = {};
    if (Object.keys(update).length > 0)
        updateQuery.$set = update;
    if (Object.keys(unset).length > 0)
        updateQuery.$unset = unset;
    const updated = yield community_model_1.Post.findByIdAndUpdate(postId, updateQuery, {
        new: true,
    })
        .select('_id title content course image updatedAt')
        .populate('course', 'title');
    const result = updated.toObject();
    return Object.assign(Object.assign({}, result), { course: ((_a = result.course) === null || _a === void 0 ? void 0 : _a.title) || null });
});
const updateReply = (replyId, userId, content) => __awaiter(void 0, void 0, void 0, function* () {
    const reply = yield community_model_1.PostReply.findById(replyId);
    if (!reply) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Reply not found');
    }
    if (reply.author.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to edit this reply');
    }
    const updated = yield community_model_1.PostReply.findByIdAndUpdate(replyId, { content }, { new: true }).select('_id content updatedAt');
    return updated;
});
exports.CommunityService = {
    createPost,
    getAllPosts,
    getPostById,
    deletePost,
    toggleLike,
    createReply,
    deleteReply,
    getMyPosts,
    updatePost,
    updateReply,
};
