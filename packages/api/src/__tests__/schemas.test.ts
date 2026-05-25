import { describe, it, expect } from "vitest";
import {
  ParticipanteSchema,
  ParticipanteUpdateSchema,
  GuardarAsistenciaSchema,
  EliminarDiaSchema,
  FiltrosAsistenciaSchema,
} from "@ape/shared";

// ── ParticipanteSchema ────────────────────────────────────────────────────────

describe("ParticipanteSchema", () => {
  it("acepta datos válidos", () => {
    const r = ParticipanteSchema.safeParse({
      nombre_bebe: "Sofia",
      nombre_madre: "Ana López",
      fase: "CIDI",
      programa: "Buen Comienzo",
      edad: "12",
      dias: ["Lunes", "Miercoles"],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza nombre_bebe vacío", () => {
    const r = ParticipanteSchema.safeParse({ nombre_bebe: "", nombre_madre: "Ana" });
    expect(r.success).toBe(false);
  });

  it("rechaza nombre_madre ausente", () => {
    const r = ParticipanteSchema.safeParse({ nombre_bebe: "Sofia" });
    expect(r.success).toBe(false);
  });

  it("usa defaults para campos opcionales", () => {
    const r = ParticipanteSchema.safeParse({ nombre_bebe: "Sofia", nombre_madre: "Ana" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fase).toBe("");
      expect(r.data.programa).toBe("");
    }
  });
});

describe("ParticipanteUpdateSchema", () => {
  it("rechaza dias vacío", () => {
    const r = ParticipanteUpdateSchema.safeParse({
      nombre_bebe: "Sofia",
      nombre_madre: "Ana",
      dias: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza día inválido", () => {
    const r = ParticipanteUpdateSchema.safeParse({
      nombre_bebe: "Sofia",
      nombre_madre: "Ana",
      dias: ["Sabado"],
    });
    expect(r.success).toBe(false);
  });
});

// ── GuardarAsistenciaSchema ───────────────────────────────────────────────────

describe("GuardarAsistenciaSchema", () => {
  const base = {
    fecha: "2026-05-23",
    dia: "Lunes",
    registros: [{ NombreBebe: "Sofia" }],
  };

  it("acepta payload válido", () => {
    expect(GuardarAsistenciaSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza fecha con formato incorrecto", () => {
    const r = GuardarAsistenciaSchema.safeParse({ ...base, fecha: "23-05-2026" });
    expect(r.success).toBe(false);
  });

  it("rechaza fecha con texto libre", () => {
    const r = GuardarAsistenciaSchema.safeParse({ ...base, fecha: "hoy" });
    expect(r.success).toBe(false);
  });

  it("rechaza registros vacíos", () => {
    const r = GuardarAsistenciaSchema.safeParse({ ...base, registros: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza sin dia", () => {
    const r = GuardarAsistenciaSchema.safeParse({ fecha: "2026-05-23", registros: base.registros });
    expect(r.success).toBe(false);
  });
});

// ── EliminarDiaSchema ─────────────────────────────────────────────────────────

describe("EliminarDiaSchema", () => {
  it("acepta fecha y día válidos", () => {
    const r = EliminarDiaSchema.safeParse({ fecha: "2026-05-23", dia: "Viernes" });
    expect(r.success).toBe(true);
  });

  it("rechaza día que no es de la semana laboral", () => {
    const r = EliminarDiaSchema.safeParse({ fecha: "2026-05-23", dia: "Domingo" });
    expect(r.success).toBe(false);
  });

  it("rechaza fecha inválida", () => {
    const r = EliminarDiaSchema.safeParse({ fecha: "no-es-fecha", dia: "Lunes" });
    expect(r.success).toBe(false);
  });
});

// ── FiltrosAsistenciaSchema ───────────────────────────────────────────────────

describe("FiltrosAsistenciaSchema", () => {
  it("acepta objeto vacío (todos los filtros son opcionales)", () => {
    expect(FiltrosAsistenciaSchema.safeParse({}).success).toBe(true);
  });

  it("rechaza dia inválido", () => {
    const r = FiltrosAsistenciaSchema.safeParse({ dia: "Sabado" });
    expect(r.success).toBe(false);
  });

  it("acepta rango de fechas válido", () => {
    const r = FiltrosAsistenciaSchema.safeParse({ desde: "2026-01-01", hasta: "2026-05-31" });
    expect(r.success).toBe(true);
  });
});
