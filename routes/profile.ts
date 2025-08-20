import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/profile", async (req: AuthRequest, res) => {
  const userId = req.user?.id; // Assuming user ID is set in req.user by auth middleware
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true }
  });
  
  if (!user) return res.status(404).json({ error: "User not found" });
  
  res.json(user);
}); 


export default router;
