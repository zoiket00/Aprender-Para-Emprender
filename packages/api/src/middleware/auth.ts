import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "No autorizado — sesión requerida" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Sesión inválida o expirada" });
    return;
  }

  req.user = { id: user.id, ...(user.email !== undefined && { email: user.email }) };
  next();
};
