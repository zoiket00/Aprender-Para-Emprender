import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { findCanonical } from "../utils/fuzzy.js";
import {
  GuardarAsistenciaSchema,
  EliminarDiaSchema,
  FiltrosAsistenciaSchema,
  DIAS_VALIDOS,
} from "@ape/shared";
import type { DatosExtra } from "@ape/shared";
import { guardarLimiter } from "../middleware/rateLimit.js";

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

// Mapea asistencia del UI (español) → estado DB (español)
function toDbEstado(s: string): "presente" | "ausente" | "justificado" | "tarde" {
  const map: Record<string, "presente" | "ausente" | "justificado" | "tarde"> = {
    "Sí":          "presente",
    "Si":          "presente",
    "No":          "ausente",
    "Justificado": "justificado",
    "Tarde":       "tarde",
  };
  return map[s] ?? "ausente";
}

// Mapea estado DB → texto UI (español)
function fromDbEstado(s: string): string {
  const map: Record<string, string> = {
    presente:    "Sí",
    ausente:     "No",
    justificado: "Justificado",
    tarde:       "Tarde",
  };
  return map[s] ?? "No";
}

// ── GET /fechas — sesiones disponibles (fecha + día) ─────────────────────────
router.get("/fechas", async (req, res) => {
  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .select("fecha, grupos!inner(nombre, programas!inner(org_id))")
    .eq("grupos.programas.org_id", orgId)
    .order("fecha", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const seen = new Set<string>();
  const fechas: { fecha: string; dia: string }[] = [];
  for (const r of data ?? []) {
    const fecha = String((r as Record<string, unknown>)["fecha"]);
    const dia   = String(((r as Record<string, unknown>)["grupos"] as Record<string, unknown>)["nombre"]);
    const key   = `${fecha}|${dia}`;
    if (!seen.has(key)) { seen.add(key); fechas.push({ fecha, dia }); }
  }

  res.json({ ok: true, fechas });
});

// ── GET / — registros de asistencia con filtros ───────────────────────────────
router.get("/", async (req, res) => {
  const parsed = FiltrosAsistenciaSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Filtros inválidos" });
    return;
  }

  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { fecha, desde, hasta, dia } = parsed.data;

  let sessionQuery = supabase
    .from("sesiones_asistencia")
    .select("id, fecha, grupos!inner(nombre, programas!inner(org_id))")
    .eq("grupos.programas.org_id", orgId);

  if (fecha)  sessionQuery = sessionQuery.eq("fecha", fecha);
  if (desde)  sessionQuery = sessionQuery.gte("fecha", desde);
  if (hasta)  sessionQuery = sessionQuery.lte("fecha", hasta);
  if (dia)    sessionQuery = sessionQuery.eq("grupos.nombre", normalizarDia(dia));

  const { data: sesiones, error: sError } = await sessionQuery;
  if (sError) { res.status(500).json({ error: sError.message }); return; }
  if (!sesiones?.length) { res.json({ ok: true, total: 0, registros: [] }); return; }

  const sesionIds = sesiones.map((s) => (s as Record<string, unknown>)["id"] as string);

  const { data: records, error: rError } = await supabase
    .from("registros_asistencia")
    .select("*, participantes(nombre_completo, codigo, datos_extra), sesiones_asistencia(fecha, grupos(nombre))")
    .in("sesion_id", sesionIds);

  if (rError) { res.status(500).json({ error: rError.message }); return; }

  const registros = (records ?? []).map((r) => {
    const rec   = r as Record<string, unknown>;
    const p     = (rec["participantes"] as Record<string, unknown>) ?? {};
    const extra = ((p["datos_extra"] ?? {}) as DatosExtra);
    const ses   = (rec["sesiones_asistencia"] as Record<string, unknown>) ?? {};
    const grp   = (ses["grupos"] as Record<string, unknown>) ?? {};
    const info  = (rec["info_extra"] as Record<string, unknown>) ?? {};

    return {
      id:                   rec["id"],
      nombre_completo:      p["nombre_completo"] ?? "",
      nombre_madre:         extra.nombre_madre ?? "",
      fase:                 extra.fase ?? "",
      programa:             extra.programa ?? "",
      edad:                 extra.edad ?? "",
      fecha:                ses["fecha"] ?? "",
      dia:                  grp["nombre"] ?? "",
      asistencia:           fromDbEstado(String(rec["estado"] ?? "ausente")),
      ubicacion:            info["ubicacion"] ?? "",
      reporte:              info["reporte"] ?? "",
      situacion_especifica: info["situacion_especifica"] ?? "",
      nota:                 rec["nota"] ?? "",
      extras:               info["extras"] ?? "",
      no_matricula:         info["no_matricula"] ?? p["codigo"] ?? "",
      // Aliases para compatibilidad con el dashboard
      NombreBebe:    p["nombre_completo"] ?? "",
      NombreMadre:   extra.nombre_madre ?? "",
      Asistencia:    fromDbEstado(String(rec["estado"] ?? "ausente")),
      NoMatricula:   info["no_matricula"] ?? p["codigo"] ?? "",
    };
  });

  res.json({ ok: true, total: registros.length, registros });
});

