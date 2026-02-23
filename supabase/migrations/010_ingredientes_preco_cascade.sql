-- ============================================================
-- Doceria Pro — Migration 010
-- Catálogo de Ingredientes: cascata de preço + alertas
--   • preco_desatualizado em produtos
--   • tabela alertas_ingrediente para notificações de variação
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos — flag de preço desatualizado                  │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS preco_desatualizado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_produtos_preco_desatualizado
  ON public.produtos (confeiteiro_id, preco_desatualizado)
  WHERE preco_desatualizado = TRUE;

-- ┌──────────────────────────────────────────────────────────┐
-- │  alertas_ingrediente — histórico de variações de preço   │
-- └──────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.alertas_ingrediente (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confeiteiro_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingrediente_id      UUID NOT NULL,
  ingrediente_nome    TEXT NOT NULL,
  preco_anterior      NUMERIC(10,2) NOT NULL,
  preco_novo          NUMERIC(10,2) NOT NULL,
  variacao_percentual NUMERIC(6,2)  NOT NULL,
  produtos_afetados   INTEGER       NOT NULL DEFAULT 0,
  lido                BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS: cada confeiteira só vê seus próprios alertas
ALTER TABLE public.alertas_ingrediente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confeiteiro vê próprios alertas"
  ON public.alertas_ingrediente
  FOR ALL
  USING (auth.uid() = confeiteiro_id);

CREATE INDEX IF NOT EXISTS idx_alertas_ingrediente_confeiteiro
  ON public.alertas_ingrediente (confeiteiro_id, lido, created_at DESC);

-- ┌──────────────────────────────────────────────────────────┐
-- │  ingredientes_catalogo — garantir campo confeiteiro_id   │
-- │  (compatibilidade: API usa confeiteiro_id = auth.users)  │
-- └──────────────────────────────────────────────────────────┘

-- O campo confeiteiro_id já existe (migration 004). Apenas garantimos o índice.
CREATE INDEX IF NOT EXISTS idx_ingredientes_catalogo_confeiteiro_nome
  ON public.ingredientes_catalogo (confeiteiro_id, nome);

ANALYZE public.produtos;
ANALYZE public.alertas_ingrediente;
