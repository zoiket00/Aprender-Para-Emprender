-- ═══════════════════════════════════════════════════════════════════════════
-- APRENDER PARA EMPRENDER — Schema SaaS en Español
-- Colegio Cristiano Aprender para Emprender
--
-- Pega este archivo completo en Supabase → SQL Editor → Correr
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- LIMPIEZA: elimina tablas anteriores si existen (orden inverso de dependencias)
-- ─────────────────────────────────────────────────────────────────────────────
drop view  if exists public.v_resumen_asistencia   cascade;
drop view  if exists public.v_asistencia_participante cascade;
drop view  if exists public.v_attendance_summary   cascade;
drop view  if exists public.v_participant_attendance cascade;
drop table if exists public.attendance_records     cascade;
drop table if exists public.attendance_sessions    cascade;
drop table if exists public.enrollments            cascade;
drop table if exists public.participants           cascade;
drop table if exists public.groups                 cascade;
drop table if exists public.programs               cascade;
drop table if exists public.organization_members   cascade;
drop table if exists public.organizations          cascade;
drop table if exists public.registros_asistencia   cascade;
drop table if exists public.inscripciones          cascade;
drop table if exists public.sesiones_asistencia    cascade;
drop table if exists public.participantes          cascade;
drop table if exists public.grupos                 cascade;
drop table if exists public.programas              cascade;
drop table if exists public.miembros_org           cascade;
drop table if exists public.organizaciones         cascade;
drop function if exists public.my_org_ids()        cascade;
drop function if exists public.my_role(uuid)       cascade;
drop function if exists public.mis_org_ids()       cascade;
drop function if exists public.mi_rol(uuid)        cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 1: TABLAS
-- ─────────────────────────────────────────────────────────────────────────────

-- Organizaciones (un colegio / institución por fila)
create table public.organizaciones (
  id            uuid        primary key default gen_random_uuid(),
  nombre        text        not null,
  slug          text        not null unique,
  plan          text        not null default 'gratis'
                  check (plan in ('gratis', 'pro', 'empresa')),
  configuracion jsonb       not null default '{}',
  creado_en     timestamptz not null default now()
);

-- Miembros con rol por organización
create table public.miembros_org (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizaciones(id) on delete cascade,
  usuario_id  uuid        not null references auth.users(id) on delete cascade,
  rol         text        not null default 'profesor'
                check (rol in ('propietario', 'admin', 'coordinador', 'profesor', 'observador')),
  creado_en   timestamptz not null default now(),
  unique(org_id, usuario_id)
);

-- Programas de la institución
create table public.programas (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizaciones(id) on delete cascade,
  nombre      text        not null,
  descripcion text,
  color       text        not null default '#3B82F6',
  activo      boolean     not null default true,
  creado_en   timestamptz not null default now()
);

-- Grupos / clases dentro de cada programa
create table public.grupos (
  id            uuid        primary key default gen_random_uuid(),
  programa_id   uuid        not null references public.programas(id) on delete cascade,
  nombre        text        not null,
  horario       text[],     -- ['Lunes', 'Miercoles', 'Viernes']
  instructor_id uuid        references auth.users(id),
  capacidad     int,
  activo        boolean     not null default true,
  creado_en     timestamptz not null default now()
);

-- Participantes (estudiantes / niños / beneficiarios)
create table public.participantes (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references public.organizaciones(id) on delete cascade,
  nombre_completo text        not null,
  codigo          text,        -- No. Matrícula
  datos_extra     jsonb       not null default '{}',
  -- datos_extra: { nombre_madre, fase, programa, edad, telefono, ... }
  activo          boolean     not null default true,
  creado_en       timestamptz not null default now(),
  eliminado_en    timestamptz  -- soft delete
);

-- Inscripciones (participante ↔ grupo, muchos a muchos)
create table public.inscripciones (
  id              uuid        primary key default gen_random_uuid(),
  participante_id uuid        not null references public.participantes(id) on delete cascade,
  grupo_id        uuid        not null references public.grupos(id) on delete cascade,
  inscrito_en     date        not null default current_date,
  salida_en       date,       -- null = sigue inscrito
  notas           text,
  creado_en       timestamptz not null default now(),
  unique(participante_id, grupo_id)
);

-- Sesiones de asistencia (una por grupo por día)
create table public.sesiones_asistencia (
  id          uuid        primary key default gen_random_uuid(),
  grupo_id    uuid        not null references public.grupos(id) on delete cascade,
  fecha       date        not null,
  estado      text        not null default 'abierta'
                check (estado in ('abierta', 'cerrada')),
  notas       text,
  abierto_por uuid        references auth.users(id),
  cerrado_por uuid        references auth.users(id),
  cerrado_en  timestamptz,
  creado_en   timestamptz not null default now(),
  unique(grupo_id, fecha)
);

