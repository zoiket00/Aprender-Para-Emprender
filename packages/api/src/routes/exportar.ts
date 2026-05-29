import { Router } from "express";
import XLSX from "xlsx";
import { supabase } from "../config/supabase.js";
import { getOrgMember } from "../utils/org.js";
import type { DatosExtra } from "@ape/shared";

const router = Router();

function fromDbEstado(s: string): string {
  const map: Record<string, string> = {
    presente:    "Sí",
    ausente:     "No",
    justificado: "Justificado",
    tarde:       "Tarde",
  };
  return map[s] ?? "No";
}

/** GET /api/exportar — genera o previsualiza Excel */
router.get("/", async (req, res) => {
  const { desde, hasta, programa, dia, preview } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: "Los parámetros desde y hasta son requeridos" });
    return;
  }

  // getOrgMember devuelve orgId + rol en una sola query cacheada
  const member = await getOrgMember(req.user!.id);
  if (!member) { res.status(403).json({ error: "Sin organización asignada" }); return; }

  if (!["propietario", "admin", "coordinador"].includes(member.rol)) {
    res.status(403).json({ error: "Solo admin y coordinador pueden exportar registros" });
    return;
  }

  const { orgId } = member;

  let sessionQuery = supabase
    .from("sesiones_asistencia")
    .select("id, fecha, grupos!inner(nombre, programas!inner(org_id, nombre))")
    .eq("grupos.programas.org_id", orgId)
    .gte("fecha", desde as string)
    .lte("fecha", hasta as string);

  if (dia)      sessionQuery = sessionQuery.eq("grupos.nombre", dia as string);
  if (programa) sessionQuery = sessionQuery.eq("grupos.programas.nombre", programa as string);

  const { data: sesiones, error: sError } = await sessionQuery;
  if (sError) { res.status(500).json({ error: sError.message }); return; }
  if (!sesiones?.length) {
    if (preview === "true") { res.json({ total: 0, filas: [] }); return; }
    res.status(404).json({ error: "No hay registros para el rango indicado" });
    return;
  }

  const sesionIds = sesiones.map((s) => (s as Record<string, unknown>)["id"] as string);

  const PAGE_SIZE = 1000;
  let allRecords: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("registros_asistencia")
      .select("*, participantes(nombre_completo, codigo, datos_extra), sesiones_asistencia(fecha, grupos(nombre))")
      .in("sesion_id", sesionIds)
      .order("registrado_en", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) { res.status(500).json({ error: error.message }); return; }
    allRecords = allRecords.concat((data ?? []) as Record<string, unknown>[]);
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const mapearFila = (r: Record<string, unknown>) => {
    const p     = (r["participantes"] as Record<string, unknown>) ?? {};
    const extra = ((p["datos_extra"] ?? {}) as DatosExtra);
    const ses   = (r["sesiones_asistencia"] as Record<string, unknown>) ?? {};
    const grp   = (ses["grupos"] as Record<string, unknown>) ?? {};
    const info  = (r["info_extra"] as Record<string, unknown>) ?? {};

    return {
      "Fecha":                ses["fecha"] ?? "",
      "Día":                  grp["nombre"] ?? "",
      "Nombre Participante":  p["nombre_completo"] ?? "",
      "Nombre Madre":         extra.nombre_madre ?? "",
      "Institución":          extra.fase ?? "",
      "Programa":             extra.programa ?? "",
      "Edad (meses)":         extra.edad ?? "",
      "Asistencia":           fromDbEstado(String(r["estado"] ?? "ausente")),
      "Ubicación":            info["ubicacion"] ?? "",
      "Reporte":              info["reporte"] ?? "",
      "Situación Específica": info["situacion_especifica"] ?? "",
      "Nota":                 r["nota"] ?? "",
      "Extras":               info["extras"] ?? "",
      "No Matrícula":         info["no_matricula"] ?? p["codigo"] ?? "",
    };
  };

  if (preview === "true") {
    res.json({ total: allRecords.length, filas: allRecords.slice(0, 15).map(mapearFila) });
    return;
  }

  const filas = allRecords.map(mapearFila);
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="asistencia-${desde}-${hasta}.xlsx"`);
  res.send(buf);
});

export default router;
