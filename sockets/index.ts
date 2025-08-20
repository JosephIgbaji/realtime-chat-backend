import type { Server, Socket } from "socket.io";
import { prisma } from "../prisma";
import { verifyJwt } from "../utils/jwt";
import dayjs from "dayjs";
import { canSend } from "../utils/rateLimiter";

type AuthedSocket = Socket & { userId?: string };

const presence = new Map<string, Set<string>>(); // roomId -> Set<userId>
const userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

export function setupSocket(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    const token =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.headers["authorization"] as string | undefined)?.replace("Bearer ", "");
    if (!token) return next(new Error("Unauthorized"));
    const payload = verifyJwt<{ id: string }>(token);
    if (!payload) return next(new Error("Unauthorized"));
    socket.userId = payload.id;
    next();
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const userId = socket.userId!;

    // track socket per user
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // broadcast user online
    io.emit("user_status", { userId, status: "online" });

    socket.on("join_room", async ({ roomId }: { roomId: string }) => {
      // ensure membership
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } },
        include: { room: true }
      });
      if (!membership) {
        socket.emit("error", { message: "Not a room member" });
        return;
      }
      socket.join(roomId);
      if (!presence.has(roomId)) presence.set(roomId, new Set());
      presence.get(roomId)!.add(userId);
      io.to(roomId).emit("user_status", { userId, status: "online" });
      socket.emit("joined_room", { roomId });
    });

    socket.on("typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      socket.to(roomId).emit("typing", { userId, roomId, isTyping });
    });

    socket.on("send_message", async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!content || !content.trim()) {
        socket.emit("error", { message: "Empty message" });
        return;
      }
      // rate limit: user+room key
      const key = `${userId}:${roomId}`;
      if (!canSend(key)) {
        socket.emit("error", { message: "Rate limit exceeded (max 5 messages / 10s)" });
        return;
      }

      // ensure membership
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } }
      });
      if (!membership) {
        socket.emit("error", { message: "Not a room member" });
        return;
      }

      const msg = await prisma.message.create({
        data: { roomId, senderId: userId, content }
      });

      // mark delivered for online members except sender
      const online = presence.get(roomId) || new Set();
      const deliverFor = Array.from(online).filter(uid => uid !== userId);
      await Promise.all(deliverFor.map(uid => prisma.messageReceipt.upsert({
        where: { messageId_userId_status: { messageId: msg.id, userId: uid, status: "DELIVERED" } },
        update: {},
        create: { messageId: msg.id, userId: uid, status: "DELIVERED" }
      })));

      io.to(roomId).emit("receive_message", msg);
    });

    socket.on("disconnect", async () => {
      // remove socket from map
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }

      // update last seen
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() }
      });

      // remove from presence sets
      for (const [roomId, users] of presence) {
        if (users.delete(userId)) {
          if (users.size === 0) presence.delete(roomId);
          io.to(roomId).emit("user_status", {
            userId,
            status: "offline",
            lastSeenAt: dayjs().toISOString()
          });
        }
      }
    });
  });
}
