import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "no_secret_key";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as string;
// const JWT_EXPIRES_IN: jwt.SignOptions["expiresIn"] = process.env.JWT_EXPIRES_IN || "7d";

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}
