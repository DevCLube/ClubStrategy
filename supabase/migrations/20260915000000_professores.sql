-- Tabelas e colunas de professores (vínculo N:N com modalidades).

create table if not exists public.professores (
  id text primary key,
  nome text not null
);

create table if not exists public.professor_modalidade (
  professor_id text not null references public.professores(id) on delete cascade,
  categoria_id text not null references public.categorias(id) on delete cascade,
  primary key (professor_id, categoria_id)
);

alter table public.turmas add column if not exists professor_id text references public.professores(id) on delete set null;