import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.get("/:roomId/messages", async (req: AuthRequest, res) => {
  const { roomId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit || 20), 100);

  // ensure user is member
  const member = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: req.user!.id, roomId } }
  });
  if (!member) return res.status(403).json({ error: "Not a room member" });

  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { receipts: true }
  });

  res.json({
    messages,
    nextCursor: messages.length ? messages[messages.length - 1].id : null
  });
});

const readSchema = z.object({
  roomId: z.string(),
  messageId: z.string()
});

router.post("/read", async (req: AuthRequest, res) => {
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { roomId, messageId } = parsed.data;

  const member = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: req.user!.id, roomId } }
  });
  if (!member) return res.status(403).json({ error: "Not a room member" });

  await prisma.messageReceipt.upsert({
    where: { messageId_userId_status: { messageId, userId: req.user!.id, status: "READ" } },
    update: {},
    create: { messageId, userId: req.user!.id, status: "READ" }
  });
  res.json({ ok: true });
});

router.post("/delivered", async (req: AuthRequest, res) => {
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { roomId, messageId } = parsed.data;

  const member = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: req.user!.id, roomId } }
  });
  if (!member) return res.status(403).json({ error: "Not a room member" });

  await prisma.messageReceipt.upsert({
    where: { messageId_userId_status: { messageId, userId: req.user!.id, status: "DELIVERED" } },
    update: {},
    create: { messageId, userId: req.user!.id, status: "DELIVERED" }
  });
  res.json({ ok: true });
});

export default router;
