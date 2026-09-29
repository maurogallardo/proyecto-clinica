-- =============================================================================
-- Proyecto Clínica — Papelera de estudios (borrado lógico)
--
-- Se corre en el SQL Editor de Supabase, una sola vez, DESPUÉS de schema.sql,
-- seguridad.sql, guardado.sql y perfil.sql. (Ya corrido en Supabase.)
--
-- Qué hace, en criollo:
--   - "Borrar" un estudio lo manda a la Papelera: NUNCA se borra de verdad desde
--     la app. Se conservan el estudio, sus etapas y sus fotos (no se toca Storage).
--   - Cada vez que un estudio va a la Papelera o vuelve (se restaura), queda
--     anotado quién lo hizo (su id y una copia de su correo) y a qué hora. La
--     hora la pone el servidor, no el navegador. Ese registro no se puede editar
--     ni borrar desde la app.
--   - Solo se puede mandar a la Papelera o restaurar con dos funciones:
--     anular_estudio(id) y restaurar_estudio(id). La app no puede hacerlo de otra
--     forma: ni con DELETE (no tiene ese permiso sobre estudios) ni con UPDATE
--     directo (un control de la base lo rechaza).
--   - Quién puede: cualquier usuario logueado, sobre los estudios que puede ver
--     (hoy, los que cargó él: es la regla de acceso actual de seguridad.sql).
--   - El número del estudio no se reutiliza (la fila no se borra).
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- 1) Estado del estudio: ¿está en la Papelera? ¿desde cuándo y quién lo mandó?
--    (Son una "foto" del último borrado, para mostrar la lista de la Papelera sin
--    tener que buscar en el registro. Al restaurar, se vacían.)
-- -----------------------------------------------------------------------------
alter table public.estudios
  add column en_papelera            boolean not null default false,
  add column en_papelera_desde      timestamptz,
  add column en_papelera_por        uuid references auth.users (id),
  add column en_papelera_por_correo text;

-- Para que el listado (que pide solo los que NO están en la Papelera) sea rápido
create index estudios_en_papelera_idx on public.estudios (cargado_por, en_papelera);

-- -----------------------------------------------------------------------------
-- 2) Registro de la Papelera: una fila por cada borrado y cada restauración.
--    Solo lo escriben las funciones de abajo. La app solo lo puede leer.
-- -----------------------------------------------------------------------------
create table public.estudios_papelera_registro (
  id              bigint generated always as identity primary key,
  -- Si alguien borra un estudio A MANO desde Supabase (no desde la app), se
  -- borra también su registro.
  estudio_id      uuid not null references public.estudios (id) on delete cascade,
  accion          text not null check (accion in ('anular', 'restaurar')),
  usuario_id      uuid not null references auth.users (id),
  usuario_correo  text,                               -- copia del correo, para mostrarlo
  hecho_en        timestamptz not null default now()  -- la hora del servidor
);

create index estudios_papelera_registro_estudio_idx on public.estudios_papelera_registro (estudio_id);

alter table public.estudios_papelera_registro enable row level security;

-- Se ve el registro de los estudios que uno puede ver (hoy, los propios)
create policy "Ver el registro de la papelera de mis estudios" on public.estudios_papelera_registro
  for select to authenticated
  using (exists (select 1 from public.estudios e
                 where e.id = estudio_id and e.cargado_por = (select auth.uid())));

-- Nadie puede escribir, cambiar ni borrar el registro desde la app: solo leerlo
revoke all on public.estudios_papelera_registro from public, anon, authenticated;
grant select on public.estudios_papelera_registro to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Control: las columnas de la Papelera solo las cambian las funciones.
--    Hoy la app tiene permiso de UPDATE e INSERT sobre estudios (para editar,
--    T032, y para guardar). Este control rechaza cualquier intento de tocar el
--    estado de la Papelera por esa vía (por ejemplo, un UPDATE directo que ponga
--    en_papelera = true, o un estudio nuevo que llegue ya "en la Papelera").
--    Las funciones de abajo avisan que son ellas con una marca que dura solo
--    mientras se ejecutan (set_config ... true) y que la app no puede poner.
-- -----------------------------------------------------------------------------
create function public.proteger_papelera()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('clinica.papelera', true), '') = 'si' then
    return new;   -- lo está haciendo anular_estudio o restaurar_estudio
  end if;
  if tg_op = 'INSERT' then
    -- Un estudio nuevo nunca nace en la Papelera
    new.en_papelera            := false;
    new.en_papelera_desde      := null;
    new.en_papelera_por        := null;
    new.en_papelera_por_correo := null;
  elsif new.en_papelera            is distinct from old.en_papelera
     or new.en_papelera_desde      is distinct from old.en_papelera_desde
     or new.en_papelera_por        is distinct from old.en_papelera_por
     or new.en_papelera_por_correo is distinct from old.en_papelera_por_correo then
    raise exception 'La Papelera solo se usa con anular_estudio y restaurar_estudio';
  end if;
  return new;
