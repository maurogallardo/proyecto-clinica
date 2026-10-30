-- Formulario N° 5: GRILLA DE HORARIOS. Cada renglón de las indicaciones médicas
-- (C.S.V., Tomografía, Electrocardiograma y Laboratorio, hasta 2 renglones cada
-- una; Medicación, hasta 5) lleva su propio texto y sus propias horas, todo en UNA
-- columna nueva: indicaciones. Dieta e Hidratación siguen como texto solo.
--
-- ATENCIÓN: NO CORRER TODAVÍA EN SUPABASE. La app publicada hoy usa las 5 columnas
-- viejas (csv, tomografia, electrocardiograma, laboratorio, medicacion). Si este
-- archivo se corre antes de que estén listos y subidos los pasos 2 y 3 de la grilla
-- (la carga y la edición en la app), la app publicada deja de guardar esas
-- indicaciones: las mandaría a columnas que ya no existen y se perderían sin aviso.
-- Se corre recién cuando Mauro lo diga, con la app nueva ya publicada.
--
-- Se corre una sola vez, DESPUÉS de formulario5.sql y formulario5-turnos.sql.
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
--
-- Cómo queda la columna indicaciones (jsonb), por ejemplo:
--   {
--     "csv":        [ { "texto": "cada 4 horas",
--                       "casillas": { "6": "X", "10": "X", "14": "X", "18": "X", "22": "X" } } ],
--     "medicacion": [ { "texto": "Ceftriaxona 1 g EV",
--                       "casillas": { "8": "7:30", "20": "X" },
--                       "sigue": "08:00" } ]
--   }
--   - Cada indicación (csv, tomografia, electrocardiograma, laboratorio, medicacion)
--     es una lista de renglones, en el orden del papel.
--   - "texto": lo escrito en el renglón (o null).
--   - "casillas": las 10 columnas del papel ("6", "8", ..., "24"). Cada una tiene
--     "X" (una cruz: la hora cae justo en la columna) o la HORA REAL escrita ("7" o
--     "7:30"), que va en la columna de la hora par siguiente (7:30 va en la "8").
--   - "sigue": la nota "sigue al día siguiente" con la hora ("08:00"), solo
--     informativa. Puede no estar.

-- Todo junto: si algo falla, no queda nada a medio cambiar.
begin;

