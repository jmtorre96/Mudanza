-- ============================================================
--  Bitácora de mudanza — TODO EN UNO
--
--  Pega TODO esto en Supabase -> SQL Editor -> Run.  Una sola vez.
--
--  Es seguro correrlo aunque ya hayas corrido otras tandas antes:
--  todo está escrito para no duplicar ni romper nada si ya existe.
--  Si algo ya estaba, simplemente no hace nada en ese punto.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. QUIÉN PUEDE ENTRAR
--    Tienen que ser EXACTAMENTE los correos con los que crean su
--    cuenta en la app. Si no coinciden, la base rechaza todo.
-- ------------------------------------------------------------
create table if not exists public.permitidos (
  email  text primary key,
  nombre text not null default ''
);

insert into public.permitidos (email, nombre) values
  ('jmtorre96@gmail.com',  'Juan Manuel'),
  ('qlmercedes@gmail.com', 'Mercedes')
on conflict (email) do nothing;

-- fuera el correo de ejemplo que quedó de la primera vez
delete from public.permitidos where email like 'CORREO-DE-TU-%';

-- ------------------------------------------------------------
-- 2. LOS BULTOS
-- ------------------------------------------------------------
create table if not exists public.bultos (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  clave           text not null default 'BLT',
  origen          text not null default '',
  cuarto_origen   text not null default '',
  tipo            text not null default 'caja',
  estado          text not null default 'empacado',
  destino         text not null default '',
  lugar           text not null default '',
  contenido       text[] not null default '{}',
  notas           text not null default '',
  fragil          boolean not null default false,
  abrir_primero   boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  actualizado_por text not null default ''
);

alter table public.bultos add column if not exists fotos    text[] not null default '{}';
alter table public.bultos add column if not exists traslado text   not null default 'mudanzera';

create index if not exists bultos_destino_idx on public.bultos (destino);
create index if not exists bultos_estado_idx  on public.bultos (estado);
create index if not exists bultos_clave_idx   on public.bultos (clave);

-- ------------------------------------------------------------
-- 3. MIS COSAS
-- ------------------------------------------------------------
create table if not exists public.cosas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null default '',
  cantidad        integer not null default 1,
  categoria       text not null default '',
  destino         text not null default '',
  estado          text not null default 'tengo',
  precio          numeric,
  notas           text not null default '',
  bulto_id        uuid references public.bultos(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  actualizado_por text not null default ''
);

alter table public.cosas add column if not exists ubicacion text not null default '';

create index if not exists cosas_estado_idx    on public.cosas (estado);
create index if not exists cosas_categoria_idx on public.cosas (categoria);
create index if not exists cosas_bulto_idx     on public.cosas (bulto_id);
create index if not exists cosas_ubicacion_idx on public.cosas (ubicacion);

-- ------------------------------------------------------------
-- 4. CUARTOS, ORÍGENES Y CATEGORÍAS
--    Borra de la lista de "destinos" los cuartos que no existan
--    en tu casa antes de correr esto.
-- ------------------------------------------------------------
create table if not exists public.config (
  id       int primary key default 1,
  origenes jsonb not null default '[]'::jsonb,
  destinos jsonb not null default '[]'::jsonb,
  constraint config_una_sola check (id = 1)
);

alter table public.config add column if not exists categorias jsonb not null default '[]'::jsonb;

insert into public.config (id) values (1) on conflict (id) do nothing;

update public.config set
  origenes = '[{"nombre":"Departamento","clave":"DEP"},
               {"nombre":"Casa de mis papás","clave":"BEL"}]'::jsonb,
  destinos = '[
    "Sala","Comedor","Cocina","Alacena","Family PB","Baño de visitas",
    "Cuarto de lavado","Terraza","Cochera","Bodega",
    "Family PA","Recámara principal","Clóset principal","Baño principal",
    "Recámara 2","Recámara 3","Estudio"
  ]'::jsonb,
  categorias = '[
    "Cocina","Alacena","Lavandería y limpieza","Baño","Blancos y ropa de cama",
    "Ropa","Sala y comedor","Electrónica","Audio y video","Herramientas",
    "Jardín y exterior","Documentos y papelería","Decoración","Libros",
    "Deporte","Mascotas","Niños","Otros"
  ]'::jsonb
