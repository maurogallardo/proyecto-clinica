-- =============================================================================
-- Proyecto Clínica — Mirar el historial de ediciones (SOLO LECTURA)
--
-- Se pega en el SQL Editor de Supabase cuando se quiere revisar que el historial
-- se guardó bien. No cambia nada: es un "select".
--
-- Muestra, por cada vez que se guardó un cambio, SOLO datos de control (nada del
-- paciente): el N° del estudio, cuántas veces se editó, quién (correo del
-- profesional), cuándo, cuántas etapas tenía antes y cuántas tiene ahora, si lo
-- guardado es del mismo estudio, si era su primera edición, y si "Última
-- edición" coincide con la última fila del historial.
--
-- Está filtrado a los estudios de prueba (N° 18, 19, 20 y 24). Para mirar otros,
-- se cambian los números de la línea "where".
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

select
  e.numero                                                   as estudio,
  count(*) over (partition by e.id)                          as ediciones_del_estudio,
  row_number() over (partition by e.id order by h.editado_en) as edicion,
  h.editado_por_correo                                       as editado_por,
  h.editado_en                                               as editado_en,
  jsonb_array_length(h.etapas_antes)                         as etapas_antes,
  (select count(*) from public.etapas t where t.estudio_id = e.id) as etapas_ahora,
  (h.estudio_antes ->> 'id') = e.id::text                    as antes_es_de_este_estudio,
  (h.estudio_antes ->> 'modificado_en') is null              as era_su_primera_edicion,
  (select count(*) from jsonb_object_keys(h.estudio_antes))  as campos_guardados_antes,
  e.modificado_en = max(h.editado_en) over (partition by e.id) as ultima_edicion_coincide
from public.estudios_historial h
join public.estudios e on e.id = h.estudio_id
where e.numero in (18, 19, 20, 24)
order by e.numero, h.editado_en;