-- Registros de asistencia (uno por participante por sesión)
create table public.registros_asistencia (
  id              uuid        primary key default gen_random_uuid(),
  sesion_id       uuid        not null references public.sesiones_asistencia(id) on delete cascade,
  participante_id uuid        not null references public.participantes(id) on delete cascade,
  estado          text        not null default 'ausente'
                    check (estado in ('presente', 'ausente', 'justificado', 'tarde')),
  nota            text,
  info_extra      jsonb       not null default '{}',
  -- info_extra: { ubicacion, reporte, situacion_especifica, extras, no_matricula }
  registrado_por  uuid        references auth.users(id),
  registrado_en   timestamptz not null default now(),
  unique(sesion_id, participante_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 2: ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────

create index idx_miembros_usuario    on public.miembros_org(usuario_id);
create index idx_miembros_org        on public.miembros_org(org_id);
create index idx_programas_org       on public.programas(org_id);
create index idx_grupos_programa     on public.grupos(programa_id);
create index idx_participantes_org   on public.participantes(org_id) where eliminado_en is null;
create index idx_participantes_cod   on public.participantes(codigo);
create index idx_inscripciones_part  on public.inscripciones(participante_id);
create index idx_inscripciones_grupo on public.inscripciones(grupo_id);
create index idx_sesiones_grupo_fec  on public.sesiones_asistencia(grupo_id, fecha);
create index idx_registros_sesion    on public.registros_asistencia(sesion_id);
create index idx_registros_part      on public.registros_asistencia(participante_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 3: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.organizaciones      enable row level security;
alter table public.miembros_org        enable row level security;
alter table public.programas           enable row level security;
alter table public.grupos              enable row level security;
alter table public.participantes       enable row level security;
alter table public.inscripciones       enable row level security;
alter table public.sesiones_asistencia enable row level security;
alter table public.registros_asistencia enable row level security;

-- Función: org_ids del usuario actual
create or replace function public.mis_org_ids()
returns setof uuid language sql security definer stable as $$
  select org_id from public.miembros_org where usuario_id = auth.uid()
$$;

-- Función: rol del usuario en una org
create or replace function public.mi_rol(p_org_id uuid)
returns text language sql security definer stable as $$
  select rol from public.miembros_org
  where usuario_id = auth.uid() and org_id = p_org_id limit 1
$$;

-- Políticas: organizaciones
create policy "ver propia org"
  on public.organizaciones for select
  using (id in (select mis_org_ids()));

create policy "propietario actualiza org"
  on public.organizaciones for update
  using (mi_rol(id) = 'propietario');

-- Políticas: miembros_org
create policy "ver miembros de la org"
  on public.miembros_org for select
  using (org_id in (select mis_org_ids()));

create policy "admin gestiona miembros"
  on public.miembros_org for all
  using (mi_rol(org_id) in ('propietario', 'admin'));

-- Políticas: programas
create policy "miembros ven programas"
  on public.programas for select
  using (org_id in (select mis_org_ids()));

create policy "coordinador gestiona programas"
  on public.programas for all
  using (mi_rol(org_id) in ('propietario', 'admin', 'coordinador'));

-- Políticas: grupos
create policy "miembros ven grupos"
  on public.grupos for select
  using (programa_id in (select id from public.programas where org_id in (select mis_org_ids())));

create policy "coordinador gestiona grupos"
  on public.grupos for all
  using (programa_id in (select id from public.programas where org_id in (select org_id from public.miembros_org where usuario_id = auth.uid() and rol in ('propietario', 'admin', 'coordinador'))));

-- Políticas: participantes
create policy "miembros ven participantes activos"
  on public.participantes for select
  using (org_id in (select mis_org_ids()) and eliminado_en is null);

create policy "coordinador gestiona participantes"
  on public.participantes for all
  using (mi_rol(org_id) in ('propietario', 'admin', 'coordinador'));

-- Políticas: inscripciones
create policy "miembros ven inscripciones"
  on public.inscripciones for select
  using (participante_id in (select id from public.participantes where org_id in (select mis_org_ids())));

create policy "coordinador gestiona inscripciones"
  on public.inscripciones for all
  using (participante_id in (select id from public.participantes where org_id in (select org_id from public.miembros_org where usuario_id = auth.uid() and rol in ('propietario', 'admin', 'coordinador'))));

-- Políticas: sesiones_asistencia
create policy "miembros ven sesiones"
  on public.sesiones_asistencia for select
  using (grupo_id in (select g.id from public.grupos g join public.programas p on p.id = g.programa_id where p.org_id in (select mis_org_ids())));

create policy "profesor gestiona sesiones"
  on public.sesiones_asistencia for all
  using (grupo_id in (select g.id from public.grupos g join public.programas p on p.id = g.programa_id where p.org_id in (select org_id from public.miembros_org where usuario_id = auth.uid() and rol in ('propietario', 'admin', 'coordinador', 'profesor'))));

-- Políticas: registros_asistencia
create policy "miembros ven registros"
  on public.registros_asistencia for select
  using (sesion_id in (select s.id from public.sesiones_asistencia s join public.grupos g on g.id = s.grupo_id join public.programas p on p.id = g.programa_id where p.org_id in (select mis_org_ids())));

create policy "profesor gestiona registros"
  on public.registros_asistencia for all
  using (sesion_id in (select s.id from public.sesiones_asistencia s join public.grupos g on g.id = s.grupo_id join public.programas p on p.id = g.programa_id where p.org_id in (select org_id from public.miembros_org where usuario_id = auth.uid() and rol in ('propietario', 'admin', 'coordinador', 'profesor'))));

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 4: VISTAS PARA DASHBOARD
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.v_resumen_asistencia as
select
  p.org_id,
  p.id                                                                    as programa_id,
  p.nombre                                                                as programa,
  p.color,
  g.id                                                                    as grupo_id,
  g.nombre                                                                as grupo,
  s.id                                                                    as sesion_id,
  s.fecha,
  s.estado                                                                as estado_sesion,
  count(r.id) filter (where r.estado = 'presente')                       as presentes,
  count(r.id) filter (where r.estado = 'ausente')                        as ausentes,
  count(r.id) filter (where r.estado = 'justificado')                    as justificados,
  count(r.id) filter (where r.estado = 'tarde')                          as tardes,
  count(r.id)                                                             as total,
  round(
    100.0 * count(r.id) filter (where r.estado in ('presente', 'tarde'))
    / nullif(count(r.id), 0), 1
  )                                                                       as porcentaje_asistencia
from public.sesiones_asistencia s
join public.grupos    g on g.id = s.grupo_id
join public.programas p on p.id = g.programa_id
left join public.registros_asistencia r on r.sesion_id = s.id
group by p.org_id, p.id, p.nombre, p.color, g.id, g.nombre, s.id, s.fecha, s.estado;

create or replace view public.v_asistencia_participante as
select
  pt.org_id,
  pt.id                                                                           as participante_id,
  pt.nombre_completo,
  pt.codigo,
  pt.datos_extra,
  count(r.id)                                                                     as total_sesiones,
  count(r.id) filter (where r.estado = 'presente')                               as presentes,
  count(r.id) filter (where r.estado = 'ausente')                                as ausentes,
  count(r.id) filter (where r.estado = 'justificado')                            as justificados,
  round(
    100.0 * count(r.id) filter (where r.estado in ('presente', 'tarde'))
    / nullif(count(r.id), 0), 1
  )                                                                               as porcentaje_asistencia
from public.participantes pt
left join public.registros_asistencia r on r.participante_id = pt.id
where pt.eliminado_en is null
group by pt.org_id, pt.id, pt.nombre_completo, pt.codigo, pt.datos_extra;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 5: DATOS INICIALES — Colegio Cristiano Aprender para Emprender
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.organizaciones (id, nombre, slug, plan) values
  ('00000000-0000-0000-0000-000000000001',
   'Colegio Cristiano Aprender para Emprender',
   'ccape', 'pro');

insert into public.miembros_org (org_id, usuario_id, rol) values
  ('00000000-0000-0000-0000-000000000001',
   'a9db5b8a-0011-4961-a0b8-b2939d1dbd4f',
   'propietario');

insert into public.programas (id, org_id, nombre, descripcion, color) values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Aprender para Emprender', 'Programa principal de formación integral', '#3B82F6'),
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Maternal', 'Atención temprana y desarrollo infantil', '#10B981'),
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Complementario', 'Actividades y talleres complementarios', '#F59E0B');

insert into public.grupos (programa_id, nombre, horario) values
  ('10000000-0000-0000-0000-000000000001', 'Lunes',     array['Lunes']),
  ('10000000-0000-0000-0000-000000000001', 'Martes',    array['Martes']),
  ('10000000-0000-0000-0000-000000000001', 'Miercoles', array['Miercoles']),
  ('10000000-0000-0000-0000-000000000001', 'Jueves',    array['Jueves']),
  ('10000000-0000-0000-0000-000000000001', 'Viernes',   array['Viernes']);