end;
$$;

create trigger estudios_proteger_papelera
  before insert or update on public.estudios
  for each row execute function public.proteger_papelera();

-- -----------------------------------------------------------------------------
-- 4) Mandar a la Papelera o restaurar NO cuenta como "edición": la "Última
--    edición" (modificado_por / modificado_en) solo cambia si cambian los datos
--    del estudio. Se reescribe la función del trigger de schema.sql (mismo
--    nombre; el trigger que la usa no cambia).
-- -----------------------------------------------------------------------------
create or replace function public.registrar_modificacion()
returns trigger
language plpgsql
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
declare
  columnas_papelera text[] := array['en_papelera', 'en_papelera_desde', 'en_papelera_por',
                                    'en_papelera_por_correo', 'modificado_por', 'modificado_en'];
begin
  if tg_op = 'INSERT' then
    new.modificado_por := null;
    new.modificado_en  := null;
  elsif (to_jsonb(new) - columnas_papelera) = (to_jsonb(old) - columnas_papelera) then
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

-- -----------------------------------------------------------------------------
-- 5) Las dos funciones. Corren con permisos del dueño de la base ("security
--    definer") para poder escribir el registro, así que controlan ellas mismas:
--      - que haya un usuario logueado;
--      - que el estudio sea uno que ese usuario puede ver (hoy: que lo cargó él).
--    Devuelven { id, numero, en_papelera, ya_estaba }. Si se tocan dos veces
--    seguidas (doble clic), la segunda no hace nada ni duplica el registro.
-- -----------------------------------------------------------------------------
create function public.anular_estudio(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_correo  text;
  v_estudio record;
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select e.id, e.numero, e.en_papelera into v_estudio
  from public.estudios e
  where e.id = p_id and e.cargado_por = v_usuario
  for update;   -- nadie más lo toca mientras tanto
  if not found then
    raise exception 'No se encontró el estudio';
  end if;
  if v_estudio.en_papelera then
    return jsonb_build_object('id', p_id, 'numero', v_estudio.numero, 'en_papelera', true, 'ya_estaba', true);
  end if;

  -- El correo, del ingreso del usuario (o de la tabla de usuarios, por las dudas)
  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  perform set_config('clinica.papelera', 'si', true);
  update public.estudios
     set en_papelera = true, en_papelera_desde = now(),
         en_papelera_por = v_usuario, en_papelera_por_correo = v_correo
   where id = p_id;
  perform set_config('clinica.papelera', '', true);

  insert into public.estudios_papelera_registro (estudio_id, accion, usuario_id, usuario_correo)
  values (p_id, 'anular', v_usuario, v_correo);

  return jsonb_build_object('id', p_id, 'numero', v_estudio.numero, 'en_papelera', true, 'ya_estaba', false);
end;
$$;

create function public.restaurar_estudio(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_correo  text;
  v_estudio record;
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select e.id, e.numero, e.en_papelera into v_estudio
  from public.estudios e
  where e.id = p_id and e.cargado_por = v_usuario
  for update;
  if not found then
    raise exception 'No se encontró el estudio';
  end if;
  if not v_estudio.en_papelera then
    return jsonb_build_object('id', p_id, 'numero', v_estudio.numero, 'en_papelera', false, 'ya_estaba', true);
  end if;

  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  perform set_config('clinica.papelera', 'si', true);
  update public.estudios
     set en_papelera = false, en_papelera_desde = null,
         en_papelera_por = null, en_papelera_por_correo = null
   where id = p_id;
  perform set_config('clinica.papelera', '', true);

  insert into public.estudios_papelera_registro (estudio_id, accion, usuario_id, usuario_correo)
  values (p_id, 'restaurar', v_usuario, v_correo);

  return jsonb_build_object('id', p_id, 'numero', v_estudio.numero, 'en_papelera', false, 'ya_estaba', false);
end;
$$;

-- Solo los usuarios logueados pueden llamarlas (ni anónimos ni "public")
revoke all on function public.anular_estudio(uuid)    from public, anon;
revoke all on function public.restaurar_estudio(uuid) from public, anon;
grant execute on function public.anular_estudio(uuid)    to authenticated;
grant execute on function public.restaurar_estudio(uuid) to authenticated;

commit;
