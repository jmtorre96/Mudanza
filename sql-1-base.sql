-- ============================================================
--  Bitácora de mudanza — TANDA 1 de 2: tablas y permisos
--  Pega TODO esto en Supabase -> SQL Editor -> Run
--  Antes, cambia el correo de la línea marcada con  <<<<<
--  Cuando termine en Success, corre después sql-2-fotos.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- quién puede entrar ----------
create table if not exists public.permitidos (
  email text primary key,
  nombre text not null default ''
);

insert into public.permitidos (email, nombre) values
  ('jmtorre@principado.com.mx',     'Juan Manuel'),
  ('CORREO-DE-TU-ESPOSA@gmail.com', 'Mi esposa')   -- <<<<< CAMBIA ESTE RENGLÓN
on conflict (email) do nothing;

-- ---------- los bultos ----------
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
  fotos           text[] not null default '{}',
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  actualizado_por text not null default ''
);

-- por si ya habías corrido este archivo antes de que existieran las fotos:
alter table public.bultos add column if not exists fotos text[] not null default '{}';

create index if not exists bultos_destino_idx on public.bultos (destino);
create index if not exists bultos_estado_idx  on public.bultos (estado);
create index if not exists bultos_clave_idx   on public.bultos (clave);

-- ---------- cuartos y orígenes ----------
create table if not exists public.config (
  id       int primary key default 1,
  origenes jsonb not null default '[]'::jsonb,
  destinos jsonb not null default '[]'::jsonb,
  constraint config_una_sola check (id = 1)
);

insert into public.config (id, origenes, destinos) values (
  1,
  '[{"nombre":"Departamento","clave":"DEP"},{"nombre":"Casa de mis papás","clave":"PAP"}]'::jsonb,
  '["Sala","Comedor","Cocina","Alacena","Recámara principal","Clóset principal","Recámara 2",
    "Baño principal","Baño de visitas","Cuarto de lavado","Estudio","Bodega","Terraza","Cochera"]'::jsonb
) on conflict (id) do nothing;

-- ---------- seguridad: sólo los correos de la tabla permitidos ----------
alter table public.bultos     enable row level security;
alter table public.config     enable row level security;
alter table public.permitidos enable row level security;

create or replace function public.es_de_la_casa() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.permitidos p
      where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
  $$;

drop policy if exists bultos_familia on public.bultos;
create policy bultos_familia on public.bultos for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

drop policy if exists config_familia on public.config;
create policy config_familia on public.config for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

-- permitidos se queda sin policies: sólo se edita desde el panel de Supabase.

-- ---------- que los cambios lleguen solos al otro celular ----------
do $$
begin
  alter publication supabase_realtime add table public.bultos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.config;
exception when duplicate_object then null;
end $$;

