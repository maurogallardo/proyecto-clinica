-- =============================================================================
-- Proyecto Clínica — Formulario N° 5: hoja de indicaciones médicas y controles
-- de enfermería (Fase 1: T005 a T009; la grilla de horarios, T011, NO está:
-- sigue bloqueada)
--
-- Se corre en el SQL Editor de Supabase, una sola vez, DESPUÉS de todos los del
-- ergométrico (schema.sql, seguridad.sql, guardado.sql, perfil.sql, papelera.sql
-- y edicion.sql): usa dos funciones de trigger que ya están creadas ahí.
--
-- Qué hace, en criollo:
--   1) La tabla de las hojas (hojas_indicaciones): una fila por hoja, con los
--      campos del papel en su orden, el N° de hoja, la fecha (la pone el reloj
--      de la base al guardar), quién la cargó y cuándo, la última edición y la
--      Papelera. Sin límite de hojas por día.
--   2) Los mismos controles automáticos que el ergométrico (triggers): no se
--      puede falsear quién la cargó ni cuándo; "Última edición"; la Papelera solo
--      se toca con sus funciones.
--   3) Las fotos: tabla hojas_imagenes y depósito privado propio, imagenes-hojas.
--   4) El historial de ediciones (sin ningún acceso desde la app) y el registro
--      de la Papelera (la app solo lo lee).
--   5) Reglas de acceso: cada usuario ve y carga solo lo suyo. La app puede ver e
--      insertar, pero no modificar ni borrar directo.
--   6) Las funciones guardar_hoja, editar_hoja, anular_hoja y restaurar_hoja, con
--      los MISMOS parámetros que las del ergométrico (p_id, p_estudio, p_etapas,
--      p_modificado_en) y los mismos textos de error que reconoce la app, así la
--      app no necesita ramas. Todas se pueden repetir sin duplicar nada.
--   7) La tabla de hojas se suma al tiempo real (Realtime).
--
-- Los datos mínimos para guardar (paciente y habitación) los controla SOLO la
-- app, igual que en el ergométrico (DNI y nombre): la base no los revisa.
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- 1) Tabla hojas_indicaciones: una fila por hoja.
--    Los campos del papel no tienen valor por defecto: si no se dictó, queda
--    vacío. Los que dependen de [A DEFINIR] (vi) (diuresis, drenajes, SNG /
--    vómitos, deposiciones y controles de enfermería) son texto libre, para no
--    perder nada de lo que se dicte ("800 cc", "36,5", dos tensiones en un turno).
-- -----------------------------------------------------------------------------
create table public.hojas_indicaciones (
  id                      uuid primary key default gen_random_uuid(),

  -- N° de hoja: lo pone la base sola, en orden. Nadie lo puede escribir ni
  -- cambiar, y no se reutiliza (si un guardado falla, ese número puede quedar
  -- salteado: es normal en las bases de datos)
  numero                  bigint generated always as identity unique,

  -- Encabezado del papel
  -- Fecha: SIEMPRE la del reloj de la base al guardar, en hora de Argentina
  -- (Córdoba). Sale de creado_en, que nadie puede cambiar: no se dicta, no se
  -- escribe y la edición no la toca
  fecha                   date generated always as ((creado_en at time zone 'America/Argentina/Cordoba')::date) stored,
  habitacion              text,          -- "Hab." (puede tener letras: "12 B")
  mutual                  text,
  doctor                  text,          -- "Dr.": un campo más, sin obligación
  paciente                text,          -- "Pte."
  -- "Trámite adm.": texto controlado (RF-018), solo "SÍ" o "NO" (o vacío)
  tramite_administrativo  text check (tramite_administrativo in ('SÍ', 'NO')),
  diagnostico             text,

  -- Indicaciones médicas (columna izquierda del papel)
  csv                     text,          -- "C.S.V."
  tomografia              text,
  electrocardiograma      text,
  laboratorio             text,
  medicacion              text,          -- varios renglones
  dieta                   text,

  -- Parte de abajo del papel
  hidratacion             text,
  diuresis_05_13          text,          -- "05 a 13 ="
  diuresis_13_21          text,          -- "13 a 21 ="
  diuresis_21_05          text,          -- "21 a 5 ="
  drenajes                text,          -- uno solo, como en el papel
  sng_vomitos             text,          -- "SNG / Vómitos"
  deposiciones            text,

  -- Controles de enfermería, por turno (Mañana, Tarde y Noche, como en el papel):
  -- F.R., Te., P., T.A. y O2
  control_manana_fr       text,
  control_manana_te       text,
  control_manana_p        text,
  control_manana_ta       text,
  control_manana_o2       text,
  control_tarde_fr        text,
  control_tarde_te        text,
  control_tarde_p         text,
  control_tarde_ta        text,
  control_tarde_o2        text,
  control_noche_fr        text,
  control_noche_te        text,
  control_noche_p         text,
  control_noche_ta        text,
  control_noche_o2        text,

  -- Trazabilidad: quién la cargó y cuándo (automáticos; los mismos nombres que
  -- en estudios, para usar los mismos triggers)
  cargado_por             uuid not null default auth.uid() references auth.users (id),
  creado_en               timestamptz not null default now(),   -- fecha y hora de CARGA

  -- Trazabilidad: quién la editó por última vez y cuándo (los pone la base;
  -- vacíos si nunca se editó)
  modificado_por          uuid references auth.users (id),
  modificado_en           timestamptz,

  -- Papelera: ¿está en la Papelera? ¿desde cuándo y quién la mandó? (una "foto"
  -- del último borrado; al restaurar se vacían)
  en_papelera             boolean not null default false,
  en_papelera_desde       timestamptz,
  en_papelera_por         uuid references auth.users (id),
  en_papelera_por_correo  text
);

