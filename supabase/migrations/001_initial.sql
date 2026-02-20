-- ============================================================
-- Doceria Pro — Initial Database Schema
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome_negocio    text,
  telefone        text,
  cidade          text,
  onboarding_completo boolean default false,
  plano           text default 'gratuito' check (plano in ('gratuito', 'basico', 'pro')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Pedidos (Orders) ─────────────────────────────────────────
create table public.pedidos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  cliente_nome    text not null,
  cliente_telefone text,
  descricao       text,
  valor           numeric(10, 2) not null check (valor >= 0),
  status          text default 'pendente' check (
                    status in ('pendente', 'em_producao', 'pronto', 'entregue', 'cancelado')
                  ),
  data_entrega    date,
  observacoes     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.pedidos enable row level security;

create policy "Users can manage own pedidos"
  on public.pedidos for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_pedidos_user_id on public.pedidos(user_id);
create index idx_pedidos_status on public.pedidos(status);
create index idx_pedidos_data_entrega on public.pedidos(data_entrega);

-- ── Itens de Pedido ──────────────────────────────────────────
create table public.itens_pedido (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid references public.pedidos(id) on delete cascade not null,
  produto         text not null,
  quantidade      integer not null default 1 check (quantidade > 0),
  preco_unitario  numeric(10, 2) not null check (preco_unitario >= 0),
  created_at      timestamptz default now()
);

alter table public.itens_pedido enable row level security;

create policy "Users can manage itens of own pedidos"
  on public.itens_pedido for all
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id and p.user_id = auth.uid()
    )
  );

-- ── Producao (Production Stages) ─────────────────────────────
create table public.producao (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid references public.pedidos(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  etapa           text not null check (
                    etapa in ('preparo', 'assar', 'decorar', 'embalar', 'pronto')
                  ),
  status          text default 'pendente' check (
                    status in ('pendente', 'em_andamento', 'concluido')
                  ),
  observacoes     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.producao enable row level security;

create policy "Users can manage own producao"
  on public.producao for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_producao_user_id on public.producao(user_id);
create index idx_producao_pedido_id on public.producao(pedido_id);
create index idx_producao_status on public.producao(status);

-- ── Transacoes Financeiras ────────────────────────────────────
create table public.transacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  tipo            text not null check (tipo in ('receita', 'despesa')),
  categoria       text not null,
  valor           numeric(10, 2) not null check (valor > 0),
  descricao       text,
  data            date not null default current_date,
  pedido_id       uuid references public.pedidos(id) on delete set null,
  created_at      timestamptz default now()
);

alter table public.transacoes enable row level security;

create policy "Users can manage own transacoes"
  on public.transacoes for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_transacoes_user_id on public.transacoes(user_id);
create index idx_transacoes_data on public.transacoes(data);
create index idx_transacoes_tipo on public.transacoes(tipo);

-- ── Marketing Cronogramas ─────────────────────────────────────
create table public.marketing_cronogramas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  titulo          text not null,
  conteudo        jsonb not null,
  gerado_em       timestamptz default now()
);

alter table public.marketing_cronogramas enable row level security;

create policy "Users can manage own cronogramas"
  on public.marketing_cronogramas for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_marketing_user_id on public.marketing_cronogramas(user_id);

-- ── Assinaturas Stripe ────────────────────────────────────────
create table public.assinaturas (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plano                   text not null check (plano in ('basico', 'pro')),
  status                  text not null,
  periodo_inicio          timestamptz,
  periodo_fim             timestamptz,
  cancel_at_period_end    boolean default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table public.assinaturas enable row level security;

create policy "Users can view own assinatura"
  on public.assinaturas for select using (auth.uid() = user_id);

-- Service role (used by webhook) can manage all assinaturas
-- (no policy needed — service role bypasses RLS)

create index idx_assinaturas_user_id on public.assinaturas(user_id);
create index idx_assinaturas_stripe_customer on public.assinaturas(stripe_customer_id);

-- ── Updated_at trigger helper ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_pedidos_updated_at
  before update on public.pedidos
  for each row execute procedure public.set_updated_at();

create trigger set_producao_updated_at
  before update on public.producao
  for each row execute procedure public.set_updated_at();

create trigger set_assinaturas_updated_at
  before update on public.assinaturas
  for each row execute procedure public.set_updated_at();
