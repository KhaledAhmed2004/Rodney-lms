import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { jwtHelper } from './jwtHelper';
import config from '../config';
import NodeCache from 'node-cache';
import {
  setOnline,
  setOffline,
  addUserRoom,
  removeUserRoom,
  updateLastActive,
  getUserRooms,
  getLastActive,
  incrConnCount,
  decrConnCount,
  clearUserRooms,
} from '../app/helpers/presenceHelper';

// -------------------------
// 🔹 Room Name Generators
// -------------------------
// USER_ROOM: unique private room for each user (for personal notifications)
// CHAT_ROOM: group room for each chat conversation
const USER_ROOM = (userId: string) => `user::${userId}`;
const CHAT_ROOM = (chatId: string) => `chat::${chatId}`;
const TYPING_KEY = (chatId: string, userId: string) =>
  `typing:${chatId}:${userId}`;
const TYPING_TTL_SECONDS = 5; // throttle window
const typingThrottle = new NodeCache({
  stdTTL: TYPING_TTL_SECONDS,
  checkperiod: 10,
  useClones: false,
});

// -------------------------
// 🔹 Main Socket Handler
// -------------------------
const socket = (io: Server) => {
  io.on('connection', async socket => {
    try {
      // -----------------------------
      // 🧩 STEP 1 — Authenticate Socket
      // -----------------------------
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query as any)?.token;

      if (!token || typeof token !== 'string') {
        logger.warn(
          colors.yellow('Socket connection without token. Disconnecting.'),
        );
        return socket.disconnect(true);
      }

      let payload: any;
      try {
        payload = jwtHelper.verifyToken(token, config.jwt.jwt_secret as any);
      } catch (err) {
        logger.warn(
          colors.red('Invalid JWT on socket connection. Disconnecting.'),
        );
        return socket.disconnect(true);
      }

      const userId = payload?.id as string;
      if (!userId) {
        logger.warn(colors.red('JWT payload missing id. Disconnecting.'));
        return socket.disconnect(true);
      }

      // -----------------------------
      // 🧩 STEP 2 — Mark Online & Join Personal Room
      // -----------------------------
      await setOnline(userId);
      await incrConnCount(userId);
      await updateLastActive(userId);
      socket.join(USER_ROOM(userId)); // join user’s personal private room
      logger.info(
        colors.blue(
          `✅ User ${userId} connected & joined ${USER_ROOM(userId)}`,
        ),
      );
      logEvent('socket_connected', `for user_id: ${userId}`);

      // ---------------------------------------------
      // 🔹 Handle Disconnect Event
      // ---------------------------------------------
      socket.on('disconnect', async () => {
        try {
          await updateLastActive(userId);
          const remaining = await decrConnCount(userId);
          const lastActive = await getLastActive(userId);

          // Only mark offline and broadcast if no other sessions remain
          if (!remaining || remaining <= 0) {
            await setOffline(userId);

            // Notify all chat rooms this user participated in
            try {
              const rooms = await getUserRooms(userId);
              for (const chatId of rooms || []) {
                io.to(CHAT_ROOM(String(chatId))).emit('USER_OFFLINE', {
                  userId,
                  chatId: String(chatId),
                  lastActive,
                });
              }
              await clearUserRooms(userId);
            } catch {}
          } else {
            logger.info(
              colors.yellow(
                `User ${userId} disconnected one session; ${remaining} session(s) remain.`,
              ),
            );
          }

          logger.info(colors.red(`User ${userId} disconnected`));
          logEvent('socket_disconnected', `for user_id: ${userId}`);
        } catch (err) {
          logger.error(
            colors.red(`❌ Disconnect handling error: ${String(err)}`),
          );
        }
      });
    } catch (err) {
      logger.error(colors.red(`Socket connection error: ${String(err)}`));
      try {
        socket.disconnect(true);
      } catch {}
    }
  });
};

// -------------------------
// 🔹 Helper: Log formatter
// -------------------------
const logEvent = (event: string, extra?: string) => {
  logger.info(`🔔 Event processed: ${event} ${extra || ''}`);
};

export const socketHelper = { socket };