-- Para que la lista de cada usuario (sin las de la Papelera) sea rápida
create index hojas_indicaciones_cargado_por_idx on public.hojas_indicaciones (cargado_por);
create index hojas_indicaciones_en_papelera_idx on public.hojas_indicaciones (cargado_por, en_papelera);

-- -----------------------------------------------------------------------------
-- 2) Controles automáticos (triggers). Se reutilizan dos funciones del
--    ergométrico (trabajan con columnas que se llaman igual) y la tercera,
--    la de "Última edición", es propia de esta tabla (se crea más abajo). Solo se
--    crean los triggers nuevos.
--      - proteger_datos_de_carga (seguridad.sql): al crear, creado_en = ahora
--        (y por eso la fecha de la hoja es la de hoy); al editar, cargado_por y
--        creado_en quedan como estaban.
--      - proteger_papelera (papelera.sql): una hoja nueva nunca nace en la
--        Papelera, y las columnas de la Papelera solo las cambian anular_hoja y
--        restaurar_hoja. (Su mensaje de error nombra las funciones del
--        ergométrico; solo saldría si alguien intentara un cambio directo, que la
--        app no puede hacer porque no tiene permiso de modificar.)
--      - registrar_modificacion_hoja (propia de esta tabla; copia de la de
--        edicion.sql que además ignora la columna calculada "fecha"): "Última
--        edición"; mandar a la Papelera o restaurar no cuenta como edición.
--    Se ejecutan en orden alfabético, igual que en estudios.
-- -----------------------------------------------------------------------------
create trigger hojas_proteger_datos_de_carga
  before insert or update on public.hojas_indicaciones
  for each row execute function public.proteger_datos_de_carga();

create trigger hojas_proteger_papelera
  before insert or update on public.hojas_indicaciones
  for each row execute function public.proteger_papelera();

-- "Última edición": esta tabla tiene su PROPIA versión de la función (la del
-- ergométrico, registrar_modificacion, no se toca). Es igual, pero además ignora la
-- columna "fecha": es una columna calculada y, dentro de este control, todavía no
-- tiene su valor nuevo; sin ignorarla, mandar a la Papelera o restaurar contaría
-- como edición.
create function public.registrar_modificacion_hoja()
returns trigger
language plpgsql
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
declare
  columnas_a_ignorar text[] := array['en_papelera', 'en_papelera_desde', 'en_papelera_por',
                                     'en_papelera_por_correo', 'modificado_por', 'modificado_en', 'fecha'];
