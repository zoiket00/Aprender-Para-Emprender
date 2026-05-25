export type Dia = "Lunes" | "Martes" | "Miercoles" | "Jueves" | "Viernes";
export type RolOrg = "propietario" | "admin" | "coordinador" | "profesor" | "observador";
export type EstadoAsistencia = "presente" | "ausente" | "justificado" | "tarde";

export interface DatosExtra {
  nombre_madre?: string;
  fase?: string;
  programa?: string;
  edad?: string;
  [key: string]: unknown;
}

// Alias de compatibilidad para código que aún importe ParticipantMetadata
export type ParticipantMetadata = DatosExtra;

export interface Participante {
  id: string;
  org_id: string;
  nombre_completo: string;
  codigo: string | null;
  datos_extra: DatosExtra;
  activo: boolean;
  creado_en: string;
  eliminado_en?: string | null;
}

export interface Grupo {
  id: string;
  programa_id: string;
  nombre: string;
  horario: string[] | null;
  activo: boolean;
  creado_en: string;
}

export interface SesionAsistencia {
  id: string;
  grupo_id: string;
  fecha: string;
  estado: "abierta" | "cerrada";
  notas: string | null;
  creado_en: string;
}

export interface RegistroAsistenciaDB {
  id: string;
  sesion_id: string;
  participante_id: string;
  estado: EstadoAsistencia;
  nota: string | null;
  info_extra: Record<string, unknown>;
  registrado_en: string;
}

// Forma aplanada que devuelve el API al frontend
export interface RegistroAsistencia {
  id?: string;
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
  fecha: string;
  dia: string;
  asistencia: string;      // "Sí" | "No" | "Justificado" | "Tarde"
  ubicacion: string;
  reporte: string;
  situacion_especifica: string;
  nota: string;
  extras: string;
  no_matricula: string;
}

export interface ApiOk<T = undefined> {
  ok: true;
  data?: T;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T = undefined> = ApiOk<T> | ApiError;
