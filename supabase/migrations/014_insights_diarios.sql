-- ============================================================
-- Migration 014: Insights Diários (cache para IA)
-- Prompt 9: Sistema de Alertas e Engajamento Diário
-- ============================================================

-- Tabela para cachear insights diários gerados por IA
CREATE TABLE IF NOT EXISTS public.insights_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confeitaria_id UUID NOT NULL REFERENCES public.confeitarias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  acao_sugerida TEXT,
  acao_url TEXT,
  gerado_por TEXT NOT NULL CHECK (gerado_por IN ('ia', 'fallback')) DEFAULT 'fallback',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garantir apenas 1 insight por confeitaria por dia
  UNIQUE (confeitaria_id, data)
);

-- Index para busca rápida por confeitaria + data
CREATE INDEX IF NOT EXISTS idx_insights_diarios_lookup
  ON public.insights_diarios (confeitaria_id, data DESC);

-- RLS
ALTER TABLE public.insights_diarios ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da confeitaria podem ler insights
CREATE POLICY "insights_diarios_select_member"
  ON public.insights_diarios
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IN (
      SELECT cm.confeitaria_id
      FROM public.confeitaria_membros cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE: feito via service role (backend), mas permitir
-- para membros com role owner/editor como fallback
CREATE POLICY "insights_diarios_insert_editor"
  ON public.insights_diarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.confeitaria_membros cm
      WHERE cm.confeitaria_id = insights_diarios.confeitaria_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "insights_diarios_update_editor"
  ON public.insights_diarios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.confeitaria_membros cm
      WHERE cm.confeitaria_id = insights_diarios.confeitaria_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'editor')
    )
  );

-- DELETE: apenas owner
CREATE POLICY "insights_diarios_delete_owner"
  ON public.insights_diarios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.confeitaria_membros cm
      WHERE cm.confeitaria_id = insights_diarios.confeitaria_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

-- Cleanup automático: insights com mais de 30 dias (executar via cron ou trigger)
-- Para uso com pg_cron (se disponível):
-- SELECT cron.schedule('cleanup_insights', '0 3 * * *',
--   $$DELETE FROM public.insights_diarios WHERE data < CURRENT_DATE - INTERVAL '30 days'$$
-- );
