import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { findCanonical } from "../utils/fuzzy.js";
import {
  GuardarAsistenciaSchema,
  EliminarDiaSchema,
  FiltrosAsistenciaSchema,
  DIAS_VALIDOS,
} from "@ape/shared";
import { guardarLimiter } from "../middleware/rateLimit.js";

const router = Router();

function leerFase(obj: Record<string, unknown>): string {
  return String(
    obj["Fase"] ?? obj["fase"] ?? obj["InstitucionMadre"] ?? obj["Institucion"] ?? obj["institucion"] ?? ""
  ).trim();
}

function normalizarDia(dia: string): string {
  return dia
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** GET /api/asistencia/fechas — combinaciones fecha+dia existentes */
router.get("/fechas", async (_req, res) => {
  const PAGE_SIZE = 1000;
  let allData: { fecha: string; dia: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("registros_asistencia")
      .select("fecha, dia")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    allData = allData.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const seen = new Set<string>();
  const fechas: { fecha: string; dia: string }[] = [];
  for (const r of allData) {
    const key = `${r.fecha}|${r.dia}`;
    if (!seen.has(key)) {
      seen.add(key);
      fechas.push({ fecha: r.fecha, dia: r.dia });
    }
  }

  res.json({ ok: true, fechas });
});

/** GET /api/asistencia — registros para el dashboard con filtros */
router.get("/", async (req, res) => {
  const parsed = FiltrosAsistenciaSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Filtros inválidos" });
    return;
  }
  const { fecha, desde, hasta, dia } = parsed.data;

  const PAGE_SIZE = 1000;
  let allData: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from("registros_asistencia")
      .select("*")
      .order("fecha", { ascending: true })
      .order("nombre_bebe", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (fecha) q = q.eq("fecha", fecha);
    if (dia) q = q.eq("dia", dia);
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);

    const { data, error } = await q;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    allData = allData.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const registros = allData.map((r) => ({
    NombreBebe: r["nombre_bebe"],
    NombreMadre: r["nombre_madre"],
    Fase: r["fase"],
    InstitucionMadre: r["fase"],
    ProgramaMadre: r["programa"],
    Edad: r["edad"],
    Fecha: r["fecha"],
    Dia: r["dia"],
    Asistencia: r["asistencia"],
    Ubicacion: r["ubicacion"],
    Reporte: r["reporte"],
    SituacionEspecifica: r["situacion_especifica"],
    Nota: r["nota"],
    Extras: r["extras"],
    Visitante: r["extras"],
    NoCidi: r["no_cidi"],
  }));

  res.json({ ok: true, total: registros.length, registros });
});

/** POST /api/asistencia/guardar — guarda asistencia de un día completo */
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

  const { data: catalogo } = await supabase.from("bebes").select("nombre_bebe, nombre_madre");
  const cat = catalogo ?? [];

  const filas = registros
    .filter((r) => r.NombreBebe?.trim())
    .map((r) => {
      let nombre_bebe = r.NombreBebe.trim();
      let nombre_madre = (r.NombreMadre ?? "").trim();

      const canonical = findCanonical(nombre_bebe, nombre_madre, cat);
      if (canonical) {
        nombre_bebe = canonical.nombre_bebe;
        nombre_madre = canonical.nombre_madre;
      }

      return {
        nombre_bebe,
        nombre_madre,
        fase: leerFase(r as unknown as Record<string, unknown>),
        programa: String(r.ProgramaMadre ?? r.Programa ?? "").trim(),
        edad: String(r.Edad ?? "").trim(),
        fecha,
        dia,
        asistencia: String(r.Asistencia ?? "No").trim(),
        ubicacion: String(r.Ubicacion ?? "").trim(),
        reporte: String(r.Reporte ?? "No").trim(),
        situacion_especifica: String(r.SituacionEspecifica ?? "").trim(),
        nota: String(r.Nota ?? "").trim(),
        extras: String(r.Extras ?? r.Visitante ?? "").trim(),
        no_cidi: String(r.NoCidi ?? "").trim(),
      };
    });

  if (!filas.length) {
    res.status(400).json({ error: "Ningún registro válido para guardar" });
    return;
  }

  const LOTE = 20;
  let guardados = 0;
  let omitidos = 0;
  const erroresFila: string[] = [];

  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);

    const claves = lote.map((r) => `${r.nombre_bebe}||${r.nombre_madre}||${r.fecha}`);
    const { data: yaExisten } = await supabase
      .from("registros_asistencia")
      .select("nombre_bebe, nombre_madre, fecha")
      .in("fecha", [...new Set(lote.map((r) => r.fecha))]);

    const setExistentes = new Set(
      (yaExisten ?? []).map((r: { nombre_bebe: string; nombre_madre: string; fecha: string }) =>
        `${r.nombre_bebe}||${r.nombre_madre}||${r.fecha}`
      )
    );

    omitidos += claves.filter((k) => setExistentes.has(k)).length;

    const { error } = await supabase
      .from("registros_asistencia")
      .upsert(lote, { onConflict: "nombre_bebe,nombre_madre,fecha" });

    if (error) {
      erroresFila.push(error.message);
    } else {
      guardados += lote.length;
    }
  }

  console.log(`✅  Asistencia guardada: ${guardados}/${filas.length} — ${dia} ${fecha}`);
  res.json({
    ok: true,
    guardados: guardados - omitidos,
    total: filas.length,
    omitidos,
    advertencias: erroresFila.length ? erroresFila : undefined,
  });
});

/** DELETE /api/asistencia/dia — elimina registros de un día (admin/coordinadora) */
router.delete("/dia", async (req, res) => {
  const parsed = EliminarDiaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Se requieren fecha (YYYY-MM-DD) y dia válido" });
    return;
  }
  const { fecha, dia } = parsed.data;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", req.user?.id)
    .single();

  if (!usuario || !["admin", "coordinadora"].includes(usuario.rol)) {
    res.status(403).json({ error: "Solo admin y coordinadora pueden eliminar registros" });
    return;
  }

  const { data, error } = await supabase
    .from("registros_asistencia")
    .delete()
    .eq("fecha", fecha)
    .eq("dia", dia)
    .select("id");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const eliminados = data?.length ?? 0;
  if (eliminados === 0) {
    res.status(404).json({ error: `No hay registros para ${dia} ${fecha}` });
    return;
  }

  console.log(`🗑️  Eliminados ${eliminados} registros de ${dia} ${fecha}`);
  res.json({ ok: true, eliminados });
});

export default router;
