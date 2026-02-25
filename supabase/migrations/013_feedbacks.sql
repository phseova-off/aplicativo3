-- Migration 013: feedbacks table for beta user feedback
-- Run: supabase db push (or apply manually in Supabase dashboard)

create table if not exists public.feedbacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  tipo        text not null check (tipo in ('geral', 'bug', 'sugestao')),
  texto       text not null,
  user_email  text,
  user_nome   text,
  created_at  timestamptz default now()
);

-- RLS: users can insert their own feedback; admins can read all
alter table public.feedbacks enable row level security;

create policy "Users can insert feedback"
  on public.feedbacks for insert
  with check (true); -- allow anonymous + authenticated

create policy "Users can view own feedback"
  on public.feedbacks for select
  using (auth.uid() = user_id or user_id is null);

-- Index for admin dashboard queries
create index if not exists feedbacks_created_at_idx on public.feedbacks (created_at desc);
create index if not exists feedbacks_tipo_idx on public.feedbacks (tipo);
