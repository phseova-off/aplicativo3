-- ============================================================
-- Doceria Pro — Schema Completo
-- Migration: 001_schema.sql
-- Aplique no Supabase SQL Editor ou via: supabase db push
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  EXTENSÕES                                               │
-- └──────────────────────────────────────────────────────────┘
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- busca textual eficiente (LIKE/ILIKE)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- hashing de senhas no seed

-- ┌──────────────────────────────────────────────────────────┐
-- │  ENUMS                                                   │
-- └──────────────────────────────────────────────────────────┘

-- Plano de assinatura do confeiteiro
CREATE TYPE plano_tipo AS ENUM (
  'free',
  'starter',
  'pro'
);

-- Status do pedido no ciclo de vida
CREATE TYPE pedido_status AS ENUM (
  'novo',
  'confirmado',
  'producao',
  'pronto',
  'entregue',
  'cancelado'
);

-- Canal de origem do pedido
CREATE TYPE pedido_canal AS ENUM (
  'whatsapp',
  'instagram',
  'presencial'
);

-- Categoria do produto no cardápio
CREATE TYPE produto_categoria AS ENUM (
  'trufa',
  'bombom',
  'kit',
  'outro'
);

-- Tipo de movimentação financeira
CREATE TYPE transacao_tipo AS ENUM (
  'receita',
  'despesa'
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  FUNÇÃO AUXILIAR: atualiza updated_at automaticamente    │
-- └──────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: confeiteiros (tenant principal)                  │
-- │                                                          │
-- │  Cada confeiteiro é um usuário do Supabase Auth.         │
-- │  id = auth.users.id — chave de multi-tenancy.            │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.confeiteiros (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                TEXT        NOT NULL DEFAULT '',
  email               TEXT        NOT NULL DEFAULT '',
  telefone            TEXT,
  cidade              TEXT,
  logo_url            TEXT,
  plano               plano_tipo  NOT NULL DEFAULT 'free',
  stripe_customer_id  TEXT        UNIQUE,
  onboarding_completo BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: cria perfil automaticamente ao registrar via Auth
CREATE OR REPLACE FUNCTION public.handle_new_confeiteiro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.confeiteiros (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_confeiteiro();

CREATE TRIGGER confeiteiros_updated_at
  BEFORE UPDATE ON public.confeiteiros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: produtos (cardápio)                              │
-- │                                                          │
-- │  ingredientes JSONB schema:                              │
-- │  [{                                                      │
-- │    "nome": "Chocolate ao leite",                         │
-- │    "quantidade": 200,                                    │
-- │    "unidade": "g",                                       │
-- │    "custo_unitario": 0.05                                │
-- │  }]                                                      │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.produtos (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  confeiteiro_id  UUID              NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  nome            TEXT              NOT NULL,
  descricao       TEXT,
  preco           NUMERIC(10, 2)    NOT NULL DEFAULT 0 CHECK (preco >= 0),
  custo           NUMERIC(10, 2)    NOT NULL DEFAULT 0 CHECK (custo >= 0),
  categoria       produto_categoria NOT NULL DEFAULT 'outro',
  ativo           BOOLEAN           NOT NULL DEFAULT TRUE,
  foto_url        TEXT,
  ingredientes    JSONB             NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- Um confeiteiro não pode ter dois produtos com o mesmo nome
  CONSTRAINT produtos_nome_unico_por_confeiteiro UNIQUE (confeiteiro_id, nome),
  -- ingredientes deve ser um array JSON
  CONSTRAINT produtos_ingredientes_eh_array CHECK (jsonb_typeof(ingredientes) = 'array')
);

-- Coluna computada: margem de lucro (%)
-- Não é uma coluna gerada porque depende de runtime (> 0)
-- Use como view ou consulta: (preco - custo) / NULLIF(preco, 0) * 100

CREATE TRIGGER produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: pedidos (encomendas dos clientes)               │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.pedidos (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  confeiteiro_id    UUID          NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  cliente_nome      TEXT          NOT NULL,
  cliente_telefone  TEXT,
  status            pedido_status NOT NULL DEFAULT 'novo',
  canal             pedido_canal  NOT NULL DEFAULT 'presencial',
  data_entrega      TIMESTAMPTZ,
  valor_total       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: itens_pedido (linha de cada pedido)             │
-- │                                                          │
-- │  subtotal é uma coluna GERADA (calculada automaticamente)│
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.itens_pedido (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       UUID           NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id      UUID           REFERENCES public.produtos(id) ON DELETE SET NULL,
  -- nome_produto salvo no momento do pedido (histórico even após produto excluído)
  nome_produto    TEXT           NOT NULL,
  quantidade      INTEGER        NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario  NUMERIC(10,2)  NOT NULL CHECK (preco_unitario >= 0),
  subtotal        NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: producao_lotes (controle de produção em lote)   │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.producao_lotes (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  confeiteiro_id        UUID           NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  produto_id            UUID           REFERENCES public.produtos(id) ON DELETE SET NULL,
  -- nome salvo para histórico
  nome_produto          TEXT           NOT NULL,
  quantidade_planejada  INTEGER        NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_produzida  INTEGER        NOT NULL DEFAULT 0 CHECK (quantidade_produzida >= 0),
  data_producao         DATE           NOT NULL DEFAULT CURRENT_DATE,
  custo_total           NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (custo_total >= 0),
  observacoes           TEXT,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER producao_lotes_updated_at
  BEFORE UPDATE ON public.producao_lotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: transacoes (financeiro)                          │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.transacoes (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  confeiteiro_id  UUID           NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  tipo            transacao_tipo NOT NULL,
  categoria       TEXT           NOT NULL,
  descricao       TEXT,
  valor           NUMERIC(10,2)  NOT NULL CHECK (valor > 0),
  data            DATE           NOT NULL DEFAULT CURRENT_DATE,
  -- Vínculo opcional: transação gerada por um pedido específico
  pedido_id       UUID           REFERENCES public.pedidos(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: cronogramas_marketing (IA)                       │
-- │                                                          │
-- │  conteudo JSONB schema (array de posts):                 │
-- │  [{                                                      │
-- │    "dia": 1,                                             │
-- │    "plataforma": "Instagram",                            │
-- │    "tema": "Trufa de Ferrero Rocher",                    │
-- │    "legenda": "...",                                     │
-- │    "hashtags": ["#trufa", "#doceria"],                   │
-- │    "horario_sugerido": "19:00"                           │
-- │  }]                                                      │
-- │                                                          │
-- │  datas_comemorativas JSONB schema:                       │
-- │  [{"data": "2025-06-12", "nome": "Dia dos Namorados"}]  │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.cronogramas_marketing (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  confeiteiro_id        UUID        NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  mes                   SMALLINT    NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano                   SMALLINT    NOT NULL CHECK (ano >= 2024),
  conteudo              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  datas_comemorativas   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Apenas um cronograma por mês/ano por confeiteiro
  CONSTRAINT cronograma_unico_por_mes_ano UNIQUE (confeiteiro_id, mes, ano),
  CONSTRAINT cronogramas_conteudo_eh_array CHECK (jsonb_typeof(conteudo) = 'array'),
  CONSTRAINT cronogramas_datas_eh_array CHECK (jsonb_typeof(datas_comemorativas) = 'array')
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  FUNÇÃO: recalcula valor_total do pedido automaticamente │
-- └──────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.sync_valor_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  v_pedido_id UUID;
  v_total     NUMERIC(10,2);
BEGIN
  -- Pega o pedido_id do registro afetado (INSERT/UPDATE/DELETE)
  IF TG_OP = 'DELETE' THEN
    v_pedido_id := OLD.pedido_id;
  ELSE
    v_pedido_id := NEW.pedido_id;
  END IF;

  SELECT COALESCE(SUM(subtotal), 0)
    INTO v_total
    FROM public.itens_pedido
   WHERE pedido_id = v_pedido_id;

  UPDATE public.pedidos
     SET valor_total = v_total,
         updated_at  = NOW()
   WHERE id = v_pedido_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER itens_pedido_sync_total
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.sync_valor_total_pedido();
