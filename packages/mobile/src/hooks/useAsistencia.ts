import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { GuardarAsistenciaInput } from "@ape/shared";

const API_BASE = process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000";

export interface RegistroCSV {
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  Programa: string;
  Edad: string;
}

export interface RegistroAPI {
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  ProgramaMadre: string;
  Fecha: string;
  Dia: string;
  Asistencia: string;
  Ubicacion: string;
  Reporte: string;
  Nota: string;
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

export function useListaDia(dia: string | null) {
  return useQuery({
    queryKey: ["lista-dia", dia],
    enabled: !!dia,
    queryFn: async (): Promise<RegistroCSV[]> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const res = await fetch(`${API_BASE}/api/participantes/sheet/${dia}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseCsv(await res.text());
    },
  });
}

export function useAsistencia(filtros: Record<string, string>) {
  const params = new URLSearchParams(filtros).toString();
  return useQuery({
    queryKey: ["asistencia", filtros],
    enabled: Object.values(filtros).some(Boolean),
    queryFn: () =>
      api
        .get<{ total: number; registros: RegistroAPI[] }>(`/api/asistencia?${params}`)
        .then((r) => r.registros),
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
