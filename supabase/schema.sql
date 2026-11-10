-- Execute uma vez no SQL Editor do projeto Supabase do Elementa.
-- Cada conta só pode ler e alterar o próprio progresso.
create table if not exists public.study_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{"favorites": [], "history": [], "seen": []}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_data enable row level security;

drop policy if exists "Users manage their own study data" on public.study_data;
create policy "Users manage their own study data"
  on public.study_data
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.study_data to authenticated;
