-- Formulario N° 5: Drenajes, SNG / Vómitos y Deposiciones pasan a tener tres
-- casilleros cada uno (05 a 13, 13 a 21 y 21 a 5), como la Diuresis y como el papel.
-- La hoja pasa de 34 a 40 campos.
--
-- Se corre en el SQL Editor de Supabase, una sola vez, DESPUÉS de formulario5.sql.
-- Este archivo NO contiene claves ni contraseñas (el repo es público).

-- Todo junto: si algo falla, no queda nada a medio cambiar.
begin;

-- a) Si alguna hoja tiene algo cargado en las tres columnas viejas, se frena acá y
--    no se cambia nada (así no se pierde ningún dato sin avisar)
do $$
begin
  if exists (select 1 from public.hojas_indicaciones h
             where h.drenajes is not null or h.sng_vomitos is not null or h.deposiciones is not null) then
    raise exception 'Hay hojas con Drenajes, SNG / Vómitos o Deposiciones cargados en las columnas viejas: no se cambió nada. Hay que revisarlas antes de correr este archivo.';
  end if;
end;
$$;

-- b) Afuera las tres columnas viejas; adentro las nueve nuevas (texto libre)
alter table public.hojas_indicaciones
  drop column drenajes,
  drop column sng_vomitos,
  drop column deposiciones,
  add column drenajes_05_13      text,
  add column drenajes_13_21      text,
  add column drenajes_21_05      text,
  add column sng_vomitos_05_13   text,
  add column sng_vomitos_13_21   text,
  add column sng_vomitos_21_05   text,
  add column deposiciones_05_13  text,
  add column deposiciones_13_21  text,
  add column deposiciones_21_05  text;

-- c) guardar_hoja y editar_hoja con las nueve columnas nuevas en lugar de las tres
--    viejas. Misma firma (create or replace): los permisos se conservan. Todo lo
--    demás queda igual que en formulario5.sql.
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
      csv, tomografia, electrocardiograma, laboratorio, medicacion, dieta,
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
      d.csv, d.tomografia, d.electrocardiograma, d.laboratorio, d.medicacion, d.dieta,
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
    'csv', 'tomografia', 'electrocardiograma', 'laboratorio', 'medicacion', 'dieta',
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
    csv = v_nuevo.csv, tomografia = v_nuevo.tomografia, electrocardiograma = v_nuevo.electrocardiograma,
    laboratorio = v_nuevo.laboratorio, medicacion = v_nuevo.medicacion, dieta = v_nuevo.dieta,
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
