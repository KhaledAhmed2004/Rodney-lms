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
exports.MessageController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const message_service_1 = require("./message.service");
/**
 * Build attachments array and determine message type from fileHandler output.
 * fileHandler injects file URLs into req.body as string or string[] per field.
 */
const buildAttachmentsAndType = (body) => {
    const toArray = (val) => Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
    const images = toArray(body.image);
    const media = toArray(body.media);
    const docs = toArray(body.doc);
    const attachments = [
        ...images.map(url => ({
            type: 'image',
            url,
            name: url.split('/').pop(),
        })),
        ...media.map(url => {
            const lower = url.toLowerCase();
            const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
            return {
                type: (isVideo ? 'video' : 'audio'),
                url,
                name: url.split('/').pop(),
            };
        }),
        ...docs.map(url => ({
            type: 'file',
            url,
            name: url.split('/').pop(),
        })),
    ];
    const hasFiles = images.length > 0 || media.length > 0 || docs.length > 0;
    const hasMultipleTypes = [images.length > 0, media.length > 0, docs.length > 0, !!body.text].filter(Boolean).length > 1;
    let type = 'text';
    if (hasMultipleTypes) {
        type = 'mixed';
    }
    else if (images.length > 0) {
        type = 'image';
    }
    else if (media.length > 0) {
        type = 'media';
    }
    else if (docs.length > 0) {
        type = 'doc';
    }
    return { attachments, type, hasFiles };
};
const sendMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { attachments, type } = buildAttachmentsAndType(req.body);
    const payload = Object.assign(Object.assign({}, req.body), { sender: userId, attachments,
        type });
    // Clean up raw file fields injected by fileHandler
    delete payload.image;
    delete payload.media;
    delete payload.doc;
    const message = yield message_service_1.MessageService.sendMessageToDB(payload);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Send Message Successfully',
        data: message,
    });
}));
const getMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    const messages = yield message_service_1.MessageService.getMessageFromDB(req.user, id, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Message Retrieve Successfully',
        data: messages,
    });
}));
const markChatRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = req.params.chatId;
    const userId = req.user.id;
    const result = yield message_service_1.MessageService.markChatAsRead(chatId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Chat messages marked as read',
        data: result,
    });
}));
exports.MessageController = { sendMessage, getMessage, markChatRead };
