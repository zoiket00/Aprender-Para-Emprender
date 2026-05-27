import type { RequestHandler } from "express";

const raw = process.env["ALLOWED_ORIGIN"] ?? "http://localhost:5173";
const ALLOWED_ORIGINS = new Set(raw.split(",").map((o) => o.trim()).filter(Boolean));

export const corsMiddleware: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : [...ALLOWED_ORIGINS][0] ?? "";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
