-- =============================================================================
-- Proyecto Clínica — Editar estudio, con historial
--
-- Se corre en el SQL Editor de Supabase, una sola vez, DESPUÉS de schema.sql,
-- seguridad.sql, guardado.sql, perfil.sql y papelera.sql. (Ya corrido en Supabase.)
--
-- Qué hace, en criollo:
--   - Corregir un estudio (sus datos y sus etapas) se hace SOLO con la función
--     editar_estudio: todo o nada, y antes de cambiar nada guarda en el historial
--     cómo estaba (el estudio completo y todas sus etapas), quién lo editó (id y
--     correo) y cuándo (hora del servidor).
--   - El historial no se puede leer, cambiar ni borrar desde la app (tiene datos
--     de pacientes). Por ahora no tiene pantalla: en la ficha se ve solo "Última
--     edición: día y hora".
--   - Detecta la edición cruzada: si mientras alguien editaba, el estudio cambió
--     (otra persona u otra pestaña), no guarda nada y avisa.
--   - No se editan estudios que están en la Papelera.
--   - La app pierde el permiso de modificar directo: sin UPDATE en estudios, y
--     sin UPDATE ni DELETE en etapas. Guardar un estudio nuevo desde el celular
--     (guardar_estudio) sigue igual: usa INSERT, que se conserva.
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- 1) Historial de ediciones: una fila por cada vez que se guarda un cambio, con
--    cómo estaba ANTES. Solo lo escribe editar_estudio.
-- -----------------------------------------------------------------------------
create table public.estudios_historial (
  id                  bigint generated always as identity primary key,
  -- Si alguien borra un estudio A MANO desde Supabase (no desde la app), se
  -- borra también su historial.
  estudio_id          uuid not null references public.estudios (id) on delete cascade,
  estudio_antes       jsonb not null,                      -- la fila completa, como estaba
  etapas_antes        jsonb not null default '[]'::jsonb,  -- todas sus etapas, como estaban
  editado_por         uuid not null references auth.users (id),
  editado_por_correo  text,                                -- copia del correo
  editado_en          timestamptz not null default now()   -- la hora del servidor
);

create index estudios_historial_estudio_idx on public.estudios_historial (estudio_id);

-- RLS encendido y sin políticas: nadie lo ve desde la app
alter table public.estudios_historial enable row level security;

