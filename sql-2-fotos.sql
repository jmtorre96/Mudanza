-- ============================================================
--  Bitácora de mudanza — TANDA 2 de 2: almacén de fotos
--  Córrelo APARTE, después de que la tanda 1 haya dicho Success.
--  Va por separado porque si falla por permisos no se debe
--  llevar entre las patas a las tablas de la tanda 1.
-- ============================================================

-- ---------- almacén de fotos ----------
-- Bucket privado: las fotos sólo se ven desde la app, con una liga temporal.
insert into storage.buckets (id, name, public, file_size_limit)
values ('fotos', 'fotos', false, 10485760)
on conflict (id) do nothing;

drop policy if exists fotos_ver    on storage.objects;
drop policy if exists fotos_subir  on storage.objects;
drop policy if exists fotos_borrar on storage.objects;

create policy fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.es_de_la_casa());

create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.es_de_la_casa());

create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.es_de_la_casa());

-- ---------- sello automático de "última modificación" ----------
create or replace function public.toca_actualizado() returns trigger
  language plpgsql as $$
  begin
    new.actualizado_en = now();
    return new;
  end;
  $$;

drop trigger if exists bultos_toca on public.bultos;
create trigger bultos_toca before update on public.bultos
  for each row execute function public.toca_actualizado();
