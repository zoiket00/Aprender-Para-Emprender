import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { ParticipanteSchema, ParticipanteUpdateSchema, DIAS_VALIDOS } from "@ape/shared";
import type { DatosExtra } from "@ape/shared";

const router = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

async function getOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("miembros_org")
    .select("org_id")
    .eq("usuario_id", userId)
    .single();
  return data?.org_id ?? null;
}

function normalizarDia(dia: string): string {
  return dia.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function toFrontendParticipante(p: Record<string, unknown>) {
  const extra = (p["datos_extra"] ?? {}) as DatosExtra;
  return {
    id:              p["id"],
    nombre_completo: p["nombre_completo"],
    codigo:          p["codigo"] ?? null,
    nombre_madre:    extra.nombre_madre ?? "",
    fase:            extra.fase ?? "",
    programa:        extra.programa ?? "",
    edad:            extra.edad ?? "",
    datos_extra:     extra,
    activo:          p["activo"],
    creado_en:       p["creado_en"],
  };
}

// ── GET /sheet/:dia — CSV para pantalla de asistencia ────────────────────────
router.get("/sheet/:dia", async (req, res) => {
  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const dia = normalizarDia(req.params["dia"] ?? "");

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, programas!inner(org_id)")
    .eq("nombre", dia)
    .eq("programas.org_id", orgId)
    .maybeSingle();

  const emptyCSV = "Nombre Bebe,Nombre Madre,Fase,Programa,Edad\n";
  if (!grupo) {
    res.setHeader("Content-Type", "text/plain");
    res.send(emptyCSV);
    return;
  }

  const { data: inscripciones, error } = await supabase
    .from("inscripciones")
    .select("participantes(id, nombre_completo, codigo, datos_extra)")
    .eq("grupo_id", (grupo as Record<string, unknown>)["id"])
    .is("salida_en", null);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const rows = (inscripciones ?? []).map((e) => {
    const p = (e as Record<string, unknown>)["participantes"] as Record<string, unknown>;
    const extra = ((p["datos_extra"] ?? {}) as DatosExtra);
    return [
      `"${String(p["nombre_completo"] ?? "")}"`,
      `"${extra.nombre_madre ?? ""}"`,
      `"${extra.fase ?? ""}"`,
      `"${extra.programa ?? ""}"`,
      `"${extra.edad ?? ""}"`,
    ].join(",");
  });

  res.setHeader("Content-Type", "text/plain");
  res.send(["Nombre Bebe,Nombre Madre,Fase,Programa,Edad", ...rows].join("\n"));
});

// ── GET / — lista de participantes ───────────────────────────────────────────
router.get("/", async (req, res) => {
  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("org_id", orgId)
    .is("eliminado_en", null)
    .order("nombre_completo")
    .limit(500);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true, participantes: (data ?? []).map(toFrontendParticipante) });
});

// ── GET /dias-catalogo — días inscritos por participante ─────────────────────
router.get("/dias-catalogo", async (req, res) => {
  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { data, error } = await supabase
    .from("inscripciones")
    .select("participante_id, grupos!inner(nombre, programas!inner(org_id))")
    .eq("grupos.programas.org_id", orgId)
    .is("salida_en", null);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const dias = (data ?? []).map((e) => ({
    participante_id: (e as Record<string, unknown>)["participante_id"],
    dia: ((e as Record<string, unknown>)["grupos"] as Record<string, unknown>)["nombre"],
  }));

  res.json({ ok: true, dias });
});

// ── GET /asistencia-dias — alias para compatibilidad ─────────────────────────
router.get("/asistencia-dias", async (_req, res) => {
  res.json({ ok: true, dias: [] });
});

// ── POST / — crear participante + inscribir en días ──────────────────────────
router.post("/", async (req, res) => {
  const parsed = ParticipanteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { nombre_completo, codigo, datos_extra, dias } = parsed.data;

  const { data: participante, error: pError } = await supabase
    .from("participantes")
    .insert({ org_id: orgId, nombre_completo, codigo: codigo ?? null, datos_extra: datos_extra ?? {} })
    .select("id")
    .single();

  if (pError || !participante) {
    res.status(500).json({ error: pError?.message ?? "Error al crear participante" });
    return;
  }

  if (dias?.length) {
    for (const dia of dias) {
      const { data: grupo } = await supabase
        .from("grupos")
        .select("id, programas!inner(org_id)")
        .eq("nombre", dia)
        .eq("programas.org_id", orgId)
        .maybeSingle();

      if (grupo) {
        await supabase.from("inscripciones").insert({
          participante_id: (participante as Record<string, unknown>)["id"],
          grupo_id:        (grupo as Record<string, unknown>)["id"],
        });
      }
    }
  }

  res.status(201).json({ ok: true, id: (participante as Record<string, unknown>)["id"] });
});

// ── PUT /:id — actualizar participante y días ────────────────────────────────
router.put("/:id", async (req, res) => {
  const parsed = ParticipanteUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { nombre_completo, codigo, datos_extra, dias } = parsed.data;
  const participanteId = req.params["id"];

  const { data: existing } = await supabase
    .from("participantes")
    .select("id")
    .eq("id", participanteId)
    .eq("org_id", orgId)
    .is("eliminado_en", null)
    .single();

  if (!existing) { res.status(404).json({ error: "Participante no encontrado" }); return; }

  const { error: uError } = await supabase
    .from("participantes")
    .update({ nombre_completo, codigo: codigo ?? null, datos_extra: datos_extra ?? {} })
    .eq("id", participanteId);

  if (uError) { res.status(500).json({ error: uError.message }); return; }

  // Reinscribir en días
  await supabase.from("inscripciones").delete().eq("participante_id", participanteId);
  for (const dia of dias) {
    const { data: grupo } = await supabase
      .from("grupos")
      .select("id, programas!inner(org_id)")
      .eq("nombre", dia)
      .eq("programas.org_id", orgId)
      .maybeSingle();

    if (grupo) {
      await supabase.from("inscripciones").insert({
        participante_id: participanteId,
        grupo_id:        (grupo as Record<string, unknown>)["id"],
      });
    }
  }

  res.json({ ok: true });
});

// ── DELETE /:id — soft delete ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { error } = await supabase
    .from("participantes")
    .update({ eliminado_en: new Date().toISOString(), activo: false })
    .eq("id", req.params["id"])
    .eq("org_id", orgId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