-- 1) Una hora escrita ("7", "7:30", "08:00", "24") pasada a minutos desde las 0.
--    Si no es una hora válida, devuelve null.
create function public.indicaciones_minutos(p_hora text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_partes text[];
  v_horas  integer;
  v_minutos integer;
begin
  v_partes := regexp_match(p_hora, '^([0-9]{1,2})(:([0-5][0-9]))?$');
  if v_partes is null then
    return null;
  end if;
  v_horas := v_partes[1]::integer;
  v_minutos := coalesce(v_partes[3]::integer, 0);
  if v_horas > 24 or (v_horas = 24 and v_minutos > 0) then
    return null;
  end if;
  return v_horas * 60 + v_minutos;
end;
$$;

-- 2) El control de la columna indicaciones. Rechaza:
--    - una estructura mal armada (que no sea como el ejemplo de arriba);
--    - una indicación que no sea csv, tomografia, electrocardiograma, laboratorio
--      o medicacion;
--    - más renglones que el máximo (2, 2, 2, 2 y 5);
--    - una casilla que no sea una de las 10 columnas, o con algo que no sea "X" o
--      una hora;
--    - una hora real que no corresponda a su columna: tiene que ser posterior a la
--      columna anterior y anterior a la suya (7:30 va en la "8"; las 8 justas son
--      una "X" en la "8");
--    - una nota "sigue" que no sea una hora.
--    Vacío (null) vale: la hoja todavía no tiene indicaciones.
create function public.indicaciones_validas(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_maximos    constant jsonb := '{"csv": 2, "tomografia": 2, "electrocardiograma": 2, "laboratorio": 2, "medicacion": 5}';
  v_columnas   constant text[] := array['6', '8', '10', '12', '14', '16', '18', '20', '22', '24'];
  v_indicacion text;
  v_renglones  jsonb;
  v_renglon    jsonb;
  v_casillas   jsonb;
  v_columna    text;
  v_valor      jsonb;
  v_minutos    integer;
begin
  if p is null then
    return true;
  end if;
  if jsonb_typeof(p) <> 'object' then
    return false;
  end if;

  for v_indicacion, v_renglones in select e.key, e.value from jsonb_each(p) e loop
    -- Una de las 5 indicaciones, con una lista de renglones que no pase el máximo
    if not (v_maximos ? v_indicacion) then
      return false;
    end if;
    if jsonb_typeof(v_renglones) <> 'array'
       or jsonb_array_length(v_renglones) > (v_maximos ->> v_indicacion)::integer then
      return false;
    end if;

    for v_renglon in select r.value from jsonb_array_elements(v_renglones) r loop
      -- Cada renglón: solo "texto", "casillas" y "sigue"
      if jsonb_typeof(v_renglon) <> 'object' then
        return false;
      end if;
      if exists (select 1 from jsonb_object_keys(v_renglon) k where k not in ('texto', 'casillas', 'sigue')) then
        return false;
      end if;
      if coalesce(jsonb_typeof(v_renglon -> 'texto'), 'null') not in ('string', 'null') then
        return false;
      end if;

      -- "sigue": una hora, o nada
      if coalesce(jsonb_typeof(v_renglon -> 'sigue'), 'null') not in ('string', 'null') then
        return false;
      end if;
      if jsonb_typeof(v_renglon -> 'sigue') = 'string'
         and public.indicaciones_minutos(v_renglon ->> 'sigue') is null then
        return false;
      end if;

      -- "casillas": solo las 10 columnas, cada una con "X" o una hora de su columna
      v_casillas := v_renglon -> 'casillas';
      if coalesce(jsonb_typeof(v_casillas), 'null') not in ('object', 'null') then
        return false;
      end if;
      if jsonb_typeof(v_casillas) = 'object' then
        for v_columna, v_valor in select c.key, c.value from jsonb_each(v_casillas) c loop
          if not (v_columna = any(v_columnas)) or jsonb_typeof(v_valor) <> 'string' then
            return false;
          end if;
          if v_valor #>> '{}' <> 'X' then
            v_minutos := public.indicaciones_minutos(v_valor #>> '{}');
            if v_minutos is null
               or v_minutos <= (v_columna::integer - 2) * 60
               or v_minutos >= v_columna::integer * 60 then
              return false;
            end if;
          end if;
        end loop;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

-- 3) La columna nueva
alter table public.hojas_indicaciones add column indicaciones jsonb;

-- 4) Lo que ya está cargado pasa al renglón 1 de su indicación, sin cruces (no se
--    pierde nada). Las indicaciones vacías no se anotan; si no hay ninguna, queda
--    null. La marca clinica.edicion (dura solo mientras corre este archivo) le
--    avisa al trigger de "Última edición" que esto no es una edición: así no
--    cambian ni quién ni cuándo la editó por última vez.
select set_config('clinica.edicion', 'si', true);

update public.hojas_indicaciones h
   set indicaciones = nullif(jsonb_strip_nulls(jsonb_build_object(
         'csv',                case when h.csv                is null then null else jsonb_build_array(jsonb_build_object('texto', h.csv)) end,
         'tomografia',         case when h.tomografia         is null then null else jsonb_build_array(jsonb_build_object('texto', h.tomografia)) end,
         'electrocardiograma', case when h.electrocardiograma is null then null else jsonb_build_array(jsonb_build_object('texto', h.electrocardiograma)) end,
         'laboratorio',        case when h.laboratorio        is null then null else jsonb_build_array(jsonb_build_object('texto', h.laboratorio)) end,
         'medicacion',         case when h.medicacion         is null then null else jsonb_build_array(jsonb_build_object('texto', h.medicacion)) end
       )), '{}'::jsonb);

