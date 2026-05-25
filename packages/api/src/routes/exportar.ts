import { Router } from "express";
import XLSX from "xlsx";
import { supabase } from "../config/supabase.js";
import { FiltrosAsistenciaSchema } from "@ape/shared";

const router = Router();

/** GET /api/exportar — genera o previsualiza Excel de registros */
router.get("/", async (req, res) => {
  const { desde, hasta, programa, fase, dia, preview } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: "Los parámetros desde y hasta son requeridos" });
    return;
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", req.user?.id)
    .single();

  if (!usuario || !["admin", "coordinadora"].includes(usuario.rol)) {
    res.status(403).json({ error: "Solo admin y coordinadora pueden exportar registros" });
    return;
  }

  const PAGE_SIZE = 1000;
  let allData: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from("registros_asistencia")
      .select("*")
      .gte("fecha", desde as string)
      .lte("fecha", hasta as string)
      .order("fecha", { ascending: true })
      .order("dia", { ascending: true })
      .order("nombre_bebe", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (programa) q = q.eq("programa", programa as string);
    if (fase) q = q.eq("fase", fase as string);
    if (dia) q = q.eq("dia", dia as string);

    const { data, error } = await q;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    allData = allData.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const mapearFila = (r: Record<string, unknown>) => ({
    Fecha: r["fecha"],
    Dia: r["dia"],
    "Nombre Bebé": r["nombre_bebe"],
    "Nombre Madre": r["nombre_madre"],
    Institución: r["fase"],
    Programa: r["programa"],
    "Edad (meses)": r["edad"],
    Asistencia: r["asistencia"],
    Ubicación: r["ubicacion"],
    Reporte: r["reporte"],
    "Situación Específica": r["situacion_especifica"],
    Nota: r["nota"],
    Extras: r["extras"],
    "No CIDI": r["no_cidi"],
  });

  if (preview === "true") {
    res.json({ total: allData.length, filas: allData.slice(0, 15).map(mapearFila) });
    return;
  }

  const filas = allData.map(mapearFila);
  const ws = XLSX.utils.json_to_sheet(filas);

  ws["!cols"] = [
    { wch: 12 }, { wch: 11 }, { wch: 30 }, { wch: 30 }, { wch: 9 },
    { wch: 24 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 9 },
    { wch: 26 }, { wch: 20 }, { wch: 8 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

  const nombreArchivo = `asistencia_${desde}_${hasta}.xlsx`;
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);

  console.log(`✅ Exportado: ${allData.length} registros ${desde} → ${hasta}`);
});

export default router;
