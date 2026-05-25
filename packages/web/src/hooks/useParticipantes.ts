import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import type { ParticipanteInput, ParticipanteUpdateInput } from "@ape/shared";

interface ParticipanteAPI {
  id: string;
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  ProgramaMadre: string;
  Edad: string;
}

export function useParticipantes() {
  return useQuery({
    queryKey: ["participantes"],
    queryFn: () =>
      api.get<{ bebes: ParticipanteAPI[] }>("/api/participantes").then((r) => r.bebes),
  });
}

export function useAsistenciaDias() {
  return useQuery({
    queryKey: ["asistencia-dias"],
    queryFn: () =>
      api.get<{ diasMap: Record<string, string[]> }>("/api/participantes/asistencia-dias").then(
        (r) => r.diasMap
      ),
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
