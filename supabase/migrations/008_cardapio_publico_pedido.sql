-- ============================================================
-- Doceria Pro — Migration 008
-- Adiciona: canal 'cardapio_publico' no enum pedido_canal;
--           rastreamento de aquisição viral (ref + source) em confeiteiros.
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  pedido_canal — novo valor                               │
-- └──────────────────────────────────────────────────────────┘

-- PostgreSQL não suporta IF NOT EXISTS em ADD VALUE nativo,
-- mas podemos usar DO $$ para checar antes de adicionar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
     WHERE enumlabel = 'cardapio_publico'
       AND enumtypid = 'public.pedido_canal'::regtype
  ) THEN
    ALTER TYPE public.pedido_canal ADD VALUE 'cardapio_publico';
  END IF;
END
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeiteiros — rastreamento de aquisição viral          │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.confeiteiros
  -- 'organic' | 'viral' | 'paid' — canal de aquisição do usuário
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT DEFAULT 'organic',
  -- UUID da confeitaria que gerou a indicação (via ?ref=)
  ADD COLUMN IF NOT EXISTS ref_confeitaria_id UUID REFERENCES public.confeitarias(id) ON DELETE SET NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos — campo menu_publico_ativo por produto         │
-- └──────────────────────────────────────────────────────────┘
-- Permite que confeiteiras escolham quais produtos aparecem
-- no cardápio público (default: segue o campo 'ativo' do produto).
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS visivel_no_cardapio BOOLEAN NOT NULL DEFAULT TRUE;

-- Índice para busca eficiente no endpoint público
CREATE INDEX IF NOT EXISTS idx_produtos_cardapio_publico
  ON public.produtos (confeiteiro_id, ativo, visivel_no_cardapio)
  WHERE ativo = TRUE AND visivel_no_cardapio = TRUE;

ANALYZE public.confeiteiros;
ANALYZE public.produtos;