-- Y además, ningún permiso: ni leer, ni escribir, ni cambiar, ni borrar
revoke all on public.estudios_historial from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) "Última edición" (modificado_por / modificado_en): la marca editar_estudio.
--    Se reescribe la función del trigger de schema.sql (como en papelera.sql;
--    el trigger que la usa no cambia):
--      - editar_estudio prende una marca que dura solo mientras se ejecuta
--        (clinica.edicion) y pone ella misma quién y cuándo: el trigger, al ver
--        la marca, deja esos valores. Así queda marcada aunque solo hayan
--        cambiado las etapas (que están en otra tabla).
--      - Mandar a la Papelera o restaurar sigue sin contar como edición.
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
  elsif coalesce(current_setting('clinica.edicion', true), '') = 'si' then
    -- Lo está haciendo editar_estudio: quién y cuándo ya vienen puestos
    null;
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
-- 3) La función editar_estudio.
--
--   Recibe:
--     p_id             el estudio
--     p_estudio        los datos de la planilla (los mismos campos que
--                      guardar_estudio; lo vacío llega como null)
--     p_etapas         TODAS las etapas como tienen que quedar (reemplazan a las
--                      de antes: así se cambian, se agregan y se quitan)
--     p_modificado_en  el modificado_en que tenía la ficha al abrir la edición,
--                      COMO TEXTO, tal cual vino del servidor (si se pasa por Date
--                      de JavaScript pierde los microsegundos y nunca coincidiría).
--                      null si el estudio nunca se había editado.
--
--   Corre con permisos del dueño de la base ("security definer") porque la app
--   ya no puede modificar directo; por eso controla ella misma:
--     - que haya un usuario logueado;
--     - que el estudio sea de ese usuario (cargado_por = él);
--     - que no esté en la Papelera;
--     - que nadie lo haya cambiado mientras tanto (edición cruzada).
--
--   Solo toma los campos de la planilla (la misma lista blanca que
--   guardar_estudio). NO cambia: id, numero, cargado_por, creado_en, las columnas
--   de la Papelera, ni las fotos. modificado_por y modificado_en los pone ella.
--
--   Si no hay cambios (ni en los datos ni en las etapas): no guarda historial, no
--   marca "Última edición" y avisa "sin cambios".
--
--   Devuelve { id, numero, modificado_en, sin_cambios }.
--   Todo pasa en una sola transacción: si algo falla, no queda nada a medias.
-- -----------------------------------------------------------------------------
create function public.editar_estudio(p_id uuid, p_estudio jsonb, p_etapas jsonb, p_modificado_en text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario        uuid := auth.uid();
  v_correo         text;
  v_actual         public.estudios;
  v_nuevo          public.estudios;
  v_etapas         jsonb := coalesce(p_etapas, '[]'::jsonb);
  v_etapas_antes   jsonb;
  v_modificado_en  timestamptz;
  -- La lista blanca: los campos de la planilla (los mismos de guardar_estudio)
  v_campos         text[] := array[
    'documento', 'nombre_paciente', 'sexo', 'edad', 'peso', 'talla', 'fecha_estudio',
    'medico_solicitante', 'motivo', 'antecedentes', 'tecnica', 'posicion',
    'fc_teorica', 'fc_alcanzada', 'porcentaje',
    'ecg_ritmo', 'ecg_eje', 'ecg_fcia', 'ecg_p', 'ecg_pq', 'ecg_qrs', 'ecg_qt',
    'conclusion', 'interrupcion_prueba',
    'post_ta', 'post_fc', 'post_ecg', 'post_clinica'];
begin
  if v_usuario is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if p_estudio is null or jsonb_typeof(p_estudio) <> 'object' or jsonb_typeof(v_etapas) <> 'array' then
    raise exception 'Faltan los datos del estudio';
  end if;

  -- El estudio, bloqueado mientras tanto (si otro lo está guardando, espera)
  select * into v_actual
  from public.estudios e
  where e.id = p_id and e.cargado_por = v_usuario
  for update;
  if not found then
    raise exception 'No se encontró el estudio';
  end if;
  if v_actual.en_papelera then
    raise exception 'El estudio está en la Papelera: primero hay que restaurarlo';
  end if;

  -- Edición cruzada: ¿sigue como estaba cuando se abrió la edición?
  -- ("is not distinct from" porque un estudio nunca editado tiene null)
  if v_actual.modificado_en is distinct from nullif(p_modificado_en, '')::timestamptz then
    raise exception using
      errcode = 'CL409',   -- código propio, para que la app lo reconozca
      message = 'Este estudio lo modificó otra persona o se editó en otra pestaña mientras lo editabas. No se guardó el cambio.';
  end if;

  -- Los datos nuevos, pasados por la forma de la tabla (tipos iguales que al guardar)
  v_nuevo := jsonb_populate_record(null::public.estudios, p_estudio);

  -- ¿Hay cambios? Se comparan solo los campos de la planilla, y las etapas sin
  -- importar el orden
  v_etapas_antes := coalesce((select jsonb_agg(to_jsonb(t) order by t.tiempo nulls last, t.id)
                              from public.etapas t where t.estudio_id = p_id), '[]'::jsonb);
  if (select jsonb_object_agg(c.key, c.value) from jsonb_each(to_jsonb(v_nuevo)) c where c.key = any(v_campos))
       = (select jsonb_object_agg(c.key, c.value) from jsonb_each(to_jsonb(v_actual)) c where c.key = any(v_campos))
     and (select coalesce(jsonb_agg(x order by x::text), '[]'::jsonb)
          from (select jsonb_build_object('tiempo', t.tiempo, 'carga', t.carga, 'met', t.met, 'ta', t.ta,
                                          'fc', t.fc, 'ecg', t.ecg, 'clinica', t.clinica) as x
                from jsonb_populate_recordset(null::public.etapas, v_etapas) t) nuevas)
       = (select coalesce(jsonb_agg(x order by x::text), '[]'::jsonb)
          from (select jsonb_build_object('tiempo', t.tiempo, 'carga', t.carga, 'met', t.met, 'ta', t.ta,
                                          'fc', t.fc, 'ecg', t.ecg, 'clinica', t.clinica) as x
                from public.etapas t where t.estudio_id = p_id) actuales)
  then
    return jsonb_build_object('id', p_id, 'numero', v_actual.numero,
                              'modificado_en', v_actual.modificado_en, 'sin_cambios', true);
  end if;

  -- El correo, del ingreso del usuario (o de la tabla de usuarios, por las dudas)
  v_correo := coalesce(auth.jwt() ->> 'email', (select u.email from auth.users u where u.id = v_usuario));

  -- 1) Primero, al historial: cómo estaba ANTES (estudio completo y etapas)
  insert into public.estudios_historial (estudio_id, estudio_antes, etapas_antes, editado_por, editado_por_correo)
  values (p_id, to_jsonb(v_actual), v_etapas_antes, v_usuario, v_correo);

  -- 2) El estudio: solo los campos de la planilla, y quién y cuándo lo editó
  perform set_config('clinica.edicion', 'si', true);
  update public.estudios e set
    documento = v_nuevo.documento, nombre_paciente = v_nuevo.nombre_paciente, sexo = v_nuevo.sexo,
    edad = v_nuevo.edad, peso = v_nuevo.peso, talla = v_nuevo.talla, fecha_estudio = v_nuevo.fecha_estudio,
    medico_solicitante = v_nuevo.medico_solicitante, motivo = v_nuevo.motivo,
    antecedentes = v_nuevo.antecedentes, tecnica = v_nuevo.tecnica, posicion = v_nuevo.posicion,
    fc_teorica = v_nuevo.fc_teorica, fc_alcanzada = v_nuevo.fc_alcanzada, porcentaje = v_nuevo.porcentaje,
    ecg_ritmo = v_nuevo.ecg_ritmo, ecg_eje = v_nuevo.ecg_eje, ecg_fcia = v_nuevo.ecg_fcia,
    ecg_p = v_nuevo.ecg_p, ecg_pq = v_nuevo.ecg_pq, ecg_qrs = v_nuevo.ecg_qrs, ecg_qt = v_nuevo.ecg_qt,
    conclusion = v_nuevo.conclusion, interrupcion_prueba = v_nuevo.interrupcion_prueba,
    post_ta = v_nuevo.post_ta, post_fc = v_nuevo.post_fc, post_ecg = v_nuevo.post_ecg,
    post_clinica = v_nuevo.post_clinica,
    modificado_por = v_usuario,
    modificado_en = now()
  where e.id = p_id
  returning e.modificado_en into v_modificado_en;
  perform set_config('clinica.edicion', '', true);

  -- 3) Las etapas: se reemplazan todas por las nuevas (mismos campos que guardar_estudio)
  delete from public.etapas where estudio_id = p_id;
  insert into public.etapas (estudio_id, tiempo, carga, met, ta, fc, ecg, clinica)
  select p_id, t.tiempo, t.carga, t.met, t.ta, t.fc, t.ecg, t.clinica
  from jsonb_populate_recordset(null::public.etapas, v_etapas) as t;

  return jsonb_build_object('id', p_id, 'numero', v_actual.numero,
                            'modificado_en', v_modificado_en, 'sin_cambios', false);
end;
$$;

-- Solo los usuarios logueados pueden llamarla (ni anónimos ni "public")
revoke all on function public.editar_estudio(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.editar_estudio(uuid, jsonb, jsonb, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Sin modificar ni borrar directo desde la app.
--    Se conserva lo que usa la app: SELECT (ver) e INSERT (guardar_estudio, que
--    corre con los permisos del usuario, inserta en estudios y en etapas).
--    Se quita también TRUNCATE por las dudas (Supabase puede dar "todos los
--    permisos" a las tablas nuevas; si alguno no estaba, quitarlo no hace nada).
-- -----------------------------------------------------------------------------
revoke update, delete, truncate on public.estudios from authenticated;
revoke update, delete, truncate on public.etapas   from authenticated;

-- Las reglas de modificar y quitar quedan sin uso: se sacan
drop policy "Editar mis estudios"           on public.estudios;
drop policy "Editar etapas de mis estudios" on public.etapas;
drop policy "Quitar etapas de mis estudios" on public.etapas;

commit;
