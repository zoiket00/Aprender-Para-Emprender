import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import type { GuardarAsistenciaInput } from "@ape/shared";

interface RegistroAPI {
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
  fecha: string;
  dia: string;
  asistencia: string;
  ubicacion: string;
  reporte: string;
  situacion_especifica: string;
  nota: string;
  extras: string;
  no_matricula: string;
  // aliases UI (el API devuelve ambos por compatibilidad)
  NombreBebe?: string;
  NombreMadre?: string;
  Asistencia?: string;
  NoMatricula?: string;
}

interface RegistroCSV {
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  Programa: string;
  Edad: string;
}

export function useListaDia(dia: string | null) {
  return useQuery({
    queryKey: ["lista-dia", dia],
    queryFn: async (): Promise<RegistroCSV[]> => {
      const res = await fetch(`/api/participantes/sheet/${dia}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      const text = await res.text();
      return parseCsv(text);
    },
    enabled: !!dia,
  });
}

async function getToken() {
  const { getSupabase } = await import("@/lib/supabase.js");
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? "";
}

function parseCsv(csv: string): RegistroCSV[] {
  const [header, ...rows] = csv.trim().split("\n");
  if (!header) return [];
  const keys = header.split(",").map((k) => k.trim());
  return rows
    .filter((r) => r.trim())
    .map((row) => {
      const vals = row.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
      const obj: Record<string, string> = {};
      keys.forEach((k, i) => { obj[k ?? ""] = vals[i] ?? ""; });
      return {
        NombreBebe: obj["Nombre Bebe"] ?? "",
        NombreMadre: obj["Nombre Madre"] ?? "",
        Fase: obj["Fase"] ?? "",
        Programa: obj["Programa"] ?? "",
        Edad: obj["Edad"] ?? "",
      };
    });
}

export function useAsistenciaFechas() {
  return useQuery({
    queryKey: ["asistencia-fechas"],
    queryFn: () =>
      api.get<{ fechas: { fecha: string; dia: string }[] }>("/api/asistencia/fechas").then(
        (r) => r.fechas
      ),
  });
}

export function useAsistencia(filtros: Record<string, string>) {
  const params = new URLSearchParams(filtros).toString();
  return useQuery({
    queryKey: ["asistencia", filtros],
    queryFn: () =>
      api.get<{ total: number; registros: RegistroAPI[] }>(`/api/asistencia?${params}`).then(
        (r) => r.registros
      ),
    enabled: Object.values(filtros).some(Boolean),
  });
}

export function useEliminarDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fecha, dia }: { fecha: string; dia: string }) =>
      api.delete<{ ok: boolean }>("/api/asistencia/dia", { fecha, dia }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asistencia"] });
      qc.invalidateQueries({ queryKey: ["asistencia-fechas"] });
    },
  });
}

export function useGuardarAsistencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GuardarAsistenciaInput) =>
      api.post<{ ok: boolean; guardados: number; omitidos: number }>(
        "/api/asistencia/guardar",
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asistencia"] });
      qc.invalidateQueries({ queryKey: ["asistencia-fechas"] });
    },
  });
}