begin
  if tg_op = 'INSERT' then
    new.modificado_por := null;
    new.modificado_en  := null;
  elsif coalesce(current_setting('clinica.edicion', true), '') = 'si' then
    -- Lo está haciendo editar_hoja: quién y cuándo ya vienen puestos
    null;
  elsif (to_jsonb(new) - columnas_a_ignorar) = (to_jsonb(old) - columnas_a_ignorar) then
    -- Solo cambió la Papelera: la última edición queda como estaba
    new.modificado_por := old.modificado_por;
    new.modificado_en  := old.modificado_en;
  else
    new.modificado_por := auth.uid();
    new.modificado_en  := now();
  end if;
  return new;
end;
$$;

create trigger hojas_registrar_modificacion
  before insert or update on public.hojas_indicaciones
  for each row execute function public.registrar_modificacion_hoja();

-- -----------------------------------------------------------------------------
-- 3) Fotos de la hoja: tabla hojas_imagenes (una fila por foto). Guarda solo la
--    RUTA del archivo en el depósito privado, no la foto en sí. La app siempre
--    manda "tipo"; qué valor lleva en el N° 5 se define en la Fase 2.
--    Si alguien borra una hoja A MANO desde Supabase (no desde la app), se
--    borran estas filas (los archivos del depósito, no).
-- -----------------------------------------------------------------------------
create table public.hojas_imagenes (
  id            uuid primary key default gen_random_uuid(),
  hoja_id       uuid not null references public.hojas_indicaciones (id) on delete cascade,
  ruta_archivo  text not null,
  tipo          text,
  creado_en     timestamptz not null default now()
);

create index hojas_imagenes_hoja_id_idx on public.hojas_imagenes (hoja_id);

-- Depósito privado propio para las fotos de las hojas (no se comparte con el del
-- ergométrico: cada planilla tiene sus reglas)
--   - public = false: no hay direcciones públicas; se ven con enlaces firmados
--     que caducan.
--   - Solo WebP y hasta 5 MB por archivo (como el del ergométrico).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes-hojas', 'imagenes-hojas', false, 5242880, array['image/webp']);

-- -----------------------------------------------------------------------------
-- 4) Historial de ediciones: una fila por cada vez que se guarda un cambio, con
--    cómo estaba la hoja ANTES (la fila completa), quién (id y correo) y cuándo
--    (hora del servidor). Solo lo escribe editar_hoja. Sin ningún acceso desde
--    la app, ni para leer (tiene datos de pacientes).
-- -----------------------------------------------------------------------------
create table public.hojas_historial (
  id                  bigint generated always as identity primary key,
  -- Si alguien borra una hoja A MANO desde Supabase, se borra también su historial
  hoja_id             uuid not null references public.hojas_indicaciones (id) on delete cascade,
  hoja_antes          jsonb not null,                      -- la fila completa, como estaba
  editado_por         uuid not null references auth.users (id),
  editado_por_correo  text,                                -- copia del correo
  editado_en          timestamptz not null default now()   -- la hora del servidor
);

create index hojas_historial_hoja_idx on public.hojas_historial (hoja_id);

-- Registro de la Papelera: una fila por cada borrado y cada restauración. Solo lo
-- escriben anular_hoja y restaurar_hoja; la app solo lo puede leer.
create table public.hojas_papelera_registro (
  id              bigint generated always as identity primary key,
  hoja_id         uuid not null references public.hojas_indicaciones (id) on delete cascade,
  accion          text not null check (accion in ('anular', 'restaurar')),
  usuario_id      uuid not null references auth.users (id),
  usuario_correo  text,                               -- copia del correo, para mostrarlo
  hecho_en        timestamptz not null default now()  -- la hora del servidor
);

create index hojas_papelera_registro_hoja_idx on public.hojas_papelera_registro (hoja_id);

-- -----------------------------------------------------------------------------
-- 5) Reglas de acceso.
--    RLS (candado por fila) encendido en las cuatro tablas: sin una regla que lo
--    permita, nadie lee ni escribe.
-- -----------------------------------------------------------------------------
alter table public.hojas_indicaciones      enable row level security;
alter table public.hojas_imagenes          enable row level security;
alter table public.hojas_historial         enable row level security;
alter table public.hojas_papelera_registro enable row level security;

