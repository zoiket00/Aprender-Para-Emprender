import { z } from "zod";

export const DIAS_VALIDOS = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
] as const;

export const DiaSchema = z.enum(DIAS_VALIDOS);

export const RolSchema = z.enum(["admin", "coordinadora", "profesora"]);

export const ParticipanteSchema = z.object({
  nombre_bebe: z.string().min(2, "Nombre del bebé es obligatorio"),
  nombre_madre: z.string().min(2, "Nombre de la madre es obligatorio"),
  fase: z.string().default(""),
  programa: z.string().default(""),
  edad: z.string().default(""),
  dias: z.array(DiaSchema).min(1, "Debe asignar al menos un día").optional(),
});

export const ParticipanteUpdateSchema = ParticipanteSchema.extend({
  dias: z.array(DiaSchema).min(1, "Debe asignar al menos un día"),
});

export const RegistroAsistenciaInputSchema = z.object({
  NombreBebe: z.string(),
  NombreMadre: z.string().optional().default(""),
  Fase: z.string().optional().default(""),
  InstitucionMadre: z.string().optional(),
  Institucion: z.string().optional(),
  ProgramaMadre: z.string().optional().default(""),
  Programa: z.string().optional(),
  Edad: z.string().optional().default(""),
  Asistencia: z.string().optional().default("No"),
  Ubicacion: z.string().optional().default(""),
  Reporte: z.string().optional().default("No"),
  SituacionEspecifica: z.string().optional().default(""),
  Nota: z.string().optional().default(""),
  Extras: z.string().optional().default(""),
  Visitante: z.string().optional(),
  NoCidi: z.string().optional().default(""),
});

export const GuardarAsistenciaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato debe ser YYYY-MM-DD"),
  dia: z.string(),
  registros: z
    .array(RegistroAsistenciaInputSchema)
    .min(1, "registros no puede estar vacío"),
});

export const FiltrosAsistenciaSchema = z.object({
  fecha: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  dia: DiaSchema.optional(),
  programa: z.string().optional(),
  fase: z.string().optional(),
});

export const EliminarDiaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dia: DiaSchema,
});

export type ParticipanteInput = z.infer<typeof ParticipanteSchema>;
export type ParticipanteUpdateInput = z.infer<typeof ParticipanteUpdateSchema>;
export type GuardarAsistenciaInput = z.infer<typeof GuardarAsistenciaSchema>;
export type FiltrosAsistencia = z.infer<typeof FiltrosAsistenciaSchema>;
export type EliminarDiaInput = z.infer<typeof EliminarDiaSchema>;
