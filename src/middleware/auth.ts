import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { users } from "../db.js";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken: RequestHandler = async (req, res, next) => {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return void res.status(401).json({ message: "Unauthorized: token missing" });
  try {
    const p = jwt.verify(token, env.jwtSecret) as { email: string };
    const u = await users.findOne({ email: p.email });
    if (!u) return void res.status(401).json({ message: "Unauthorized: user not found" });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
};

const only = (role: string): RequestHandler[] => [
  verifyToken,
  (req, res, next) => (req.user?.role === role ? next() : void res.status(403).json({ message: `Forbidden: ${role} access only` })),
];
export const verifyStudent = only("student");
export const verifyTutor = only("tutor");
export const verifyAdmin = only("admin");
