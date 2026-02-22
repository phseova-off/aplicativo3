-- ============================================================
-- Doceria Pro — Schema v2: Multi-usuário desde o início
-- Migration: 004_v2_multiusuario.sql
--
-- DESIGN:
--   confeitarias  → entidade de negócio (tenant real)
--   confeitaria_membros → M2M auth.users × confeitarias (owner/editor/viewer)
--   clientes      → entidade própria (não só campo de texto no pedido)
--   ingredientes_catalogo → ingredientes com histórico de preço
--   produtos_ingredientes → relação N:M produtos × ingredientes com quantidade
--
-- ESTRATÉGIA DE MIGRAÇÃO:
--   Para preservar compatibilidade com dados existentes (confeiteiros):
--   - Cada confeiteiro EXISTENTE ganha uma confeitaria com o MESMO UUID
--   - Confeiteiro vira membro 'owner' dessa confeitaria
--   - Colunas novas são adicionadas via ALTER TABLE, populadas por UPDATE
--   - Trigger handle_new_confeiteiro atualizado para criar confeitaria+membro
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  NOVOS ENUMS                                             │
-- └──────────────────────────────────────────────────────────┘

DO $$ BEGIN
  CREATE TYPE membro_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unidade_medida AS ENUM ('kg', 'g', 'l', 'ml', 'un', 'cx', 'pct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: confeitarias                                     │
-- │                                                          │
-- │  Entidade de negócio (tenant). Desacoplada de auth.users.│
-- │  Um usuário pode pertencer a múltiplas confeitarias e    │
-- │  uma confeitaria pode ter múltiplos usuários (futuro).   │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.confeitarias (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      TEXT          NOT NULL,
  cidade                    TEXT,
  telefone                  TEXT,
  logo_url                  TEXT,
  descricao                 TEXT,

  -- Assinatura
  plano                     TEXT          NOT NULL DEFAULT 'free'
                              CHECK (plano IN ('free', 'starter', 'pro')),
  stripe_customer_id        TEXT          UNIQUE,
  stripe_subscription_id    TEXT,

  -- Contadores mensais para feature gating (resetados por trigger)
  pedidos_mes_atual         INT           NOT NULL DEFAULT 0 CHECK (pedidos_mes_atual >= 0),
  cronogramas_ia_mes_atual  INT           NOT NULL DEFAULT 0 CHECK (cronogramas_ia_mes_atual >= 0),
  -- Primeiro dia do mês de referência dos contadores acima
  mes_referencia            DATE          NOT NULL DEFAULT DATE_TRUNC('month', NOW())::DATE,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER confeitarias_updated_at
  BEFORE UPDATE ON public.confeitarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Migração de dados: criar confeitaria para cada confeiteiro existente ──
-- O UUID da confeitaria é o mesmo do confeiteiro/auth.users para mapeamento direto.
INSERT INTO public.confeitarias (id, nome, cidade, telefone, logo_url, plano, stripe_customer_id, created_at, updated_at)
SELECT
  c.id,
  c.nome,
  c.cidade,
  c.telefone,
  c.logo_url,
  c.plano::TEXT,
  c.stripe_customer_id,
  c.created_at,
  c.updated_at
FROM public.confeiteiros c
ON CONFLICT (id) DO UPDATE SET
  nome               = EXCLUDED.nome,
  plano              = EXCLUDED.plano,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  updated_at         = EXCLUDED.updated_at;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: confeitaria_membros                              │
-- │                                                          │
-- │  Associação de usuários Auth a confeitarias.             │
-- │  role 'owner': acesso total, pode convidar/remover       │
-- │  role 'editor': criar/editar pedidos e produtos          │
-- │  role 'viewer': somente leitura                          │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.confeitaria_membros (
  confeitaria_id  UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            membro_role   NOT NULL DEFAULT 'viewer',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  PRIMARY KEY (confeitaria_id, user_id)
);

-- ── Migração: confeiteiro existente vira owner de sua confeitaria ─────────
INSERT INTO public.confeitaria_membros (confeitaria_id, user_id, role)
SELECT id, id, 'owner'
FROM public.confeiteiros
ON CONFLICT (confeitaria_id, user_id) DO UPDATE SET role = 'owner';

-- ── Atualizar trigger para criar confeitaria+membro ao registrar ──────────
CREATE OR REPLACE FUNCTION public.handle_new_confeiteiro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
BEGIN
  v_nome := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- (1) Perfil legado — mantido para compatibilidade
  INSERT INTO public.confeiteiros (id, nome, email)
  VALUES (NEW.id, v_nome, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- (2) Confeitaria — entidade de negócio do novo schema
  INSERT INTO public.confeitarias (id, nome, mes_referencia)
  VALUES (NEW.id, v_nome, DATE_TRUNC('month', NOW())::DATE)
  ON CONFLICT (id) DO NOTHING;

  -- (3) Membro: usuário vira owner da própria confeitaria
  INSERT INTO public.confeitaria_membros (confeitaria_id, user_id, role)
  VALUES (NEW.id, NEW.id, 'owner')
  ON CONFLICT (confeitaria_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: clientes                                         │
-- │                                                          │
-- │  Entidade própria. Stats (total_pedidos, etc.) são       │
-- │  mantidos atualizados por trigger ao mudar status        │
-- │  do pedido para 'entregue'.                              │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.clientes (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeitaria_id        UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  nome                  TEXT          NOT NULL,
  telefone              TEXT,
  email                 TEXT,
  canal_preferido       pedido_canal,

  -- Stats desnormalizados (atualizados por trigger — evita COUNT em tempo de query)
  total_pedidos         INT           NOT NULL DEFAULT 0 CHECK (total_pedidos >= 0),
  valor_total_compras   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_total_compras >= 0),
  ultima_compra         DATE,

  observacoes           TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Mesmo telefone não pode aparecer duas vezes na mesma confeitaria
  CONSTRAINT clientes_telefone_unico UNIQUE (confeitaria_id, telefone)
);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Migração: consolidar clientes a partir de pedidos existentes ──────────
-- Cria um cliente por nome+telefone, usando o primeiro pedido como referência.
INSERT INTO public.clientes (confeitaria_id, nome, telefone)
SELECT DISTINCT ON (confeiteiro_id, COALESCE(cliente_telefone, cliente_nome))
  confeiteiro_id AS confeitaria_id,
  cliente_nome   AS nome,
  cliente_telefone AS telefone
FROM public.pedidos
WHERE cliente_telefone IS NOT NULL
ON CONFLICT (confeitaria_id, telefone) DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: ingredientes_catalogo                            │
-- │                                                          │
-- │  Catálogo de ingredientes da confeitaria com histórico   │
-- │  de preço. Quando preco_atual muda, preco_anterior é     │
-- │  salvo automaticamente via trigger.                      │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.ingredientes_catalogo (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  confeitaria_id    UUID          NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  nome              TEXT          NOT NULL,
  unidade           unidade_medida NOT NULL DEFAULT 'g',

  -- Preço por unidade (ex: R$/g, R$/ml, R$/un)
  preco_atual       NUMERIC(10,4) NOT NULL CHECK (preco_atual >= 0),
  preco_anterior    NUMERIC(10,4),                   -- salvo automaticamente ao atualizar
  preco_updated_at  TIMESTAMPTZ,                     -- quando preco_atual foi alterado

  fornecedor        TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT ingredientes_nome_unico UNIQUE (confeitaria_id, nome)
);

-- Trigger: salva preco_anterior e preco_updated_at ao alterar preço
CREATE OR REPLACE FUNCTION public.ingrediente_historico_preco()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
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

CREATE TRIGGER ingredientes_catalogo_updated_at
  BEFORE UPDATE ON public.ingredientes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ┌──────────────────────────────────────────────────────────┐
-- │  COLUNAS NOVAS em: produtos                              │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS confeitaria_id        UUID          REFERENCES public.confeitarias(id),
  ADD COLUMN IF NOT EXISTS preco_venda           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS custo_calculado       NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rendimento            INT           CHECK (rendimento > 0),
  ADD COLUMN IF NOT EXISTS tempo_producao_minutos INT          CHECK (tempo_producao_minutos >= 0);

-- Popula confeitaria_id e preco_venda com dados existentes
UPDATE public.produtos
SET
  confeitaria_id = confeiteiro_id,
  preco_venda    = preco,
  custo_calculado = custo
WHERE confeitaria_id IS NULL;

-- torna preco_venda NOT NULL após populado
ALTER TABLE public.produtos
  ALTER COLUMN preco_venda SET NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TABLE: produtos_ingredientes                            │
-- │                                                          │
-- │  Relação N:M entre produtos e ingredientes_catalogo.     │
-- │  Substitui o JSONB ingredientes na coluna de produtos    │
-- │  para cálculo automático de custo_calculado.             │
-- │                                                          │
-- │  quantidade: em unidade do ingrediente (ex: 200 = 200g   │
-- │              se o ingrediente usa unidade 'g')           │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.produtos_ingredientes (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id       UUID          NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  ingrediente_id   UUID          NOT NULL REFERENCES public.ingredientes_catalogo(id) ON DELETE RESTRICT,
  quantidade       NUMERIC(12,4) NOT NULL CHECK (quantidade > 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT produto_ingrediente_unico UNIQUE (produto_id, ingrediente_id)
);

-- Trigger: recalcula custo_calculado do produto quando seus ingredientes mudam
CREATE OR REPLACE FUNCTION public.recalcular_custo_produto()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  v_produto_id  UUID;
  v_custo       NUMERIC(10,3);
BEGIN
  v_produto_id := COALESCE(NEW.produto_id, OLD.produto_id);

  SELECT COALESCE(SUM(pi.quantidade * ic.preco_atual), 0)
    INTO v_custo
    FROM public.produtos_ingredientes pi
    JOIN public.ingredientes_catalogo ic ON ic.id = pi.ingrediente_id
   WHERE pi.produto_id = v_produto_id;

  UPDATE public.produtos
     SET custo_calculado = v_custo,
         updated_at      = NOW()
   WHERE id = v_produto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER produtos_ingredientes_sync_custo
  AFTER INSERT OR UPDATE OR DELETE ON public.produtos_ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_custo_produto();

-- Trigger: ao alterar preço de ingrediente, recalcula todos os produtos que o usam
CREATE OR REPLACE FUNCTION public.propagar_preco_ingrediente()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  IF NEW.preco_atual IS DISTINCT FROM OLD.preco_atual THEN
    -- Recalcula cada produto que usa este ingrediente
    UPDATE public.produtos p
       SET custo_calculado = (
             SELECT COALESCE(SUM(pi2.quantidade * ic2.preco_atual), 0)
               FROM public.produtos_ingredientes pi2
               JOIN public.ingredientes_catalogo ic2 ON ic2.id = pi2.ingrediente_id
              WHERE pi2.produto_id = p.id
           ),
           updated_at = NOW()
     WHERE EXISTS (
       SELECT 1 FROM public.produtos_ingredientes pi
        WHERE pi.produto_id = p.id
          AND pi.ingrediente_id = NEW.id
     );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ingrediente_preco_propagar
  AFTER UPDATE ON public.ingredientes_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.propagar_preco_ingrediente();

-- ┌──────────────────────────────────────────────────────────┐
-- │  COLUNAS NOVAS em: pedidos                               │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS confeitaria_id  UUID REFERENCES public.confeitarias(id),
  ADD COLUMN IF NOT EXISTS cliente_id      UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

UPDATE public.pedidos
   SET confeitaria_id = confeiteiro_id
 WHERE confeitaria_id IS NULL;

-- Vincula pedidos aos clientes consolidados (se telefone bater)
UPDATE public.pedidos p
   SET cliente_id = c.id
  FROM public.clientes c
 WHERE c.confeitaria_id = p.confeiteiro_id
   AND c.telefone       = p.cliente_telefone
   AND p.cliente_id IS NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  COLUNAS NOVAS em: producao_lotes / transacoes /         │
-- │                    cronogramas_marketing                  │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.producao_lotes
  ADD COLUMN IF NOT EXISTS confeitaria_id UUID REFERENCES public.confeitarias(id);
UPDATE public.producao_lotes SET confeitaria_id = confeiteiro_id WHERE confeitaria_id IS NULL;

ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS confeitaria_id UUID REFERENCES public.confeitarias(id);
UPDATE public.transacoes SET confeitaria_id = confeiteiro_id WHERE confeitaria_id IS NULL;

ALTER TABLE public.cronogramas_marketing
  ADD COLUMN IF NOT EXISTS confeitaria_id UUID REFERENCES public.confeitarias(id);
UPDATE public.cronogramas_marketing SET confeitaria_id = confeiteiro_id WHERE confeitaria_id IS NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRIGGER: Contadores mensais (pedidos + cronogramas IA)  │
-- │                                                          │
-- │  Quando um pedido é criado:                              │
-- │  - Se mes_referencia < mês atual → zera ambos contadores │
-- │  - Incrementa pedidos_mes_atual += 1                     │
-- └──────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.incrementar_pedidos_mes()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  v_mes_atual DATE := DATE_TRUNC('month', NOW())::DATE;
BEGIN
  UPDATE public.confeitarias
     SET pedidos_mes_atual        = CASE
                                       WHEN mes_referencia < v_mes_atual THEN 1
                                       ELSE pedidos_mes_atual + 1
                                     END,
         cronogramas_ia_mes_atual = CASE
                                       WHEN mes_referencia < v_mes_atual THEN 0
                                       ELSE cronogramas_ia_mes_atual
                                     END,
         mes_referencia           = v_mes_atual,
         updated_at               = NOW()
   WHERE id = NEW.confeitaria_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_incrementar_contador
  AFTER INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.confeitaria_id IS NOT NULL)
  EXECUTE FUNCTION public.incrementar_pedidos_mes();

-- Trigger análogo para cronogramas de marketing (IA)
CREATE OR REPLACE FUNCTION public.incrementar_cronogramas_ia_mes()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  v_mes_atual DATE := DATE_TRUNC('month', NOW())::DATE;
BEGIN
  UPDATE public.confeitarias
     SET pedidos_mes_atual        = CASE
                                       WHEN mes_referencia < v_mes_atual THEN 0
                                       ELSE pedidos_mes_atual
                                     END,
         cronogramas_ia_mes_atual = CASE
                                       WHEN mes_referencia < v_mes_atual THEN 1
                                       ELSE cronogramas_ia_mes_atual + 1
                                     END,
         mes_referencia           = v_mes_atual,
         updated_at               = NOW()
   WHERE id = NEW.confeitaria_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cronogramas_incrementar_contador
  AFTER INSERT ON public.cronogramas_marketing
  FOR EACH ROW
  WHEN (NEW.confeitaria_id IS NOT NULL)
  EXECUTE FUNCTION public.incrementar_cronogramas_ia_mes();

-- Função utilitária: forçar reset de contadores (chamada por cron ou Route Handler)
CREATE OR REPLACE FUNCTION public.resetar_contadores_mensais(p_confeitaria_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER AS
$$
BEGIN
  UPDATE public.confeitarias
     SET pedidos_mes_atual        = 0,
         cronogramas_ia_mes_atual = 0,
         mes_referencia           = DATE_TRUNC('month', NOW())::DATE,
         updated_at               = NOW()
   WHERE id = p_confeitaria_id
     AND mes_referencia < DATE_TRUNC('month', NOW())::DATE;
END;
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRIGGER: Stats de clientes                              │
-- │                                                          │
-- │  Quando status do pedido muda para 'entregue':           │
-- │  - Incrementa total_pedidos do cliente                   │
-- │  - Acumula valor_total_compras                           │
-- │  - Atualiza ultima_compra com data atual                 │
-- │                                                          │
-- │  Quando reverte de 'entregue' para outro status:         │
-- │  - Decrementa total_pedidos (ajuste manual)              │
-- └──────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.sync_stats_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- Pedido recém-marcado como entregue
  IF NEW.status = 'entregue'
     AND OLD.status IS DISTINCT FROM 'entregue'
     AND NEW.cliente_id IS NOT NULL
  THEN
    UPDATE public.clientes
       SET total_pedidos       = total_pedidos + 1,
           valor_total_compras = valor_total_compras + NEW.valor_total,
           ultima_compra       = CURRENT_DATE,
           updated_at          = NOW()
     WHERE id = NEW.cliente_id;
  END IF;

  -- Reverteu de entregue (ex: erro operacional)
  IF OLD.status = 'entregue'
     AND NEW.status IS DISTINCT FROM 'entregue'
     AND NEW.cliente_id IS NOT NULL
  THEN
    UPDATE public.clientes
       SET total_pedidos       = GREATEST(0, total_pedidos - 1),
           valor_total_compras = GREATEST(0, valor_total_compras - OLD.valor_total),
           updated_at          = NOW()
     WHERE id = NEW.cliente_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER pedidos_sync_stats_cliente
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.sync_stats_cliente();

-- ── Inicializa stats dos clientes com dados históricos já existentes ──────
UPDATE public.clientes c
   SET total_pedidos       = COALESCE(stats.cnt, 0),
       valor_total_compras = COALESCE(stats.total, 0),
       ultima_compra       = stats.ultima
  FROM (
    SELECT
      cliente_id,
      COUNT(*) FILTER (WHERE status = 'entregue')             AS cnt,
      SUM(valor_total) FILTER (WHERE status = 'entregue')     AS total,
      MAX(created_at::DATE) FILTER (WHERE status = 'entregue') AS ultima
    FROM public.pedidos
    WHERE cliente_id IS NOT NULL
    GROUP BY cliente_id
  ) stats
 WHERE c.id = stats.cliente_id;

-- ┌──────────────────────────────────────────────────────────┐
-- │  ANALYZE (atualiza estatísticas do query planner)        │
-- └──────────────────────────────────────────────────────────┘
ANALYZE public.confeitarias;
ANALYZE public.confeitaria_membros;
ANALYZE public.clientes;
ANALYZE public.ingredientes_catalogo;
ANALYZE public.produtos_ingredientes;
ANALYZE public.produtos;
ANALYZE public.pedidos;
