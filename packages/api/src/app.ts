import express from "express";
import helmet from "helmet";
import path from "path";
import { corsMiddleware } from "./middleware/cors.js";
import { requireAuth } from "./middleware/auth.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { supabaseConfig } from "./config/supabase.js";
import participantesRouter from "./routes/participantes.js";
import asistenciaRouter from "./routes/asistencia.js";
import exportarRouter from "./routes/exportar.js";

const IS_PROD = process.env["NODE_ENV"] === "production";
// En producción: packages/api/dist/ → ../../../packages/web/dist (3 niveles al root del monorepo)
const WEB_DIST = path.join(__dirname, "../../../packages/web/dist");

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:    ["'self'"],
          scriptSrc:     ["'self'"],
          styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc:       ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc:        ["'self'", "data:"],
          connectSrc:    ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
          workerSrc:     ["'self'", "blob:"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  app.use(corsMiddleware);
  app.use(apiLimiter);
  app.use(express.json({ limit: "5mb" }));

  // Frontend estático (solo en producción — en dev usa el servidor Vite)
  if (IS_PROD) {
    app.use(express.static(WEB_DIST));
  }

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

  // SPA fallback: todas las rutas no-API devuelven el index.html del frontend
  if (IS_PROD) {
    app.get("*", (_req, res) => {
      res.sendFile(path.join(WEB_DIST, "index.html"));
    });
  }

  return app;
}
