import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

// Mockear supabase ANTES de importar el app
vi.mock("../config/supabase.js", () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
  supabaseConfig: {
    url: "https://test.supabase.co",
    anonKey: "test-anon-key",
  },
}));

// También mockear las dependencias que llaman al init de supabase
vi.mock("../middleware/rateLimit.js", () => ({
  apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  guardarLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createApp } from "../app.js";

describe("GET /health", () => {
  const app = createApp();

  it("devuelve status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("incluye timestamp ISO", async () => {
    const res = await request(app).get("/health");
    expect(res.body.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("GET /api/config", () => {
  const app = createApp();

  it("devuelve url y anonKey", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");
    expect(res.body).toHaveProperty("anonKey");
  });
});

describe("GET /api/ruta-inexistente", () => {
  const app = createApp();

  it("devuelve 401 por falta de auth (no 404 de HTML)", async () => {
    const res = await request(app).get("/api/xyz");
    // La ruta /api/* requiere auth primero, por eso 401 antes del 404
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
