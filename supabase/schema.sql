-- =============================================================================
-- Proyecto Clínica — Tablas del Estudio Ergométrico (T006, T007, T008)
--
-- Se corre en el SQL Editor de Supabase. Sigue el modelo de datos del plan
-- (specs/001-estudio-ergometrico/plan.md).
--
-- Seguridad:
--   - Cada tabla tiene RLS encendido: sin políticas, nadie lee ni escribe.
--     Las políticas se agregan en la T012.
--   - Solo los usuarios logueados (authenticated) reciben permisos.
--     Los anónimos (anon) no reciben ninguno.
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- T006 — Tabla estudios: una fila por estudio (lo que aparece una vez en la planilla)
-- Los campos de datos médicos no tienen valor por defecto: si no se dictó, queda vacío.
-- -----------------------------------------------------------------------------
create table public.estudios (
  id                  uuid primary key default gen_random_uuid(),

  -- Datos del paciente
  documento           text,          -- limpio, sin puntos (para futuro macheo de pacientes)
  nombre_paciente     text,
  sexo                text,
  edad                integer,
  peso                numeric,       -- admite 72.5
  talla               numeric,       -- admite 1.75

  -- Datos del estudio
  fecha_estudio       date,          -- fecha de la prueba; la dicta o corrige el profesional
  medico_solicitante  text,
  motivo              text,
  antecedentes        text,
  tecnica             text,
  posicion            text,
  fc_teorica          integer,
  fc_alcanzada        integer,
  porcentaje          numeric,

  -- ECG basal
  ecg_ritmo           text,
  ecg_eje             text,
  ecg_fcia            text,
  ecg_p               text,
  ecg_pq              text,
  ecg_qrs             text,
  ecg_qt              text,

  conclusion          text,
  interrupcion_prueba text,

  -- Postesfuerzo a los 5'
  post_ta             text,          -- "120/80"
  post_fc             integer,
  post_ecg            text,
  post_clinica        text,

  -- Trazabilidad: quién lo cargó y cuándo (automáticos)
  cargado_por         uuid not null default auth.uid() references auth.users (id),
  creado_en           timestamptz not null default now(),  -- fecha/hora de CARGA (distinta de fecha_estudio)

  -- Trazabilidad: quién lo editó por última vez y cuándo.
  -- Los completa solo el trigger de más abajo; vacíos si nunca se editó.
  modificado_por      uuid references auth.users (id),
  modificado_en       timestamptz
);

-- Trigger de trazabilidad: la base completa modificado_por/modificado_en sola,
-- pisando lo que mande la app, para que no se puedan falsear.
--   - Al crear un estudio: quedan vacíos (todavía nadie lo editó).
--   - Al editarlo: quién (el usuario logueado) y cuándo (ahora).
create function public.registrar_modificacion()
returns trigger
language plpgsql
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
begin
  if tg_op = 'INSERT' then
    new.modificado_por := null;
    new.modificado_en  := null;
  else
    new.modificado_por := auth.uid();
    new.modificado_en  := now();
  end if;
  return new;
end;
$$;

create trigger estudios_registrar_modificacion
  before insert or update on public.estudios
  for each row execute function public.registrar_modificacion();

-- -----------------------------------------------------------------------------
-- T007 — Tabla etapas: varias filas por estudio (la tabla "Reposo y esfuerzo")
-- Si se borra un estudio, se borran sus etapas.
-- -----------------------------------------------------------------------------
create table public.etapas (
  id          uuid primary key default gen_random_uuid(),
  estudio_id  uuid not null references public.estudios (id) on delete cascade,
  tiempo      integer,   -- 0, 3, 6, 9...
  carga       integer,   -- 0, 50, 100, 150...
  met         numeric,   -- admite 8.5
  ta          text,      -- "160/90"
  fc          integer,
  ecg         text,
  clinica     text
);

-- -----------------------------------------------------------------------------
-- T008 — Tabla imagenes: varias filas por estudio
-- Guarda solo la RUTA de la imagen en el bucket privado, no la imagen en sí.
-- Si se borra un estudio, se borran estas filas (los archivos del bucket, no).
-- -----------------------------------------------------------------------------
create table public.imagenes (
  id            uuid primary key default gen_random_uuid(),
  estudio_id    uuid not null references public.estudios (id) on delete cascade,
  ruta_archivo  text not null,
  tipo          text check (tipo in ('electro', 'paciente', 'otro')),
  creado_en     timestamptz not null default now()
);

-- Índices para buscar rápido las etapas e imágenes de un estudio
create index etapas_estudio_id_idx   on public.etapas (estudio_id);
create index imagenes_estudio_id_idx on public.imagenes (estudio_id);

-- -----------------------------------------------------------------------------
-- RLS (candado por fila). El proyecto ya lo enciende solo; se deja escrito
-- para que quede claro y funcione igual en cualquier proyecto.
-- -----------------------------------------------------------------------------
alter table public.estudios enable row level security;
alter table public.etapas   enable row level security;
alter table public.imagenes enable row level security;

-- -----------------------------------------------------------------------------
-- Permisos: los anónimos no tienen ninguno; los logueados, solo lo que el flujo usa.
-- -----------------------------------------------------------------------------
revoke all on public.estudios, public.etapas, public.imagenes from anon;

-- Estudios: consultar, crear y editar (la demo no borra estudios)
grant select, insert, update         on public.estudios to authenticated;
-- Etapas: además se pueden quitar (RF-023b)
grant select, insert, update, delete on public.etapas   to authenticated;
-- Imágenes: consultar y adjuntar
grant select, insert                 on public.imagenes to authenticated;

commit;
