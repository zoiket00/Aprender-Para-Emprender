import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { TtlCache } from "../utils/cache.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

// Token → user — 5 min TTL (tokens de Supabase duran 1 hora)
const tokenCache = new TtlCache<string, { id: string; email?: string }>(5 * 60_000);

export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "No autorizado — sesión requerida" });
    return;
  }

  const cached = tokenCache.get(token);
  if (cached) {
    req.user = cached;
    next();
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

  const userData = { id: user.id, ...(user.email !== undefined && { email: user.email }) };
  tokenCache.set(token, userData);
  req.user = userData;
  next();
};
