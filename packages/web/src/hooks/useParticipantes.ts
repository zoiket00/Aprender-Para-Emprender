import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import type { ParticipanteInput, ParticipanteUpdateInput } from "@ape/shared";

export interface ParticipanteAPI {
  id: string;
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
  codigo: string | null;
  datos_extra: Record<string, unknown>;
  activo: boolean;
}

export function useParticipantes() {
  return useQuery({
    queryKey: ["participantes"],
    queryFn: () =>
      api.get<{ ok: true; participantes: ParticipanteAPI[] }>("/api/participantes").then(
        (r) => r.participantes
      ),
  });
}

export function useAsistenciaDias() {
  return useQuery({
    queryKey: ["asistencia-dias"],
    queryFn: () =>
      api.get<{ ok: true; dias: { participante_id: string; dia: string }[] }>(
        "/api/participantes/dias-catalogo"
      ).then((r) => {
        const map: Record<string, string[]> = {};
        for (const { participante_id, dia } of r.dias) {
          if (!map[participante_id]) map[participante_id] = [];
          map[participante_id]!.push(dia);
        }
        return map;
      }),
  });
}

export function useCrearParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ParticipanteInput) =>
      api.post<{ ok: boolean; id: string }>("/api/participantes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["participantes"] }),
  });
}

export function useEditarParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ParticipanteUpdateInput & { id: string }) =>
      api.put<{ ok: boolean }>(`/api/participantes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participantes"] });
      qc.invalidateQueries({ queryKey: ["asistencia-dias"] });
    },
  });
}

export function useEliminarParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/participantes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["participantes"] }),
  });
}
