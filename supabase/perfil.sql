-- =============================================================================
-- Proyecto Clínica — Foto de perfil (T049)
--
-- Se corre en el SQL Editor de Supabase, una sola vez, DESPUÉS de schema.sql,
-- seguridad.sql y guardado.sql. No cambia ninguna regla existente: crea un
-- depósito nuevo con sus propias reglas.
--
-- Una foto por profesional, en el depósito privado "fotos-perfil", con el nombre
-- <id del usuario>.webp. Cada uno solo puede ver, subir y cambiar la suya.
-- No se puede borrar desde la app (se cambia subiendo otra).
--
-- Este archivo NO contiene claves ni contraseñas (el repo es público).
-- =============================================================================

-- Todo junto: si algo falla, no queda nada a medio crear.
begin;

-- Depósito privado (sin direcciones públicas: se ve con enlaces firmados que
-- caducan). Solo WebP y hasta 1 MB (una foto de 512 px pesa mucho menos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-perfil', 'fotos-perfil', false, 1048576, array['image/webp']);

-- (select auth.uid()) = el usuario logueado. El único archivo que puede tocar
-- cada uno es el que se llama como su propio id.
create policy "Ver mi foto de perfil" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-perfil' and name = (select auth.uid())::text || '.webp');

create policy "Subir mi foto de perfil" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-perfil' and name = (select auth.uid())::text || '.webp');

-- Cambiar la foto = reemplazar el mismo archivo
create policy "Cambiar mi foto de perfil" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-perfil' and name = (select auth.uid())::text || '.webp')
  with check (bucket_id = 'fotos-perfil' and name = (select auth.uid())::text || '.webp');

commit;
