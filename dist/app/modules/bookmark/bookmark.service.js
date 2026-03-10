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
exports.BookmarkService = void 0;
const bookmark_model_1 = require("./bookmark.model");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const toggleBookmarkIntoDB = (userId, targetId, targetModel) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch existing bookmark only; generic across models
    const existingBookmark = yield bookmark_model_1.Bookmark.findOne({
        user: userId,
        target: targetId,
        targetModel,
    });
    // Remove bookmark or create new bookmark in parallel-safe way
    if (existingBookmark) {
        const removedBookmark = yield bookmark_model_1.Bookmark.findOneAndDelete({
            _id: existingBookmark._id,
        });
        return {
            message: 'Bookmark removed successfully',
            bookmark: removedBookmark,
        };
    }
    else {
        const newBookmark = yield bookmark_model_1.Bookmark.findOneAndUpdate({ user: userId, target: targetId, targetModel }, { user: userId, target: targetId, targetModel }, { new: true, upsert: true });
        if (!newBookmark) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.EXPECTATION_FAILED, 'Failed to add bookmark');
        }
        return {
            message: 'Bookmark added successfully',
            bookmark: newBookmark,
        };
    }
});
const getUserBookmarksFromDB = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    // Start with base query
    let modelQuery = bookmark_model_1.Bookmark.find({ user: userId });
    // Allow filtering by targetModel; exclude Task-specific filters from generic filter()
    const modifiedQuery = Object.assign({}, query);
    delete modifiedQuery.category;
    delete modifiedQuery.searchTerm;
    // Create QueryBuilder instance
    const queryBuilder = new QueryBuilder_1.default(modelQuery, modifiedQuery)
        .filter()
        .dateFilter()
        .sort()
        .paginate()
        .fields();
    // Populate target; apply Task-specific filters only when targetModel === 'Task'
    if (query.targetModel === 'Task') {
        if (query.category && query.searchTerm) {
            queryBuilder.searchInPopulatedFields('target', ['title', 'description', 'taskLocation'], query.searchTerm, { taskCategory: query.category });
        }
        else if (query.category) {
            queryBuilder.populateWithMatch('target', { taskCategory: query.category });
        }
        else if (query.searchTerm) {
            queryBuilder.searchInPopulatedFields('target', ['title', 'description', 'taskLocation'], query.searchTerm);
        }
        else {
            queryBuilder.populate(['target']);
        }
    }
    else {
        // Generic population for other models
        queryBuilder.populate(['target']);
    }
    // Get filtered results with custom pagination
    const result = yield queryBuilder.getFilteredResults(['target']);
    return result;
});
exports.BookmarkService = {
    toggleBookmarkIntoDB,
    getUserBookmarksFromDB,
};
