import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { id: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const payload = verifyJwt<{ id: string }>(token);
  if (!payload) return res.status(401).json({ error: "Invalid token" });
  req.user = { id: payload.id };
  next();
}