-- Permisos: primero se sacan todos (Supabase puede dar "todos los permisos" a las
-- tablas nuevas) y después se da solo lo que usa la app. Los anónimos, nada.
revoke all on public.hojas_indicaciones, public.hojas_imagenes,
              public.hojas_historial, public.hojas_papelera_registro
  from public, anon, authenticated;

-- Hojas: ver e insertar (guardar_hoja corre con los permisos del usuario). Sin
-- modificar ni borrar directo: las correcciones pasan por editar_hoja, que deja
-- historial, y "borrar" es mandar a la Papelera.
grant select, insert on public.hojas_indicaciones to authenticated;
-- Fotos: ver y adjuntar (no se reemplazan ni se borran)
grant select, insert on public.hojas_imagenes to authenticated;
-- Registro de la Papelera: solo leer
grant select on public.hojas_papelera_registro to authenticated;
-- Historial: ningún permiso (ni leer)

-- (select auth.uid()) = el usuario logueado. Va entre paréntesis porque así
-- Supabase lo calcula una sola vez por consulta y no una vez por fila.

-- Hojas: solo las que cargó el usuario
create policy "Ver mis hojas" on public.hojas_indicaciones
  for select to authenticated
  using (cargado_por = (select auth.uid()));

create policy "Crear hojas a mi nombre" on public.hojas_indicaciones
  for insert to authenticated
  with check (cargado_por = (select auth.uid()));

-- Fotos (la fila con la ruta): solo las de hojas que cargó el usuario
create policy "Ver fotos de mis hojas" on public.hojas_imagenes
  for select to authenticated
  using (exists (select 1 from public.hojas_indicaciones h
                 where h.id = hoja_id and h.cargado_por = (select auth.uid())));

create policy "Adjuntar fotos a mis hojas" on public.hojas_imagenes
  for insert to authenticated
  with check (exists (select 1 from public.hojas_indicaciones h
                      where h.id = hoja_id and h.cargado_por = (select auth.uid())));

-- Registro de la Papelera: el de las hojas propias
create policy "Ver el registro de la papelera de mis hojas" on public.hojas_papelera_registro
  for select to authenticated
  using (exists (select 1 from public.hojas_indicaciones h
                 where h.id = hoja_id and h.cargado_por = (select auth.uid())));

-- Historial: RLS encendido y sin reglas (y sin permisos): nadie lo ve desde la app

-- Reglas del depósito (los archivos en sí). Cada foto va en una carpeta con el id
-- de su hoja:   imagenes-hojas/<hoja_id>/<archivo>.webp
-- Solo puede subirla o verla quien cargó esa hoja. Ver incluye generar el enlace
-- firmado. No se permite reemplazar ni borrar (igual que la tabla de fotos).
create policy "Ver fotos de mis hojas" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagenes-hojas'
         and exists (select 1 from public.hojas_indicaciones h
                     where h.id::text = (storage.foldername(name))[1]
                       and h.cargado_por = (select auth.uid())));

create policy "Subir fotos a mis hojas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes-hojas'
              and exists (select 1 from public.hojas_indicaciones h
                          where h.id::text = (storage.foldername(name))[1]
                            and h.cargado_por = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- 6a) Guardar la hoja (todo o nada), como guardar_estudio.
