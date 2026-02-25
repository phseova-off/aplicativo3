-- ============================================================
-- Doceria Pro — Schema SQL Completo (referência)
--
-- Este arquivo consolida TODAS as migrations (001–012) em um
-- único SQL para documentação e fresh installs.
--
-- Para aplicar em um Supabase novo:
--   1. Crie o projeto em supabase.com
--   2. Vá em SQL Editor
--   3. Cole e execute este arquivo inteiro
--
-- ⚠ NÃO execute em um projeto que já tem as migrations 001-012.
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  1. EXTENSÕES                                             │
-- └──────────────────────────────────────────────────────────┘

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ┌──────────────────────────────────────────────────────────┐
-- │  2. ENUMS                                                 │
-- └──────────────────────────────────────────────────────────┘

CREATE TYPE plano_tipo       AS ENUM ('free', 'starter', 'pro');
CREATE TYPE pedido_status    AS ENUM ('novo', 'confirmado', 'producao', 'pronto', 'entregue', 'cancelado');
CREATE TYPE pedido_canal     AS ENUM ('whatsapp', 'instagram', 'presencial', 'cardapio_publico');
CREATE TYPE produto_categoria AS ENUM ('trufa', 'bombom', 'kit', 'outro');
CREATE TYPE transacao_tipo   AS ENUM ('receita', 'despesa');
CREATE TYPE membro_role      AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE unidade_medida   AS ENUM ('kg', 'g', 'l', 'ml', 'un', 'cx', 'pct');
CREATE TYPE lote_status      AS ENUM ('planejado', 'em_andamento', 'concluido', 'cancelado');

-- ┌──────────────────────────────────────────────────────────┐
-- │  3. FUNÇÕES AUXILIARES                                    │
-- └──────────────────────────────────────────────────────────┘

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  4. TABELA: confeiteiros (perfil legado v1)               │
-- │     id = auth.users.id                                    │
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
  acquisition_source  TEXT        CHECK (acquisition_source IN ('organic', 'viral', 'paid')),
  ref_confeitaria_id  UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER confeiteiros_updated_at
  BEFORE UPDATE ON public.confeiteiros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  5. TABELA: confeitarias (tenant principal v2)            │
