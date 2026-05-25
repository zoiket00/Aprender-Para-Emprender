export type Dia = "Lunes" | "Martes" | "Miercoles" | "Jueves" | "Viernes";

export type Rol = "admin" | "coordinadora" | "profesora";

export interface Participante {
  id: string;
  nombre_bebe: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
}

export interface AsistenciaDia {
  bebe_id: string;
  dia: Dia;
}

export interface RegistroAsistencia {
  id?: string;
  nombre_bebe: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
  fecha: string;
  dia: Dia;
  asistencia: string;
  ubicacion: string;
  reporte: string;
  situacion_especifica: string;
  nota: string;
  extras: string;
  no_cidi: string;
}

export interface Usuario {
  id: string;
  rol: Rol;
}

// Respuestas estándar de la API
export interface ApiOk<T = undefined> {
  ok: true;
  data?: T;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T = undefined> = ApiOk<T> | ApiError;