--
--   - Corre con los permisos del usuario (security invoker): valen las reglas de
--     arriba (cada usuario guarda solo lo suyo).
--   - Solo toma los campos del papel: numero, fecha, cargado_por, creado_en,
--     modificado_* y la Papelera los pone la base (no se pueden falsear).
--   - p_id lo arma la app antes de guardar y lo repite en cada reintento: si esa
--     hoja ya se había guardado, devuelve su número en lugar de duplicarla (se
--     puede repetir sin miedo).
--   - p_etapas se recibe para que la app no necesite ramas, pero no se usa: el
--     N° 5 no tiene etapas (la grilla de horarios está bloqueada).
--   - Devuelve { id, numero, ya_estaba }.
-- -----------------------------------------------------------------------------
create function public.guardar_hoja(p_id uuid, p_estudio jsonb, p_etapas jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
declare
  v_numero bigint;
begin
  -- ¿Ya se había guardado esta misma hoja? (reintento): devolver su número
  select h.numero into v_numero from public.hojas_indicaciones h where h.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', true);
  end if;

  begin
    -- La hoja: solo los campos del papel (lo vacío llega como null)
    insert into public.hojas_indicaciones (
      id, habitacion, mutual, doctor, paciente, tramite_administrativo, diagnostico,
      csv, tomografia, electrocardiograma, laboratorio, medicacion, dieta,
      hidratacion, diuresis_05_13, diuresis_13_21, diuresis_21_05,
      drenajes, sng_vomitos, deposiciones,
      control_manana_fr, control_manana_te, control_manana_p, control_manana_ta, control_manana_o2,
      control_tarde_fr,  control_tarde_te,  control_tarde_p,  control_tarde_ta,  control_tarde_o2,
      control_noche_fr,  control_noche_te,  control_noche_p,  control_noche_ta,  control_noche_o2
    )
    select
      p_id, d.habitacion, d.mutual, d.doctor, d.paciente, d.tramite_administrativo, d.diagnostico,
      d.csv, d.tomografia, d.electrocardiograma, d.laboratorio, d.medicacion, d.dieta,
      d.hidratacion, d.diuresis_05_13, d.diuresis_13_21, d.diuresis_21_05,
      d.drenajes, d.sng_vomitos, d.deposiciones,
      d.control_manana_fr, d.control_manana_te, d.control_manana_p, d.control_manana_ta, d.control_manana_o2,
      d.control_tarde_fr,  d.control_tarde_te,  d.control_tarde_p,  d.control_tarde_ta,  d.control_tarde_o2,
      d.control_noche_fr,  d.control_noche_te,  d.control_noche_p,  d.control_noche_ta,  d.control_noche_o2
    from jsonb_populate_record(null::public.hojas_indicaciones, p_estudio) as d
    returning numero into v_numero;
  exception when unique_violation then
    -- Dos pedidos iguales al mismo tiempo (doble toque): el otro ya la guardó
    select h.numero into v_numero from public.hojas_indicaciones h where h.id = p_id;
    if not found then
      raise exception 'No se pudo guardar la hoja';
    end if;
    return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', true);
  end;

  return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6b) Editar la hoja, con historial, como editar_estudio.