// ── POST /guardar — guarda asistencia de un día completo ─────────────────────
router.post("/guardar", guardarLimiter, async (req, res) => {
  const parsed = GuardarAsistenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const { fecha, registros } = parsed.data;
  const dia = normalizarDia(parsed.data.dia);

  if (!([...DIAS_VALIDOS] as string[]).includes(dia)) {
    res.status(400).json({ error: `Día no válido: "${dia}"` });
    return;
  }

  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  // Buscar grupo del día
  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, programas!inner(org_id)")
    .eq("nombre", dia)
    .eq("programas.org_id", orgId)
    .maybeSingle();

  if (!grupo) {
    res.status(400).json({ error: `No existe grupo configurado para el día: ${dia}` });
    return;
  }

  const grupoId = (grupo as Record<string, unknown>)["id"] as string;

  // Upsert sesión (una por grupo por día)
  const { data: sesion, error: sError } = await supabase
    .from("sesiones_asistencia")
    .upsert(
      { grupo_id: grupoId, fecha, abierto_por: req.user!.id },
      { onConflict: "grupo_id,fecha" }
    )
    .select("id")
    .single();

  if (sError || !sesion) {
    res.status(500).json({ error: sError?.message ?? "Error al crear sesión" });
    return;
  }

  const sesionId = (sesion as Record<string, unknown>)["id"] as string;

  // Catálogo para fuzzy matching
  const { data: catalog } = await supabase
    .from("participantes")
    .select("id, nombre_completo, datos_extra")
    .eq("org_id", orgId)
    .is("eliminado_en", null);

  interface CatEntry { nombre_bebe: string; nombre_madre: string; id: string }
  const cat: CatEntry[] = (catalog ?? []).map((p) => {
    const extra = ((p as Record<string, unknown>)["datos_extra"] ?? {}) as DatosExtra;
    return {
      nombre_bebe:  String((p as Record<string, unknown>)["nombre_completo"] ?? ""),
      nombre_madre: extra.nombre_madre ?? "",
      id:           String((p as Record<string, unknown>)["id"]),
    };
  });

  let guardados = 0;
  let omitidos  = 0;

  for (const r of registros.filter((r) => r.NombreBebe?.trim())) {
    const canonical = findCanonical(r.NombreBebe, r.NombreMadre ?? "", cat) as CatEntry | null;
    if (!canonical) { omitidos++; continue; }

    const { error: recError } = await supabase
      .from("registros_asistencia")
      .upsert(
        {
          sesion_id:      sesionId,
          participante_id: canonical.id,
          estado:          toDbEstado(r.Asistencia ?? "No"),
          nota:            r.Nota ?? "",
          info_extra: {
            ubicacion:            r.Ubicacion ?? "",
            reporte:              r.Reporte ?? "No",
            situacion_especifica: r.SituacionEspecifica ?? "",
            extras:               r.Extras ?? "",
            no_matricula:         r.NoMatricula ?? "",
          },
          registrado_por: req.user!.id,
        },
        { onConflict: "sesion_id,participante_id" }
      );

    if (recError) { omitidos++; } else { guardados++; }
  }

  res.json({ ok: true, guardados, omitidos });
});

// ── DELETE /dia — eliminar sesión completa de un día ─────────────────────────
router.delete("/dia", async (req, res) => {
  const parsed = EliminarDiaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Datos inválidos" });
    return;
  }

  const orgId = await getOrgId(req.user!.id);
  if (!orgId) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  const { fecha, dia } = parsed.data;

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, programas!inner(org_id)")
    .eq("nombre", dia)
    .eq("programas.org_id", orgId)
    .maybeSingle();

  if (!grupo) { res.status(404).json({ error: "Grupo no encontrado" }); return; }

  // Al eliminar la sesión se eliminan los registros en cascada
  const { error } = await supabase
    .from("sesiones_asistencia")
    .delete()
    .eq("grupo_id", (grupo as Record<string, unknown>)["id"])
    .eq("fecha", fecha);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
