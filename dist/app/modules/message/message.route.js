"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const message_controller_1 = require("./message.controller");
const router = express_1.default.Router();
// Send message
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), (0, fileHandler_1.fileHandler)({
    maxFilesTotal: 10,
    enforceAllowedFields: ['image', 'media', 'doc'],
    perFieldMaxCount: { image: 5, media: 3, doc: 5 },
}), message_controller_1.MessageController.sendMessage);
// Mark all messages in a chat as read (fixed path BEFORE param path)
router.post('/chat/:chatId/read', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), message_controller_1.MessageController.markChatRead);
// Get messages by chat ID
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), message_controller_1.MessageController.getMessage);
exports.MessageRoutes = router;
