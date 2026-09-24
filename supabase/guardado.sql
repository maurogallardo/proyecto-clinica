-- =============================================================================
-- Proyecto Clínica — Guardado del estudio (T023 y T024)
--
-- Se corre en el SQL Editor de Supabase, DESPUÉS de schema.sql y seguridad.sql,
-- una sola vez.
--
--   1) Número de estudio correlativo (1, 2, 3...) para "Estudio guardado — N° X".
--   2) Función guardar_estudio: guarda el estudio y sus etapas TODO O NADA.
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- 1) Número de estudio: lo pone la base sola, en orden. Nadie lo puede escribir
--    ni cambiar ("generated always"). Si un guardado falla a mitad de camino,
--    ese número puede quedar salteado (es normal en las bases de datos).
-- -----------------------------------------------------------------------------
alter table public.estudios
  add column numero bigint generated always as identity unique;

-- -----------------------------------------------------------------------------
-- 2) Guardar el estudio y sus etapas de una sola vez (todo o nada).
--
--   - Corre con los permisos del usuario (security invoker): valen las mismas
--     reglas de siempre (seguridad.sql): cada usuario guarda solo lo suyo.
--   - Solo toma los campos de la planilla: cargado_por, creado_en, modificado_*
--     y numero los pone la base (no se pueden falsear desde la app).
--   - p_id lo arma la app antes de guardar y lo repite en cada reintento: si ese
--     estudio ya se había guardado, devuelve su número en lugar de duplicarlo.
--   - Si cualquier paso falla, la base deshace todo: no quedan estudios a medias.
-- -----------------------------------------------------------------------------
create function public.guardar_estudio(p_id uuid, p_estudio jsonb, p_etapas jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
declare
  v_numero bigint;
begin
  -- ¿Ya se había guardado este mismo estudio? (reintento): devolver su número
  select e.numero into v_numero from public.estudios e where e.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', true);
  end if;

  begin
    -- El estudio: solo los campos de la planilla (lo vacío llega como null)
    insert into public.estudios (
      id, documento, nombre_paciente, sexo, edad, peso, talla, fecha_estudio,
      medico_solicitante, motivo, antecedentes, tecnica, posicion,
      fc_teorica, fc_alcanzada, porcentaje,
      ecg_ritmo, ecg_eje, ecg_fcia, ecg_p, ecg_pq, ecg_qrs, ecg_qt,
      conclusion, interrupcion_prueba,
      post_ta, post_fc, post_ecg, post_clinica
    )
    select
      p_id, d.documento, d.nombre_paciente, d.sexo, d.edad, d.peso, d.talla, d.fecha_estudio,
      d.medico_solicitante, d.motivo, d.antecedentes, d.tecnica, d.posicion,
      d.fc_teorica, d.fc_alcanzada, d.porcentaje,
      d.ecg_ritmo, d.ecg_eje, d.ecg_fcia, d.ecg_p, d.ecg_pq, d.ecg_qrs, d.ecg_qt,
      d.conclusion, d.interrupcion_prueba,
      d.post_ta, d.post_fc, d.post_ecg, d.post_clinica
    from jsonb_populate_record(null::public.estudios, p_estudio) as d
    returning numero into v_numero;
  exception when unique_violation then
    -- Dos pedidos iguales al mismo tiempo (doble toque): el otro ya lo guardó
    select e.numero into v_numero from public.estudios e where e.id = p_id;
    if not found then
      raise exception 'No se pudo guardar el estudio';
    end if;
    return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', true);
  end;

  -- Sus etapas (la tabla "Reposo y esfuerzo")
  insert into public.etapas (estudio_id, tiempo, carga, met, ta, fc, ecg, clinica)
  select p_id, t.tiempo, t.carga, t.met, t.ta, t.fc, t.ecg, t.clinica
  from jsonb_populate_recordset(null::public.etapas, coalesce(p_etapas, '[]'::jsonb)) as t;

  return jsonb_build_object('id', p_id, 'numero', v_numero, 'ya_estaba', false);
end;
$$;

-- Solo la pueden usar los usuarios logueados (ni el público ni los anónimos)
revoke all on function public.guardar_estudio(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_estudio(uuid, jsonb, jsonb) to authenticated;

commit;
