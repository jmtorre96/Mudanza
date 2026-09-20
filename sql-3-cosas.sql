-- ============================================================
--  Bitácora de mudanza — TANDA 3
--   a) inventario de cosas (qué tengo / qué falta comprar)
--   b) método de traslado de cada bulto (yo o la mudanzera)
--  Pega esto en Supabase -> SQL Editor -> Run
--  (es independiente de las tandas 1 y 2; córrelo aparte)
-- ============================================================

-- ---------- b) cómo se traslada cada bulto ----------
alter table public.bultos
  add column if not exists traslado text not null default 'mudanzera';

create table if not exists public.cosas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null default '',
  cantidad        integer not null default 1,
  categoria       text not null default '',
  destino         text not null default '',
  estado          text not null default 'tengo',   -- tengo | falta | quiza
  precio          numeric,                          -- opcional, por unidad
  notas           text not null default '',
  bulto_id        uuid references public.bultos(id) on delete set null,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  actualizado_por text not null default ''
);

create index if not exists cosas_estado_idx    on public.cosas (estado);
create index if not exists cosas_categoria_idx on public.cosas (categoria);
create index if not exists cosas_bulto_idx     on public.cosas (bulto_id);

alter table public.cosas enable row level security;

drop policy if exists cosas_familia on public.cosas;
create policy cosas_familia on public.cosas for all to authenticated
  using (public.es_de_la_casa()) with check (public.es_de_la_casa());

do $$
begin
  alter publication supabase_realtime add table public.cosas;
exception when duplicate_object then null;
end $$;

drop trigger if exists cosas_toca on public.cosas;
create trigger cosas_toca before update on public.cosas
  for each row execute function public.toca_actualizado();