--
--   Recibe:
--     p_id             la hoja
--     p_estudio        los campos del papel (los mismos que guardar_hoja; lo
--                      vacío llega como null). Se llama igual que en el
--                      ergométrico para que la app no necesite ramas.
--     p_etapas         no se usa (el N° 5 no tiene etapas); se recibe igual
--     p_modificado_en  el modificado_en que tenía la ficha al abrir la edición,
--                      COMO TEXTO, tal cual vino del servidor. null si la hoja
--                      nunca se había editado.
--
--   Corre con permisos del dueño de la base ("security definer") porque la app
--   no puede modificar directo; por eso controla ella misma:
--     - que haya un usuario logueado;
--     - que la hoja sea de ese usuario (cargado_por = él);
--     - que no esté en la Papelera;
--     - que nadie la haya cambiado mientras tanto (edición cruzada, código CL409).
--   Repetirla es seguro: si se manda dos veces el mismo cambio, la segunda ve un
--   modificado_en distinto y no guarda nada (edición cruzada).
--
--   Solo cambia los campos del papel. NO cambia: id, numero, fecha, cargado_por,
--   creado_en, la Papelera ni las fotos. modificado_por y modificado_en los pone ella.
--
--   Si no hay cambios: no guarda historial, no marca "Última edición" y avisa
--   "sin cambios".
--
--   Los errores dicen "No se encontró el estudio" y "... Papelera ..." porque son
--   los textos que reconoce la app (js/edicion.js y js/papelera.js); en pantalla
--   se ve el texto de la planilla, no este.
--
--   Devuelve { id, numero, modificado_en, sin_cambios }.
--   Todo pasa en una sola transacción: si algo falla, no queda nada a medias.
-- -----------------------------------------------------------------------------
create function public.editar_hoja(p_id uuid, p_estudio jsonb, p_etapas jsonb, p_modificado_en text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario        uuid := auth.uid();
  v_correo         text;
  v_actual         public.hojas_indicaciones;
  v_nuevo          public.hojas_indicaciones;
  v_etapas         jsonb := coalesce(p_etapas, '[]'::jsonb);
  v_modificado_en  timestamptz;
  -- La lista blanca: los campos del papel (los mismos de guardar_hoja)
  v_campos         text[] := array[
    'habitacion', 'mutual', 'doctor', 'paciente', 'tramite_administrativo', 'diagnostico',
    'csv', 'tomografia', 'electrocardiograma', 'laboratorio', 'medicacion', 'dieta',
    'hidratacion', 'diuresis_05_13', 'diuresis_13_21', 'diuresis_21_05',
    'drenajes', 'sng_vomitos', 'deposiciones',
    'control_manana_fr', 'control_manana_te', 'control_manana_p', 'control_manana_ta', 'control_manana_o2',
    'control_tarde_fr',  'control_tarde_te',  'control_tarde_p',  'control_tarde_ta',  'control_tarde_o2',
    'control_noche_fr',  'control_noche_te',  'control_noche_p',  'control_noche_ta',  'control_noche_o2'];
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if p_estudio is null or jsonb_typeof(p_estudio) <> 'object' or jsonb_typeof(v_etapas) <> 'array' then
    raise exception 'Faltan los datos de la hoja';
  end if;

  -- La hoja, bloqueada mientras tanto (si otro la está guardando, espera)
  select * into v_actual
  from public.hojas_indicaciones h
  where h.id = p_id and h.cargado_por = v_usuario
  for update;
  if not found then
    raise exception 'No se encontró el estudio';   -- texto que reconoce la app
  end if;
  if v_actual.en_papelera then
    raise exception 'La hoja está en la Papelera: primero hay que restaurarla';
  end if;

  -- Edición cruzada: ¿sigue como estaba cuando se abrió la edición?
  -- ("is not distinct from" porque una hoja nunca editada tiene null)
  if v_actual.modificado_en is distinct from nullif(p_modificado_en, '')::timestamptz then
    raise exception using
      errcode = 'CL409',   -- código propio, para que la app lo reconozca
      message = 'Esta hoja la modificó otra persona o se editó en otra pestaña mientras la editabas. No se guardó el cambio.';
  end if;

  -- Los datos nuevos, pasados por la forma de la tabla (tipos iguales que al guardar)
  v_nuevo := jsonb_populate_record(null::public.hojas_indicaciones, p_estudio);

  -- ¿Hay cambios? Se comparan solo los campos del papel
  if (select jsonb_object_agg(c.key, c.value) from jsonb_each(to_jsonb(v_nuevo)) c where c.key = any(v_campos))
     = (select jsonb_object_agg(c.key, c.value) from jsonb_each(to_jsonb(v_actual)) c where c.key = any(v_campos))
  then
    return jsonb_build_object('id', p_id, 'numero', v_actual.numero,
                              'modificado_en', v_actual.modificado_en, 'sin_cambios', true);
  end if;

  -- El correo, del ingreso del usuario (o de la tabla de usuarios, por las dudas)
  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  -- 1) Primero, al historial: cómo estaba ANTES (la hoja completa)
  insert into public.hojas_historial (hoja_id, hoja_antes, editado_por, editado_por_correo)
  values (p_id, to_jsonb(v_actual), v_usuario, v_correo);

  -- 2) La hoja: solo los campos del papel, y quién y cuándo la editó. La marca
  --    clinica.edicion (dura solo mientras se ejecuta) le avisa al trigger de
  --    "Última edición" que quién y cuándo ya vienen puestos.
  perform set_config('clinica.edicion', 'si', true);
  update public.hojas_indicaciones h set
    habitacion = v_nuevo.habitacion, mutual = v_nuevo.mutual, doctor = v_nuevo.doctor,
    paciente = v_nuevo.paciente, tramite_administrativo = v_nuevo.tramite_administrativo,
    diagnostico = v_nuevo.diagnostico,
    csv = v_nuevo.csv, tomografia = v_nuevo.tomografia, electrocardiograma = v_nuevo.electrocardiograma,
    laboratorio = v_nuevo.laboratorio, medicacion = v_nuevo.medicacion, dieta = v_nuevo.dieta,
    hidratacion = v_nuevo.hidratacion, diuresis_05_13 = v_nuevo.diuresis_05_13,
    diuresis_13_21 = v_nuevo.diuresis_13_21, diuresis_21_05 = v_nuevo.diuresis_21_05,
    drenajes = v_nuevo.drenajes, sng_vomitos = v_nuevo.sng_vomitos, deposiciones = v_nuevo.deposiciones,
    control_manana_fr = v_nuevo.control_manana_fr, control_manana_te = v_nuevo.control_manana_te,
    control_manana_p = v_nuevo.control_manana_p, control_manana_ta = v_nuevo.control_manana_ta,
    control_manana_o2 = v_nuevo.control_manana_o2,
    control_tarde_fr = v_nuevo.control_tarde_fr, control_tarde_te = v_nuevo.control_tarde_te,
    control_tarde_p = v_nuevo.control_tarde_p, control_tarde_ta = v_nuevo.control_tarde_ta,
    control_tarde_o2 = v_nuevo.control_tarde_o2,
    control_noche_fr = v_nuevo.control_noche_fr, control_noche_te = v_nuevo.control_noche_te,
    control_noche_p = v_nuevo.control_noche_p, control_noche_ta = v_nuevo.control_noche_ta,
    control_noche_o2 = v_nuevo.control_noche_o2,
    modificado_por = v_usuario,
    modificado_en = now()
  where h.id = p_id
  returning h.modificado_en into v_modificado_en;
  perform set_config('clinica.edicion', '', true);

  return jsonb_build_object('id', p_id, 'numero', v_actual.numero,
                            'modificado_en', v_modificado_en, 'sin_cambios', false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6c) Mandar a la Papelera y restaurar, como anular_estudio y restaurar_estudio.