select set_config('clinica.edicion', '', true);

-- 5) El control, ya con los datos pasados
alter table public.hojas_indicaciones
  add constraint hojas_indicaciones_validas check (public.indicaciones_validas(indicaciones));

-- 6) Afuera las 5 columnas viejas
alter table public.hojas_indicaciones
  drop column csv,
  drop column tomografia,
  drop column electrocardiograma,
  drop column laboratorio,
  drop column medicacion;

-- 7) guardar_hoja y editar_hoja con la columna indicaciones en lugar de las 5
--    viejas. Misma firma (create or replace): los permisos se conservan. Todo lo
--    demás queda igual que en formulario5-turnos.sql. anular_hoja y
--    restaurar_hoja no cambian.
create or replace function public.guardar_hoja(p_id uuid, p_estudio jsonb, p_etapas jsonb)
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
      indicaciones, dieta,
      hidratacion, diuresis_05_13, diuresis_13_21, diuresis_21_05,
      drenajes_05_13, drenajes_13_21, drenajes_21_05,
      sng_vomitos_05_13, sng_vomitos_13_21, sng_vomitos_21_05,
      deposiciones_05_13, deposiciones_13_21, deposiciones_21_05,
      control_manana_fr, control_manana_te, control_manana_p, control_manana_ta, control_manana_o2,
      control_tarde_fr,  control_tarde_te,  control_tarde_p,  control_tarde_ta,  control_tarde_o2,
      control_noche_fr,  control_noche_te,  control_noche_p,  control_noche_ta,  control_noche_o2
    )
    select
      p_id, d.habitacion, d.mutual, d.doctor, d.paciente, d.tramite_administrativo, d.diagnostico,
      d.indicaciones, d.dieta,
      d.hidratacion, d.diuresis_05_13, d.diuresis_13_21, d.diuresis_21_05,
      d.drenajes_05_13, d.drenajes_13_21, d.drenajes_21_05,
      d.sng_vomitos_05_13, d.sng_vomitos_13_21, d.sng_vomitos_21_05,
      d.deposiciones_05_13, d.deposiciones_13_21, d.deposiciones_21_05,
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

create or replace function public.editar_hoja(p_id uuid, p_estudio jsonb, p_etapas jsonb, p_modificado_en text)
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
    'indicaciones', 'dieta',
    'hidratacion', 'diuresis_05_13', 'diuresis_13_21', 'diuresis_21_05',
    'drenajes_05_13', 'drenajes_13_21', 'drenajes_21_05',
    'sng_vomitos_05_13', 'sng_vomitos_13_21', 'sng_vomitos_21_05',
    'deposiciones_05_13', 'deposiciones_13_21', 'deposiciones_21_05',
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
    indicaciones = v_nuevo.indicaciones, dieta = v_nuevo.dieta,
    hidratacion = v_nuevo.hidratacion, diuresis_05_13 = v_nuevo.diuresis_05_13,
    diuresis_13_21 = v_nuevo.diuresis_13_21, diuresis_21_05 = v_nuevo.diuresis_21_05,
    drenajes_05_13 = v_nuevo.drenajes_05_13, drenajes_13_21 = v_nuevo.drenajes_13_21,
    drenajes_21_05 = v_nuevo.drenajes_21_05,
    sng_vomitos_05_13 = v_nuevo.sng_vomitos_05_13, sng_vomitos_13_21 = v_nuevo.sng_vomitos_13_21,
    sng_vomitos_21_05 = v_nuevo.sng_vomitos_21_05,
    deposiciones_05_13 = v_nuevo.deposiciones_05_13, deposiciones_13_21 = v_nuevo.deposiciones_13_21,
    deposiciones_21_05 = v_nuevo.deposiciones_21_05,
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

commit;
