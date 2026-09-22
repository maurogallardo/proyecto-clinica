-- =============================================================================
-- Proyecto Clínica — Bucket de imágenes y reglas de acceso (T009 y T012)
--
-- Se corre en el SQL Editor de Supabase, DESPUÉS de schema.sql, una sola vez.
--
-- Regla de acceso de la demo: cada usuario ve y edita SOLO los estudios que
-- cargó él (y sus etapas e imágenes). Si más adelante distintos usuarios
-- tienen que compartir estudios, se cambian estas políticas.
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- -----------------------------------------------------------------------------
-- T009 — Bucket privado para las imágenes de los estudios
--   - public = false: no hay direcciones públicas; se ven con enlaces firmados
--     que caducan.
--   - Solo acepta WebP (RF-026) y hasta 5 MB por archivo.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes-estudios', 'imagenes-estudios', false, 5242880, array['image/webp']);

-- -----------------------------------------------------------------------------
-- Trazabilidad de la carga (nota de la T012): la app no puede falsear
-- quién cargó el estudio ni cuándo.
--   - Al crear: creado_en = ahora (se ignora lo que mande la app).
--   - Al editar: cargado_por y creado_en quedan como estaban.
--   (Que cargado_por sea el usuario logueado lo controla la política de abajo.)
-- -----------------------------------------------------------------------------
create function public.proteger_datos_de_carga()
returns trigger
language plpgsql
set search_path = ''  -- recomendación de seguridad de Supabase
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_en := now();
  else
    new.cargado_por := old.cargado_por;
    new.creado_en   := old.creado_en;
  end if;
  return new;
end;
$$;

create trigger estudios_proteger_datos_de_carga
  before insert or update on public.estudios
  for each row execute function public.proteger_datos_de_carga();

-- Índice para que el filtro "estudios de este usuario" sea rápido
create index estudios_cargado_por_idx on public.estudios (cargado_por);

-- -----------------------------------------------------------------------------
-- T012 — Políticas de RLS de las tablas
-- (select auth.uid()) = el usuario logueado. Va entre paréntesis porque así
-- Supabase lo calcula una sola vez por consulta y no una vez por fila.
-- -----------------------------------------------------------------------------

-- Estudios: solo los que cargó el usuario
create policy "Ver mis estudios" on public.estudios
  for select to authenticated
  using (cargado_por = (select auth.uid()));

create policy "Crear estudios a mi nombre" on public.estudios
  for insert to authenticated
  with check (cargado_por = (select auth.uid()));

create policy "Editar mis estudios" on public.estudios
  for update to authenticated
  using (cargado_por = (select auth.uid()))
  with check (cargado_por = (select auth.uid()));

-- Etapas: solo las de estudios que cargó el usuario
create policy "Ver etapas de mis estudios" on public.etapas
  for select to authenticated
  using (exists (select 1 from public.estudios e
                 where e.id = estudio_id and e.cargado_por = (select auth.uid())));

create policy "Crear etapas en mis estudios" on public.etapas
  for insert to authenticated
  with check (exists (select 1 from public.estudios e
                      where e.id = estudio_id and e.cargado_por = (select auth.uid())));

create policy "Editar etapas de mis estudios" on public.etapas
  for update to authenticated
  using (exists (select 1 from public.estudios e
                 where e.id = estudio_id and e.cargado_por = (select auth.uid())))
  with check (exists (select 1 from public.estudios e
                      where e.id = estudio_id and e.cargado_por = (select auth.uid())));

create policy "Quitar etapas de mis estudios" on public.etapas
  for delete to authenticated
  using (exists (select 1 from public.estudios e
                 where e.id = estudio_id and e.cargado_por = (select auth.uid())));

-- Imágenes (la fila con la ruta): solo las de estudios que cargó el usuario
create policy "Ver imágenes de mis estudios" on public.imagenes
  for select to authenticated
  using (exists (select 1 from public.estudios e
                 where e.id = estudio_id and e.cargado_por = (select auth.uid())));

create policy "Adjuntar imágenes a mis estudios" on public.imagenes
  for insert to authenticated
  with check (exists (select 1 from public.estudios e
                      where e.id = estudio_id and e.cargado_por = (select auth.uid())));

-- -----------------------------------------------------------------------------
-- Reglas del bucket (los archivos en sí)
-- Cada imagen va en una carpeta con el id de su estudio:
--   imagenes-estudios/<estudio_id>/<archivo>.webp
-- Solo puede subirla o verla quien cargó ese estudio. Ver incluye generar el
-- enlace firmado. No se permite reemplazar ni borrar (igual que la tabla imagenes).
-- -----------------------------------------------------------------------------
create policy "Ver imágenes de mis estudios" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagenes-estudios'
         and exists (select 1 from public.estudios e
                     where e.id::text = (storage.foldername(name))[1]
                       and e.cargado_por = (select auth.uid())));

create policy "Subir imágenes a mis estudios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes-estudios'
              and exists (select 1 from public.estudios e
                          where e.id::text = (storage.foldername(name))[1]
                            and e.cargado_por = (select auth.uid())));

commit;