-- │     Entidade de negócio, desacoplada de auth.users.       │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.confeitarias (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      TEXT          NOT NULL,
  cidade                    TEXT,
  estado                    TEXT,
  telefone                  TEXT,
  logo_url                  TEXT,
  descricao                 TEXT,

  -- URL pública do cardápio
  slug                      TEXT          UNIQUE,

  -- Onboarding
  onboarding_completo       BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Assinatura
  plano                     TEXT          NOT NULL DEFAULT 'free'
                              CHECK (plano IN ('free', 'starter', 'pro')),
  stripe_customer_id        TEXT          UNIQUE,
  stripe_subscription_id    TEXT,

  -- Contadores mensais (feature gating)
  pedidos_mes_atual         INT           NOT NULL DEFAULT 0 CHECK (pedidos_mes_atual >= 0),
  cronogramas_ia_mes_atual  INT           NOT NULL DEFAULT 0 CHECK (cronogramas_ia_mes_atual >= 0),
  mes_referencia            DATE          NOT NULL DEFAULT DATE_TRUNC('month', NOW())::DATE,

  -- Operacional
  area_entrega              TEXT,
  prazo_padrao_dias         INT           DEFAULT 3 CHECK (prazo_padrao_dias >= 0),
  horarios_atendimento      TEXT,
  menu_publico_ativo        BOOLEAN       NOT NULL DEFAULT FALSE,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER confeitarias_updated_at
  BEFORE UPDATE ON public.confeitarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  6. TABELA: confeitaria_membros (M2M users × confeitarias)│
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.confeitaria_membros (
  confeitaria_id  UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            membro_role   NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (confeitaria_id, user_id)
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  7. TABELA: produtos (cardápio)                           │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.produtos (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id         UUID              NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  confeitaria_id         UUID              REFERENCES public.confeitarias(id),
  nome                   TEXT              NOT NULL,
  descricao              TEXT,
  preco                  NUMERIC(10,2)     NOT NULL DEFAULT 0 CHECK (preco >= 0),
  preco_venda            NUMERIC(10,2)     NOT NULL DEFAULT 0,
  custo                  NUMERIC(10,2)     NOT NULL DEFAULT 0 CHECK (custo >= 0),
  custo_calculado        NUMERIC(10,3)     NOT NULL DEFAULT 0,
  rendimento             INT               CHECK (rendimento > 0),
  tempo_producao_minutos INT               CHECK (tempo_producao_minutos >= 0),
  preco_desatualizado    BOOLEAN           NOT NULL DEFAULT FALSE,
  categoria              produto_categoria NOT NULL DEFAULT 'outro',
  ativo                  BOOLEAN           NOT NULL DEFAULT TRUE,
  visivel_no_cardapio    BOOLEAN           NOT NULL DEFAULT TRUE,
  foto_url               TEXT,
  ingredientes           JSONB             NOT NULL DEFAULT '[]'::jsonb,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT produtos_nome_unico_por_confeiteiro UNIQUE (confeiteiro_id, nome),
  CONSTRAINT produtos_ingredientes_eh_array CHECK (jsonb_typeof(ingredientes) = 'array')
);

CREATE TRIGGER produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  8. TABELA: clientes                                      │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.clientes (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeitaria_id        UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  nome                  TEXT          NOT NULL,
  telefone              TEXT,
  email                 TEXT,
  canal_preferido       pedido_canal,
  total_pedidos         INT           NOT NULL DEFAULT 0 CHECK (total_pedidos >= 0),
  valor_total_compras   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_total_compras >= 0),
  ultima_compra         DATE,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT clientes_telefone_unico UNIQUE (confeitaria_id, telefone)
);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  9. TABELA: pedidos                                       │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.pedidos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id    UUID          NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  confeitaria_id    UUID          REFERENCES public.confeitarias(id),
  cliente_id        UUID          REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome      TEXT          NOT NULL,
  cliente_telefone  TEXT,
  numero            TEXT,
  status            pedido_status NOT NULL DEFAULT 'novo',
  canal             pedido_canal  NOT NULL DEFAULT 'presencial',
  data_entrega      TIMESTAMPTZ,
  valor_total       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  valor_sinal       NUMERIC(10,2) DEFAULT 0 CHECK (valor_sinal >= 0),
  endereco_entrega  TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  10. TABELA: itens_pedido                                 │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.itens_pedido (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID           NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id      UUID           REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome_produto    TEXT           NOT NULL,
  quantidade      INTEGER        NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario  NUMERIC(10,2)  NOT NULL CHECK (preco_unitario >= 0),
  subtotal        NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  personalizacao  TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  11. TABELA: ingredientes_catalogo                        │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.ingredientes_catalogo (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeitaria_id    UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  confeiteiro_id    UUID          REFERENCES public.confeiteiros(id),
  nome              TEXT          NOT NULL,
  unidade           unidade_medida NOT NULL DEFAULT 'g',
  preco_atual       NUMERIC(10,4) NOT NULL CHECK (preco_atual >= 0),
  preco_anterior    NUMERIC(10,4),
  preco_updated_at  TIMESTAMPTZ,
  fornecedor        TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT ingredientes_nome_unico UNIQUE (confeitaria_id, nome)
);

CREATE TRIGGER ingredientes_catalogo_updated_at
  BEFORE UPDATE ON public.ingredientes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  12. TABELA: produtos_ingredientes (N:M)                  │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.produtos_ingredientes (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id       UUID          NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  ingrediente_id   UUID          NOT NULL REFERENCES public.ingredientes_catalogo(id) ON DELETE RESTRICT,
  quantidade       NUMERIC(12,4) NOT NULL CHECK (quantidade > 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT produto_ingrediente_unico UNIQUE (produto_id, ingrediente_id)
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  13. TABELA: producao_lotes                               │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.producao_lotes (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id        UUID           NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  confeitaria_id        UUID           REFERENCES public.confeitarias(id),
  produto_id            UUID           REFERENCES public.produtos(id) ON DELETE SET NULL,
  pedido_id             UUID           REFERENCES public.pedidos(id) ON DELETE SET NULL,
  nome_produto          TEXT           NOT NULL,
  quantidade_planejada  INTEGER        NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_produzida  INTEGER        NOT NULL DEFAULT 0 CHECK (quantidade_produzida >= 0),
  data_producao         DATE           NOT NULL DEFAULT CURRENT_DATE,
  custo_total           NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (custo_total >= 0),
  custo_estimado        NUMERIC(10,2)  NOT NULL DEFAULT 0,
  custo_real            NUMERIC(10,2),
  status                lote_status    NOT NULL DEFAULT 'planejado',
  motivo_desvio         TEXT,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER producao_lotes_updated_at
  BEFORE UPDATE ON public.producao_lotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  14. TABELA: transacoes (financeiro)                      │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.transacoes (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id  UUID           NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  confeitaria_id  UUID           REFERENCES public.confeitarias(id),
  tipo            transacao_tipo NOT NULL,
  categoria       TEXT           NOT NULL,
  descricao       TEXT,
  valor           NUMERIC(10,2)  NOT NULL CHECK (valor > 0),
  data            DATE           NOT NULL DEFAULT CURRENT_DATE,
  pedido_id       UUID           REFERENCES public.pedidos(id) ON DELETE SET NULL,
  origem          TEXT           CHECK (origem IN ('manual', 'pedido_automatico', 'lote_automatico')) DEFAULT 'manual',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  15. TABELA: cronogramas_marketing (IA)                   │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.cronogramas_marketing (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id        UUID        NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  confeitaria_id        UUID        REFERENCES public.confeitarias(id),
  mes                   SMALLINT    NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano                   SMALLINT    NOT NULL CHECK (ano >= 2024),
  conteudo              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  datas_comemorativas   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tokens_usados         INT         DEFAULT 0 CHECK (tokens_usados >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cronograma_unico_por_mes_ano UNIQUE (confeiteiro_id, mes, ano),
  CONSTRAINT cronogramas_conteudo_eh_array CHECK (jsonb_typeof(conteudo) = 'array'),
  CONSTRAINT cronogramas_datas_eh_array CHECK (jsonb_typeof(datas_comemorativas) = 'array')
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  16. TABELA: alertas_ingrediente                          │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.alertas_ingrediente (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id        UUID          NOT NULL REFERENCES public.confeiteiros(id) ON DELETE CASCADE,
  ingrediente_id        UUID          NOT NULL REFERENCES public.ingredientes_catalogo(id) ON DELETE CASCADE,
  ingrediente_nome      TEXT          NOT NULL,
  preco_anterior        NUMERIC(10,4) NOT NULL,
  preco_novo            NUMERIC(10,4) NOT NULL,
  variacao_percentual   NUMERIC(6,2)  NOT NULL,
  produtos_afetados     INT           NOT NULL DEFAULT 0,
  lido                  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ┌──────────────────────────────────────────────────────────┐
-- │  17. TABELA: stripe_events_processados                    │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE public.stripe_events_processados (
  stripe_event_id  TEXT        PRIMARY KEY,
  tipo             TEXT        NOT NULL,
  payload_resumo   JSONB,
  processado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: cria confeiteiro + confeitaria + membro ao registrar via Auth
CREATE OR REPLACE FUNCTION public.handle_new_confeiteiro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome TEXT;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.confeiteiros (id, nome, email)
  VALUES (NEW.id, v_nome, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.confeitarias (id, nome, mes_referencia)
  VALUES (NEW.id, v_nome, DATE_TRUNC('month', NOW())::DATE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.confeitaria_membros (confeitaria_id, user_id, role)
  VALUES (NEW.id, NEW.id, 'owner')
  ON CONFLICT (confeitaria_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_confeiteiro();

-- Trigger: recalcula valor_total do pedido
CREATE OR REPLACE FUNCTION public.sync_valor_total_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_pedido_id UUID; v_total NUMERIC(10,2);
BEGIN
  IF TG_OP = 'DELETE' THEN v_pedido_id := OLD.pedido_id;
  ELSE v_pedido_id := NEW.pedido_id; END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM public.itens_pedido WHERE pedido_id = v_pedido_id;

  UPDATE public.pedidos SET valor_total = v_total, updated_at = NOW()
  WHERE id = v_pedido_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER itens_pedido_sync_total
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
  FOR EACH ROW EXECUTE FUNCTION public.sync_valor_total_pedido();

-- Trigger: gera numero de pedido
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_next INT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COALESCE(MAX(numero::INT), 0) + 1 INTO v_next
    FROM public.pedidos
    WHERE confeitaria_id = NEW.confeitaria_id AND numero ~ '^\d+$';
    NEW.numero := LPAD(COALESCE(v_next, 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_gerar_numero
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_pedido();

-- Trigger: histórico de preço do ingrediente
CREATE OR REPLACE FUNCTION public.ingrediente_historico_preco()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.preco_atual IS DISTINCT FROM OLD.preco_atual THEN
    NEW.preco_anterior  := OLD.preco_atual;
    NEW.preco_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ingredientes_historico_preco
  BEFORE UPDATE ON public.ingredientes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.ingrediente_historico_preco();

-- Trigger: recalcula custo do produto quando ingredientes mudam
CREATE OR REPLACE FUNCTION public.recalcular_custo_produto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_produto_id UUID; v_custo NUMERIC(10,3);
BEGIN
  v_produto_id := COALESCE(NEW.produto_id, OLD.produto_id);
  SELECT COALESCE(SUM(pi.quantidade * ic.preco_atual), 0) INTO v_custo
  FROM public.produtos_ingredientes pi
  JOIN public.ingredientes_catalogo ic ON ic.id = pi.ingrediente_id
  WHERE pi.produto_id = v_produto_id;

  UPDATE public.produtos SET custo_calculado = v_custo, updated_at = NOW()
  WHERE id = v_produto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER produtos_ingredientes_sync_custo
  AFTER INSERT OR UPDATE OR DELETE ON public.produtos_ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_custo_produto();

-- Trigger: propaga preço do ingrediente para todos os produtos que o usam
CREATE OR REPLACE FUNCTION public.propagar_preco_ingrediente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.preco_atual IS DISTINCT FROM OLD.preco_atual THEN
    UPDATE public.produtos p
       SET custo_calculado = (
             SELECT COALESCE(SUM(pi2.quantidade * ic2.preco_atual), 0)
               FROM public.produtos_ingredientes pi2
               JOIN public.ingredientes_catalogo ic2 ON ic2.id = pi2.ingrediente_id
              WHERE pi2.produto_id = p.id),
           updated_at = NOW()
     WHERE EXISTS (
       SELECT 1 FROM public.produtos_ingredientes pi
        WHERE pi.produto_id = p.id AND pi.ingrediente_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ingrediente_preco_propagar
  AFTER UPDATE ON public.ingredientes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.propagar_preco_ingrediente();

-- Trigger: contadores mensais de pedidos
CREATE OR REPLACE FUNCTION public.incrementar_pedidos_mes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_mes_atual DATE := DATE_TRUNC('month', NOW())::DATE;
BEGIN
  UPDATE public.confeitarias
     SET pedidos_mes_atual = CASE WHEN mes_referencia < v_mes_atual THEN 1 ELSE pedidos_mes_atual + 1 END,
         cronogramas_ia_mes_atual = CASE WHEN mes_referencia < v_mes_atual THEN 0 ELSE cronogramas_ia_mes_atual END,
         mes_referencia = v_mes_atual, updated_at = NOW()
   WHERE id = NEW.confeitaria_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_incrementar_contador
  AFTER INSERT ON public.pedidos
  FOR EACH ROW WHEN (NEW.confeitaria_id IS NOT NULL)
  EXECUTE FUNCTION public.incrementar_pedidos_mes();

-- Trigger: stats de clientes (pedido entregue)
CREATE OR REPLACE FUNCTION public.sync_stats_cliente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'entregue' AND OLD.status IS DISTINCT FROM 'entregue' AND NEW.cliente_id IS NOT NULL THEN
    UPDATE public.clientes
       SET total_pedidos = total_pedidos + 1, valor_total_compras = valor_total_compras + NEW.valor_total,
           ultima_compra = CURRENT_DATE, updated_at = NOW()
     WHERE id = NEW.cliente_id;
  END IF;
  IF OLD.status = 'entregue' AND NEW.status IS DISTINCT FROM 'entregue' AND NEW.cliente_id IS NOT NULL THEN
    UPDATE public.clientes
       SET total_pedidos = GREATEST(0, total_pedidos - 1),
           valor_total_compras = GREATEST(0, valor_total_compras - OLD.valor_total), updated_at = NOW()
     WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_sync_stats_cliente
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.sync_stats_cliente();

-- Trigger: pedido entregue → receita automática
CREATE OR REPLACE FUNCTION public.gerar_receita_pedido_entregue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status <> 'entregue') THEN
    IF NOT EXISTS (SELECT 1 FROM public.transacoes WHERE pedido_id = NEW.id AND tipo = 'receita' AND origem = 'pedido_automatico') THEN
      INSERT INTO public.transacoes (confeiteiro_id, confeitaria_id, tipo, categoria, descricao, valor, data, pedido_id, origem)
      VALUES (NEW.confeiteiro_id, NEW.confeitaria_id, 'receita', 'Pedidos',
              'Pedido entregue — ' || NEW.cliente_nome, GREATEST(NEW.valor_total, 0),
              COALESCE(CAST(NEW.data_entrega AS DATE), CURRENT_DATE), NEW.id, 'pedido_automatico');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pedido_entregue_gera_receita
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.gerar_receita_pedido_entregue();

-- Trigger: lote concluído → despesa automática
CREATE OR REPLACE FUNCTION public.gerar_despesa_lote_concluido()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_custo NUMERIC(10,2);
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    v_custo := COALESCE(NULLIF(NEW.custo_real, 0), NULLIF(NEW.custo_estimado, 0), NEW.custo_total, 0);
    IF v_custo > 0 THEN
      INSERT INTO public.transacoes (confeiteiro_id, confeitaria_id, tipo, categoria, descricao, valor, data, origem)
      VALUES (NEW.confeiteiro_id, NEW.confeitaria_id, 'despesa', 'Ingredientes',
              'Insumos produção: ' || NEW.nome_produto || ' (' || NEW.quantidade_produzida || ' unid.)',
              v_custo, CURRENT_DATE, 'lote_automatico');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lote_concluido_gera_despesa
  AFTER UPDATE ON public.producao_lotes
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.gerar_despesa_lote_concluido();

-- Trigger: onboarding sync confeiteiros → confeitarias
CREATE OR REPLACE FUNCTION public.sync_onboarding_completo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.onboarding_completo IS DISTINCT FROM OLD.onboarding_completo THEN
    UPDATE public.confeitarias SET onboarding_completo = NEW.onboarding_completo, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER confeiteiros_sync_onboarding
  AFTER UPDATE OF onboarding_completo ON public.confeiteiros
  FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_completo();

-- Função utilitária: reset de contadores mensais
CREATE OR REPLACE FUNCTION public.resetar_contadores_mensais(p_confeitaria_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.confeitarias
     SET pedidos_mes_atual = 0, cronogramas_ia_mes_atual = 0,
         mes_referencia = DATE_TRUNC('month', NOW())::DATE, updated_at = NOW()
   WHERE id = p_confeitaria_id AND mes_referencia < DATE_TRUNC('month', NOW())::DATE;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Funções auxiliares RLS
CREATE OR REPLACE FUNCTION public.is_member(p_confeitaria_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.confeitaria_membros WHERE confeitaria_id = p_confeitaria_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_editor(p_confeitaria_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.confeitaria_membros WHERE confeitaria_id = p_confeitaria_id AND user_id = auth.uid() AND role IN ('owner', 'editor'));
$$;

CREATE OR REPLACE FUNCTION public.is_owner(p_confeitaria_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.confeitaria_membros WHERE confeitaria_id = p_confeitaria_id AND user_id = auth.uid() AND role = 'owner');
$$;

-- Habilitar RLS em TODAS as tabelas
ALTER TABLE public.confeiteiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confeitarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confeitaria_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronogramas_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_ingrediente ENABLE ROW LEVEL SECURITY;
-- stripe_events_processados: sem RLS (apenas service_role acessa)

-- ── confeiteiros: user_id = auth.uid() ──────────────────────
CREATE POLICY "Proprio perfil SELECT" ON public.confeiteiros FOR SELECT USING (id = auth.uid());
CREATE POLICY "Proprio perfil UPDATE" ON public.confeiteiros FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Proprio perfil INSERT" ON public.confeiteiros FOR INSERT WITH CHECK (id = auth.uid());

-- ── confeitarias: via membership ────────────────────────────
CREATE POLICY "Membros podem ver confeitaria" ON public.confeitarias FOR SELECT USING (is_member(id));
CREATE POLICY "Owners podem atualizar" ON public.confeitarias FOR UPDATE USING (is_owner(id));

-- ── confeitaria_membros ─────────────────────────────────────
CREATE POLICY "Membros veem membros" ON public.confeitaria_membros FOR SELECT USING (is_member(confeitaria_id));
CREATE POLICY "Owners gerenciam membros INSERT" ON public.confeitaria_membros FOR INSERT WITH CHECK (is_owner(confeitaria_id));
CREATE POLICY "Owners gerenciam membros UPDATE" ON public.confeitaria_membros FOR UPDATE USING (is_owner(confeitaria_id));
CREATE POLICY "Owners gerenciam membros DELETE" ON public.confeitaria_membros FOR DELETE USING (is_owner(confeitaria_id));

-- ── produtos: via confeitaria_id ou confeiteiro_id ──────────
CREATE POLICY "Produtos SELECT v2" ON public.produtos FOR SELECT USING (is_member(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Produtos INSERT v2" ON public.produtos FOR INSERT WITH CHECK (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Produtos UPDATE v2" ON public.produtos FOR UPDATE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Produtos DELETE v2" ON public.produtos FOR DELETE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());

-- ── pedidos: via confeitaria_id ou confeiteiro_id ───────────
CREATE POLICY "Pedidos SELECT v2" ON public.pedidos FOR SELECT USING (is_member(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Pedidos INSERT v2" ON public.pedidos FOR INSERT WITH CHECK (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Pedidos UPDATE v2" ON public.pedidos FOR UPDATE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Pedidos DELETE v2" ON public.pedidos FOR DELETE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());

-- ── itens_pedido: via pedido parent ─────────────────────────
CREATE POLICY "Itens via pedido" ON public.itens_pedido FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (is_member(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));
CREATE POLICY "Itens INSERT via pedido" ON public.itens_pedido FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (is_editor(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));
CREATE POLICY "Itens UPDATE via pedido" ON public.itens_pedido FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (is_editor(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));
CREATE POLICY "Itens DELETE via pedido" ON public.itens_pedido FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (is_editor(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));

-- ── clientes: via confeitaria_id ────────────────────────────
CREATE POLICY "Clientes SELECT" ON public.clientes FOR SELECT USING (is_member(confeitaria_id));
CREATE POLICY "Clientes INSERT" ON public.clientes FOR INSERT WITH CHECK (is_editor(confeitaria_id));
CREATE POLICY "Clientes UPDATE" ON public.clientes FOR UPDATE USING (is_editor(confeitaria_id));
CREATE POLICY "Clientes DELETE" ON public.clientes FOR DELETE USING (is_editor(confeitaria_id));

-- ── ingredientes_catalogo: via confeitaria_id ───────────────
CREATE POLICY "Ingredientes SELECT" ON public.ingredientes_catalogo FOR SELECT USING (is_member(confeitaria_id));
CREATE POLICY "Ingredientes INSERT" ON public.ingredientes_catalogo FOR INSERT WITH CHECK (is_editor(confeitaria_id));
CREATE POLICY "Ingredientes UPDATE" ON public.ingredientes_catalogo FOR UPDATE USING (is_editor(confeitaria_id));
CREATE POLICY "Ingredientes DELETE" ON public.ingredientes_catalogo FOR DELETE USING (is_editor(confeitaria_id));

-- ── produtos_ingredientes: via produto parent ───────────────
CREATE POLICY "ProdIngr SELECT" ON public.produtos_ingredientes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = produto_id AND (is_member(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));
CREATE POLICY "ProdIngr INSERT" ON public.produtos_ingredientes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = produto_id AND (is_editor(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));
CREATE POLICY "ProdIngr DELETE" ON public.produtos_ingredientes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.produtos p WHERE p.id = produto_id AND (is_editor(p.confeitaria_id) OR p.confeiteiro_id = auth.uid())));

-- ── producao_lotes: via confeitaria_id ou confeiteiro_id ────
CREATE POLICY "Lotes SELECT" ON public.producao_lotes FOR SELECT USING (is_member(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Lotes INSERT" ON public.producao_lotes FOR INSERT WITH CHECK (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Lotes UPDATE" ON public.producao_lotes FOR UPDATE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Lotes DELETE" ON public.producao_lotes FOR DELETE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());

-- ── transacoes: via confeitaria_id ou confeiteiro_id ────────
CREATE POLICY "Transacoes SELECT" ON public.transacoes FOR SELECT USING (is_member(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Transacoes INSERT" ON public.transacoes FOR INSERT WITH CHECK (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Transacoes UPDATE" ON public.transacoes FOR UPDATE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Transacoes DELETE" ON public.transacoes FOR DELETE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());

-- ── cronogramas_marketing: via confeitaria_id ou confeiteiro_id
CREATE POLICY "Cronogramas SELECT" ON public.cronogramas_marketing FOR SELECT USING (is_member(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Cronogramas INSERT" ON public.cronogramas_marketing FOR INSERT WITH CHECK (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Cronogramas UPDATE" ON public.cronogramas_marketing FOR UPDATE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());
CREATE POLICY "Cronogramas DELETE" ON public.cronogramas_marketing FOR DELETE USING (is_editor(confeitaria_id) OR confeiteiro_id = auth.uid());

-- ── alertas_ingrediente ─────────────────────────────────────
CREATE POLICY "Alertas SELECT" ON public.alertas_ingrediente FOR SELECT USING (confeiteiro_id = auth.uid());
CREATE POLICY "Alertas UPDATE" ON public.alertas_ingrediente FOR UPDATE USING (confeiteiro_id = auth.uid());

-- ============================================================
-- VIEW: resumo_financeiro_mensal
-- ============================================================

CREATE OR REPLACE VIEW public.resumo_financeiro_mensal AS
SELECT
  COALESCE(t.confeitaria_id, t.confeiteiro_id) AS confeitaria_id,
  DATE_TRUNC('month', t.data)::DATE            AS mes,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'receita'),  0) AS total_receitas,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'despesa'),  0) AS total_despesas,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'receita'),  0)
    - COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'despesa'), 0) AS lucro_liquido,
  COUNT(*) FILTER (WHERE t.tipo = 'receita')  AS qtd_receitas,
  COUNT(*) FILTER (WHERE t.tipo = 'despesa')  AS qtd_despesas,
  COUNT(DISTINCT t.pedido_id) FILTER (WHERE t.tipo = 'receita') AS pedidos_pagos
FROM public.transacoes t
GROUP BY COALESCE(t.confeitaria_id, t.confeiteiro_id), DATE_TRUNC('month', t.data)::DATE;

-- ============================================================
-- ÍNDICES
-- ============================================================

-- confeiteiros
CREATE INDEX idx_confeiteiros_stripe ON public.confeiteiros (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_confeiteiros_plano ON public.confeiteiros (plano);

-- confeitarias
CREATE INDEX idx_confeitarias_stripe ON public.confeitarias (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_confeitarias_plano ON public.confeitarias (plano);
CREATE INDEX idx_confeitarias_estado ON public.confeitarias (estado) WHERE estado IS NOT NULL;
CREATE INDEX idx_confeitarias_slug ON public.confeitarias (slug) WHERE slug IS NOT NULL;

-- confeitaria_membros
CREATE INDEX idx_membros_user ON public.confeitaria_membros (user_id);
CREATE INDEX idx_membros_role ON public.confeitaria_membros (confeitaria_id, role);

-- produtos
CREATE INDEX idx_produtos_confeitaria ON public.produtos (confeitaria_id) WHERE confeitaria_id IS NOT NULL;
CREATE INDEX idx_produtos_confeitaria_ativo ON public.produtos (confeitaria_id, ativo, categoria) WHERE confeitaria_id IS NOT NULL;
CREATE INDEX idx_produtos_nome_trgm ON public.produtos USING gin (nome gin_trgm_ops);
CREATE INDEX idx_produtos_cardapio ON public.produtos (confeitaria_id, ativo, visivel_no_cardapio) WHERE ativo AND visivel_no_cardapio;

-- clientes
CREATE INDEX idx_clientes_confeitaria ON public.clientes (confeitaria_id);
CREATE INDEX idx_clientes_nome_trgm ON public.clientes USING gin (nome gin_trgm_ops);
CREATE INDEX idx_clientes_telefone ON public.clientes (confeitaria_id, telefone) WHERE telefone IS NOT NULL;

-- pedidos
CREATE INDEX idx_pedidos_confeitaria ON public.pedidos (confeitaria_id) WHERE confeitaria_id IS NOT NULL;
CREATE INDEX idx_pedidos_status ON public.pedidos (confeitaria_id, status);
CREATE INDEX idx_pedidos_entrega ON public.pedidos (confeitaria_id, data_entrega);
CREATE INDEX idx_pedidos_created ON public.pedidos (confeitaria_id, created_at DESC);
CREATE INDEX idx_pedidos_numero ON public.pedidos (confeitaria_id, numero);
CREATE INDEX idx_pedidos_cliente ON public.pedidos (cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_pedidos_entrega_abertos ON public.pedidos (data_entrega, status) WHERE status NOT IN ('entregue', 'cancelado');

-- itens_pedido
CREATE INDEX idx_itens_pedido ON public.itens_pedido (pedido_id);
CREATE INDEX idx_itens_produto ON public.itens_pedido (produto_id) WHERE produto_id IS NOT NULL;

-- ingredientes_catalogo
CREATE INDEX idx_ingredientes_confeitaria ON public.ingredientes_catalogo (confeitaria_id);
CREATE INDEX idx_ingredientes_nome_trgm ON public.ingredientes_catalogo USING gin (nome gin_trgm_ops);

-- produtos_ingredientes
CREATE INDEX idx_prod_ingr_produto ON public.produtos_ingredientes (produto_id);
CREATE INDEX idx_prod_ingr_ingrediente ON public.produtos_ingredientes (ingrediente_id);

-- producao_lotes
CREATE INDEX idx_lotes_confeitaria ON public.producao_lotes (confeitaria_id) WHERE confeitaria_id IS NOT NULL;
CREATE INDEX idx_lotes_status ON public.producao_lotes (confeitaria_id, status);
CREATE INDEX idx_lotes_data ON public.producao_lotes (confeitaria_id, data_producao);

-- transacoes
CREATE INDEX idx_transacoes_confeitaria ON public.transacoes (confeitaria_id, data DESC) WHERE confeitaria_id IS NOT NULL;
CREATE INDEX idx_transacoes_tipo_data ON public.transacoes (confeitaria_id, tipo, data);
CREATE INDEX idx_transacoes_pedido ON public.transacoes (pedido_id) WHERE pedido_id IS NOT NULL;

-- cronogramas_marketing
CREATE INDEX idx_cronogramas_confeitaria ON public.cronogramas_marketing (confeitaria_id) WHERE confeitaria_id IS NOT NULL;

-- alertas_ingrediente
CREATE INDEX idx_alertas_confeiteiro ON public.alertas_ingrediente (confeiteiro_id, created_at DESC);
CREATE INDEX idx_alertas_nao_lidos ON public.alertas_ingrediente (confeiteiro_id) WHERE NOT lido;

-- stripe_events
CREATE INDEX idx_stripe_events_processado_em ON public.stripe_events_processados (processado_em);

-- ============================================================
-- STORAGE: bucket para fotos de perfil
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Usuarios fazem upload na sua pasta" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Avatars sao publicos" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
CREATE POLICY "Usuarios atualizam seus avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Usuarios deletam seus avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================

ANALYZE;
