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
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const logger_1 = require("../shared/logger");
const jwtHelper_1 = require("./jwtHelper");
const config_1 = __importDefault(require("../config"));
const node_cache_1 = __importDefault(require("node-cache"));
const presenceHelper_1 = require("../app/helpers/presenceHelper");
// -------------------------
// 🔹 Room Name Generators
// -------------------------
// USER_ROOM: unique private room for each user (for personal notifications)
// CHAT_ROOM: group room for each chat conversation
const USER_ROOM = (userId) => `user::${userId}`;
const CHAT_ROOM = (chatId) => `chat::${chatId}`;
const TYPING_KEY = (chatId, userId) => `typing:${chatId}:${userId}`;
const TYPING_TTL_SECONDS = 5; // throttle window
const typingThrottle = new node_cache_1.default({
    stdTTL: TYPING_TTL_SECONDS,
    checkperiod: 10,
    useClones: false,
});
// -------------------------
// 🔹 Main Socket Handler
// -------------------------
const socket = (io) => {
    io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            // -----------------------------
            // 🧩 STEP 1 — Authenticate Socket
            // -----------------------------
            const token = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) ||
                ((_b = socket.handshake.query) === null || _b === void 0 ? void 0 : _b.token);
            if (!token || typeof token !== 'string') {
                logger_1.logger.warn(colors_1.default.yellow('Socket connection without token. Disconnecting.'));
                return socket.disconnect(true);
            }
            let payload;
            try {
                payload = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
            }
            catch (err) {
                logger_1.logger.warn(colors_1.default.red('Invalid JWT on socket connection. Disconnecting.'));
                return socket.disconnect(true);
            }
            const userId = payload === null || payload === void 0 ? void 0 : payload.id;
            if (!userId) {
                logger_1.logger.warn(colors_1.default.red('JWT payload missing id. Disconnecting.'));
                return socket.disconnect(true);
            }
            // -----------------------------
            // 🧩 STEP 2 — Mark Online & Join Personal Room
            // -----------------------------
            yield (0, presenceHelper_1.setOnline)(userId);
            yield (0, presenceHelper_1.incrConnCount)(userId);
            yield (0, presenceHelper_1.updateLastActive)(userId);
            socket.join(USER_ROOM(userId)); // join user’s personal private room
            logger_1.logger.info(colors_1.default.blue(`✅ User ${userId} connected & joined ${USER_ROOM(userId)}`));
            logEvent('socket_connected', `for user_id: ${userId}`);
            // ---------------------------------------------
            // 🔹 Handle Disconnect Event
            // ---------------------------------------------
            socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    yield (0, presenceHelper_1.updateLastActive)(userId);
                    const remaining = yield (0, presenceHelper_1.decrConnCount)(userId);
                    const lastActive = yield (0, presenceHelper_1.getLastActive)(userId);
                    // Only mark offline and broadcast if no other sessions remain
                    if (!remaining || remaining <= 0) {
                        yield (0, presenceHelper_1.setOffline)(userId);
                        // Notify all chat rooms this user participated in
                        try {
                            const rooms = yield (0, presenceHelper_1.getUserRooms)(userId);
                            for (const chatId of rooms || []) {
                                io.to(CHAT_ROOM(String(chatId))).emit('USER_OFFLINE', {
                                    userId,
                                    chatId: String(chatId),
                                    lastActive,
                                });
                            }
                            yield (0, presenceHelper_1.clearUserRooms)(userId);
                        }
                        catch (_a) { }
                    }
                    else {
                        logger_1.logger.info(colors_1.default.yellow(`User ${userId} disconnected one session; ${remaining} session(s) remain.`));
                    }
                    logger_1.logger.info(colors_1.default.red(`User ${userId} disconnected`));
                    logEvent('socket_disconnected', `for user_id: ${userId}`);
                }
                catch (err) {
                    logger_1.logger.error(colors_1.default.red(`❌ Disconnect handling error: ${String(err)}`));
                }
            }));
        }
        catch (err) {
            logger_1.logger.error(colors_1.default.red(`Socket connection error: ${String(err)}`));
            try {
                socket.disconnect(true);
            }
            catch (_c) { }
        }
    }));
};
// -------------------------
// 🔹 Helper: Log formatter
// -------------------------
const logEvent = (event, extra) => {
    logger_1.logger.info(`🔔 Event processed: ${event} ${extra || ''}`);
};
exports.socketHelper = { socket };
