import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { findCanonical, normName } from "../utils/fuzzy.js";
import {
  ParticipanteSchema,
  ParticipanteUpdateSchema,
  DIAS_VALIDOS,
} from "@ape/shared";

const router = Router();

const DIAS = DIAS_VALIDOS as readonly string[];

function leerFase(obj: Record<string, unknown>): string {
  return String(
    obj["Fase"] ?? obj["fase"] ?? obj["InstitucionMadre"] ?? obj["Institucion"] ?? obj["institucion"] ?? ""
  ).trim();
}

/** GET /api/participantes/sheet/:dia — CSV del día para la app de asistencia */
router.get("/sheet/:dia", async (req, res) => {
  const { dia } = req.params;
  if (!DIAS.includes(dia ?? "")) {
    res.status(404).json({ error: `Día no válido: ${dia}` });
    return;
  }

  const { data: asistencias, error: errA } = await supabase
    .from("asistencias")
    .select("bebe_id")
    .eq("dia", dia);

  if (errA) {
    res.status(500).json({ error: errA.message });
    return;
  }
  if (!asistencias?.length) {
    res.type("text/csv").send("Nombre Bebe,Nombre Madre,Fase,Institucion,Programa,Edad\n");
    return;
  }

  const ids = asistencias.map((a) => a.bebe_id);
  const { data: bebes, error: errB } = await supabase
    .from("bebes")
    .select("nombre_bebe, nombre_madre, fase, programa, edad")
    .in("id", ids)
    .order("nombre_bebe", { ascending: true });

  if (errB) {
    res.status(500).json({ error: errB.message });
    return;
  }

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") ? `"${s}"` : s;
  };

  const csv = [
    "Nombre Bebe,Nombre Madre,Fase,Institucion,Programa,Edad",
    ...(bebes ?? []).map((b) =>
      [b.nombre_bebe, b.nombre_madre, b.fase, b.fase, b.programa, b.edad]
        .map(escape)
        .join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.send(csv);
});

/** GET /api/participantes — todos los participantes */
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("bebes")
    .select("id, nombre_bebe, nombre_madre, fase, programa, edad")
    .order("nombre_bebe", { ascending: true })
    .limit(5000);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    bebes: (data ?? []).map((b) => ({
      id: b.id,
      NombreBebe: b.nombre_bebe,
      NombreMadre: b.nombre_madre,
      Fase: b.fase,
      InstitucionMadre: b.fase,
      ProgramaMadre: b.programa,
      Edad: b.edad,
    })),
  });
});

/** GET /api/participantes/dias — días disponibles en el catálogo */
router.get("/dias-catalogo", async (_req, res) => {
  const { data, error } = await supabase.from("asistencias").select("dia");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const orden = [...DIAS_VALIDOS];
  const dias = [...new Set((data ?? []).map((r) => r.dia))].sort(
    (a, b) => orden.indexOf(a) - orden.indexOf(b)
  );
  res.json({ dias });
});

/** GET /api/participantes/asistencia-dias — mapa nombre → días */
router.get("/asistencia-dias", async (_req, res) => {
  const { data, error } = await supabase
    .from("asistencias")
    .select("dia, bebes(nombre_bebe)")
    .limit(10000);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const diasMap: Record<string, string[]> = {};
  (data ?? []).forEach((row: { dia: string; bebes: { nombre_bebe: string }[] | { nombre_bebe: string } | null }) => {
    const bebesData = Array.isArray(row.bebes) ? row.bebes[0] : row.bebes;
    const nombre = bebesData?.nombre_bebe;
    if (!nombre) return;
    if (!diasMap[nombre]) diasMap[nombre] = [];
    if (!diasMap[nombre]!.includes(row.dia)) diasMap[nombre]!.push(row.dia);
  });

  res.json({ ok: true, diasMap });
});

/** POST /api/participantes — agregar o actualizar participante */
router.post("/", async (req, res) => {
  const parsed = ParticipanteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const { nombre_bebe, nombre_madre, fase, programa, edad, dias } = parsed.data;

  const { data: existing } = await supabase
    .from("bebes")
    .select("id")
    .ilike("nombre_bebe", nombre_bebe.trim())
    .ilike("nombre_madre", nombre_madre.trim())
    .maybeSingle();

  let bebeId: string;

  if (existing) {
    const { error } = await supabase
      .from("bebes")
      .update({ nombre_madre, fase, programa, edad })
      .eq("id", existing.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    bebeId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("bebes")
      .insert({ nombre_bebe: nombre_bebe.trim(), nombre_madre, fase, programa, edad })
      .select("id")
      .single();
    if (error || !inserted) {
      res.status(500).json({ error: error?.message ?? "Error al insertar" });
      return;
    }
    bebeId = inserted.id;
  }

  if (dias && dias.length > 0) {
    const { error } = await supabase
      .from("asistencias")
      .upsert(
        dias.map((dia) => ({ bebe_id: bebeId, dia })),
        { onConflict: "bebe_id,dia", ignoreDuplicates: true }
      );
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  res.json({ ok: true, id: bebeId });
});

/** PUT /api/participantes/:id — editar participante */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = ParticipanteUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const { nombre_bebe, nombre_madre, fase, programa, edad, dias } = parsed.data;

  const { error: errUp } = await supabase
    .from("bebes")
    .update({ nombre_bebe: nombre_bebe.trim(), nombre_madre, fase, programa, edad })
    .eq("id", id);
  if (errUp) {
    res.status(500).json({ error: errUp.message });
    return;
  }

  const { error: errDel } = await supabase.from("asistencias").delete().eq("bebe_id", id);
  if (errDel) {
    res.status(500).json({ error: errDel.message });
    return;
  }

  const { error: errIns } = await supabase
    .from("asistencias")
    .insert(dias.map((dia) => ({ bebe_id: id, dia })));
  if (errIns) {
    res.status(500).json({ error: errIns.message });
    return;
  }

  res.json({ ok: true });
});

/** DELETE /api/participantes/:id — eliminar participante */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("bebes").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

export default router;
