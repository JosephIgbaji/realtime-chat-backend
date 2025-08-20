import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.use(requireAuth);

const createRoomSchema = z.object({
  name: z.string().min(1),
  isPrivate: z.boolean().optional().default(false)
});

router.post("/", async (req: AuthRequest, res) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, isPrivate } = parsed.data;
  const inviteCode = isPrivate ? uuidv4() : null;
  const room = await prisma.room.create({
    data: { name, isPrivate, inviteCode }
  });
  // add creator to members
  await prisma.roomMember.create({
    data: { roomId: room.id, userId: req.user!.id }
  });
  res.json({ room });
});

const joinSchema = z.object({
  inviteCode: z.string().optional(),
  roomId: z.string().optional()
}).refine(d => d.inviteCode || d.roomId, { message: "inviteCode or roomId required" });

router.post("/join", async (req: AuthRequest, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let room = null;
  if (parsed.data.inviteCode) {
    room = await prisma.room.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  } else if (parsed.data.roomId) {
    room = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
  }
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (room.isPrivate && !room.inviteCode) {
    return res.status(403).json({ error: "Private room requires invite" });
  }

  // upsert membership
  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: req.user!.id, roomId: room.id } },
    create: { userId: req.user!.id, roomId: room.id },
    update: {}
  });

  res.json({ room });
});

router.get("/mine", async (req: AuthRequest, res) => {
  const rooms = await prisma.roomMember.findMany({
    where: { userId: req.user!.id },
    include: { room: true }
  });
  res.json({ rooms: rooms.map(rm => rm.room) });
});

export default router;