where id = 1;

-- por si quedó algún bulto con la clave vieja
update public.bultos
set clave = 'BEL', code = replace(code, 'PAP-', 'BEL-')
where clave = 'PAP';

-- ------------------------------------------------------------
-- 5. SEGURIDAD
-- ------------------------------------------------------------
alter table public.bultos     enable row level security;
alter table public.cosas      enable row level security;
alter table public.config     enable row level security;
alter table public.permitidos enable row level security;

create or replace function public.es_de_la_casa() returns boolean
  language sql stable security definer set search_path = public as $fn$
    select exists (
      select 1 from public.permitidos p
      where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
  $fn$;

drop policy if exists bultos_familia on public.bultos;
create policy bultos_familia on public.bultos for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

drop policy if exists cosas_familia on public.cosas;
create policy cosas_familia on public.cosas for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

drop policy if exists config_familia on public.config;
create policy config_familia on public.config for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

-- ------------------------------------------------------------
-- 6. SELLO DE ÚLTIMA MODIFICACIÓN
-- ------------------------------------------------------------
create or replace function public.toca_actualizado() returns trigger
  language plpgsql as $fn$
  begin
    new.actualizado_en = now();
    return new;
  end;
  $fn$;

drop trigger if exists bultos_toca on public.bultos;
create trigger bultos_toca before update on public.bultos
  for each row execute function public.toca_actualizado();

drop trigger if exists cosas_toca on public.cosas;
create trigger cosas_toca before update on public.cosas
  for each row execute function public.toca_actualizado();

-- ------------------------------------------------------------
-- 7. QUE LOS CAMBIOS LLEGUEN SOLOS AL OTRO CELULAR
-- ------------------------------------------------------------
do $blk$ begin alter publication supabase_realtime add table public.bultos;
exception when duplicate_object then null; end $blk$;

do $blk$ begin alter publication supabase_realtime add table public.cosas;
exception when duplicate_object then null; end $blk$;

do $blk$ begin alter publication supabase_realtime add table public.config;
exception when duplicate_object then null; end $blk$;

-- ------------------------------------------------------------
-- 8. ALMACÉN DE FOTOS
--    Va envuelto para que, si tu proyecto no deja tocar Storage
--    desde aquí, NO se caiga todo lo anterior.
-- ------------------------------------------------------------
do $blk$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('fotos', 'fotos', false, 10485760)
  on conflict (id) do nothing;

  execute $p$ drop policy if exists fotos_ver    on storage.objects $p$;
  execute $p$ drop policy if exists fotos_subir  on storage.objects $p$;
  execute $p$ drop policy if exists fotos_borrar on storage.objects $p$;

  execute $p$ create policy fotos_ver on storage.objects for select to authenticated
              using (bucket_id = 'fotos' and public.es_de_la_casa()) $p$;
  execute $p$ create policy fotos_subir on storage.objects for insert to authenticated
              with check (bucket_id = 'fotos' and public.es_de_la_casa()) $p$;
  execute $p$ create policy fotos_borrar on storage.objects for delete to authenticated
              using (bucket_id = 'fotos' and public.es_de_la_casa()) $p$;
exception when others then
  raise notice 'Storage no se pudo configurar desde SQL (%). Todo lo demás quedó bien; crea el bucket "fotos" a mano si hace falta.', sqlerrm;
end $blk$;

-- ------------------------------------------------------------
-- 9. COMPROBACIÓN — lee el resultado
-- ------------------------------------------------------------
select 'correos con acceso' as que, string_agg(email, ', ') as dato from public.permitidos
union all
select 'cosas en la base',   count(*)::text from public.cosas
union all
select 'bultos en la base',  count(*)::text from public.bultos
union all
select 'cuartos de la casa', jsonb_array_length(destinos)::text from public.config where id = 1
union all
select 'categorías',         jsonb_array_length(categorias)::text from public.config where id = 1;
