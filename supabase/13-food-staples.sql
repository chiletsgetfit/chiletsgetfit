-- 13: Staple foods for search.
-- Adds alias text and a "staple" flag to the foods catalog so a curated set of
-- everyday foods (chicken breast, rice, eggs, ...) can be seeded with plain
-- names and surface first in search. Seed with: node scripts/seed-staple-foods.mjs
set role postgres;

alter table public.foods
  add column if not exists search_terms text,
  add column if not exists staple boolean not null default false;

create index if not exists foods_staple_idx on public.foods (staple) where staple;

select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'foods'
order by ordinal_position;
