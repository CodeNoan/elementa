-- Execute uma vez no SQL Editor do projeto Supabase do Elementa.
-- O fórum não exige conta: comentários são públicos e não podem ser editados
-- nem apagados pelo aplicativo.
create table if not exists public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  feedback text not null check (char_length(btrim(feedback)) between 3 and 1000),
  created_at timestamptz not null default now()
);

alter table public.feedback_comments enable row level security;

drop policy if exists "Anyone can read feedback comments" on public.feedback_comments;
create policy "Anyone can read feedback comments"
  on public.feedback_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit feedback comments" on public.feedback_comments;
create policy "Anyone can submit feedback comments"
  on public.feedback_comments
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) between 2 and 60
    and char_length(btrim(feedback)) between 3 and 1000
  );

grant select, insert on public.feedback_comments to anon, authenticated;
