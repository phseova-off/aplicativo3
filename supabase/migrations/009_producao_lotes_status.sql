-- ============================================================
-- Doceria Pro — Migration 009
-- Adiciona campos de ciclo de vida a producao_lotes:
--   status, pedido_id (FK), custo_estimado, custo_real
-- Também adiciona tempo_producao_minutos ao schema de produtos.
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  producao_lotes — ciclo de vida completo                 │
-- └──────────────────────────────────────────────────────────┘

-- Status de ciclo de vida do lote de produção
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lote_status'
  ) THEN
    CREATE TYPE public.lote_status AS ENUM (
      'planejado',
      'em_andamento',
      'concluido',
      'cancelado'
    );
  END IF;
END
$$;

ALTER TABLE public.producao_lotes
  -- Rastreia o pedido de origem (permite análise de lucratividade por pedido)
  ADD COLUMN IF NOT EXISTS pedido_id       UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  -- Ciclo de vida do lote (default planejado para lotes legados)
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'planejado'
                                           CHECK (status IN ('planejado','em_andamento','concluido','cancelado')),
  -- Custo estimado no momento de criação do lote (preços vigentes)
  ADD COLUMN IF NOT EXISTS custo_estimado  NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Custo real calculado no momento de conclusão (preços atuais na data de conclusão)
  ADD COLUMN IF NOT EXISTS custo_real      NUMERIC(10,2),
  -- Motivo do desvio (preenchido quando quantidade_produzida < quantidade_planejada)
  ADD COLUMN IF NOT EXISTS motivo_desvio   TEXT;

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_producao_lotes_status
  ON public.producao_lotes (confeiteiro_id, status);

CREATE INDEX IF NOT EXISTS idx_producao_lotes_pedido_id
  ON public.producao_lotes (pedido_id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos — rendimento e tempo de produção               │
-- └──────────────────────────────────────────────────────────┘
-- Garante que colunas v2 existem (podem já ter sido criadas pela migration 004)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS rendimento              INTEGER DEFAULT 1 CHECK (rendimento >= 1),
  ADD COLUMN IF NOT EXISTS tempo_producao_minutos  INTEGER DEFAULT 60 CHECK (tempo_producao_minutos >= 0);

ANALYZE public.producao_lotes;
ANALYZE public.produtos;
