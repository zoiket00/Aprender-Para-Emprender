import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./middleware/cors.js";
import { requireAuth } from "./middleware/auth.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { supabaseConfig } from "./config/supabase.js";
import participantesRouter from "./routes/participantes.js";
import asistenciaRouter from "./routes/asistencia.js";
import exportarRouter from "./routes/exportar.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(apiLimiter);
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

  app.get("/api/config", (_req, res) => {
    res.json({ url: supabaseConfig.url, anonKey: supabaseConfig.anonKey });
  });

  app.use("/api/participantes", requireAuth, participantesRouter);
  app.use("/api/asistencia", requireAuth, asistenciaRouter);
  app.use("/api/exportar", requireAuth, exportarRouter);

  app.all("/api/*", requireAuth, (req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
  });

  return app;
}