--     Nunca se borra nada de verdad: la hoja, sus fotos y su historial quedan.
--     Corren con permisos del dueño de la base ("security definer") para poder
--     escribir el registro, así que controlan ellas mismas que haya un usuario
--     logueado y que la hoja sea suya. La marca clinica.papelera (dura solo
--     mientras se ejecutan) le avisa al trigger que son ellas.
--     Devuelven { id, numero, en_papelera, ya_estaba }. Si se tocan dos veces
--     seguidas (doble clic), la segunda no hace nada ni duplica el registro.
-- -----------------------------------------------------------------------------
create function public.anular_hoja(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_correo  text;
  v_hoja    record;
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select h.id, h.numero, h.en_papelera into v_hoja
  from public.hojas_indicaciones h
  where h.id = p_id and h.cargado_por = v_usuario
  for update;   -- nadie más la toca mientras tanto
  if not found then
    raise exception 'No se encontró el estudio';   -- texto que reconoce la app
  end if;
  if v_hoja.en_papelera then
    return jsonb_build_object('id', p_id, 'numero', v_hoja.numero, 'en_papelera', true, 'ya_estaba', true);
  end if;

  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  perform set_config('clinica.papelera', 'si', true);
  update public.hojas_indicaciones
     set en_papelera = true, en_papelera_desde = now(),
         en_papelera_por = v_usuario, en_papelera_por_correo = v_correo
   where id = p_id;
  perform set_config('clinica.papelera', '', true);

  insert into public.hojas_papelera_registro (hoja_id, accion, usuario_id, usuario_correo)
  values (p_id, 'anular', v_usuario, v_correo);

  return jsonb_build_object('id', p_id, 'numero', v_hoja.numero, 'en_papelera', true, 'ya_estaba', false);
end;
$$;

create function public.restaurar_hoja(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_correo  text;
  v_hoja    record;
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select h.id, h.numero, h.en_papelera into v_hoja
  from public.hojas_indicaciones h
  where h.id = p_id and h.cargado_por = v_usuario
  for update;
  if not found then
    raise exception 'No se encontró el estudio';   -- texto que reconoce la app
  end if;
  if not v_hoja.en_papelera then
    return jsonb_build_object('id', p_id, 'numero', v_hoja.numero, 'en_papelera', false, 'ya_estaba', true);
  end if;

  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  perform set_config('clinica.papelera', 'si', true);
  update public.hojas_indicaciones
     set en_papelera = false, en_papelera_desde = null,
         en_papelera_por = null, en_papelera_por_correo = null
   where id = p_id;
  perform set_config('clinica.papelera', '', true);

  insert into public.hojas_papelera_registro (hoja_id, accion, usuario_id, usuario_correo)
  values (p_id, 'restaurar', v_usuario, v_correo);

  return jsonb_build_object('id', p_id, 'numero', v_hoja.numero, 'en_papelera', false, 'ya_estaba', false);
end;
$$;

-- Las cuatro funciones: solo las pueden usar los usuarios logueados (ni el
-- público ni los anónimos)
revoke all on function public.guardar_hoja(uuid, jsonb, jsonb)         from public, anon;
revoke all on function public.editar_hoja(uuid, jsonb, jsonb, text)    from public, anon;
revoke all on function public.anular_hoja(uuid)                        from public, anon;
revoke all on function public.restaurar_hoja(uuid)                     from public, anon;
grant execute on function public.guardar_hoja(uuid, jsonb, jsonb)      to authenticated;
grant execute on function public.editar_hoja(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.anular_hoja(uuid)                     to authenticated;
grant execute on function public.restaurar_hoja(uuid)                  to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Tiempo real (Realtime): la lista del dashboard se actualiza sola cuando se
--    guarda, edita o manda a la Papelera una hoja. Realtime respeta las mismas
--    reglas de RLS: cada usuario recibe solo los avisos de sus hojas.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.hojas_indicaciones;

commit;

-- =============================================================================
-- COMPROBACIÓN (SOLO LECTURA). No cambia nada. Se pega aparte en el SQL Editor,
-- DESPUÉS de correr este archivo. Sacale los "-- " del principio a cada línea
-- (está comentada para que no se ejecute junto con lo de arriba).
--
-- Lo que tiene que dar:
--   tabla                     rls  anon  ve    inserta modifica borra reglas tiempo_real
--   hojas_indicaciones        t    f     t     t       f        f     2      t
--   hojas_imagenes            t    f     t     t       f        f     2      f
--   hojas_historial           t    f     f     f       f        f     0      f
--   hojas_papelera_registro   t    f     t     f       f        f     1      f
--   funciones: anon_puede = f y app_puede = t en las cuatro; corre_como_dueno =
--     f en guardar_hoja y t en editar_hoja, anular_hoja y restaurar_hoja.
--   triggers: los tres hojas_... ; depósito: imagenes-hojas, privado, 5242880,
--     {image/webp}; reglas del depósito: "Subir fotos a mis hojas" (INSERT) y
--     "Ver fotos de mis hojas" (SELECT).
-- =============================================================================
-- select t.tabla,
--        c.relrowsecurity                                                         as rls,
--        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as anon,
--        has_table_privilege('authenticated', c.oid, 'SELECT')                    as ve,
--        has_table_privilege('authenticated', c.oid, 'INSERT')                    as inserta,
--        has_table_privilege('authenticated', c.oid, 'UPDATE')                    as modifica,
--        has_table_privilege('authenticated', c.oid, 'DELETE,TRUNCATE')           as borra,
--        (select count(*) from pg_policies p
--          where p.schemaname = 'public' and p.tablename = t.tabla)               as reglas,
--        exists (select 1 from pg_publication_tables r
--                 where r.pubname = 'supabase_realtime' and r.schemaname = 'public'
--                   and r.tablename = t.tabla)                                    as tiempo_real
-- from (values ('hojas_indicaciones'), ('hojas_imagenes'), ('hojas_historial'), ('hojas_papelera_registro')) as t (tabla)
-- join pg_class c on c.oid = ('public.' || t.tabla)::regclass;
--
-- select p.proname                                            as funcion,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_puede,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as app_puede,
--        p.prosecdef                                          as corre_como_dueno
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname in ('guardar_hoja', 'editar_hoja', 'anular_hoja', 'restaurar_hoja')
-- order by p.proname;
--
-- select tgname as trigger from pg_trigger
-- where tgrelid = 'public.hojas_indicaciones'::regclass and not tgisinternal
-- order by tgname;
--
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets
-- where id = 'imagenes-hojas';
--
-- select policyname, cmd from pg_policies
-- where schemaname = 'storage' and tablename = 'objects' and policyname like '%mis hojas%'
-- order by policyname;
-- =============================================================================
