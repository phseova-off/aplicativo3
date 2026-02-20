-- ============================================================
-- Doceria Pro — Row Level Security (Multi-Tenancy)
-- Migration: 002_rls.sql
-- ============================================================
--
-- PADRÃO DE MULTI-TENANCY:
--   - confeiteiros.id = auth.users.id (1-para-1)
--   - Todas as tabelas possuem confeiteiro_id
--   - RLS verifica: confeiteiro_id = auth.uid()
--
-- OTIMIZAÇÃO DE PERFORMANCE:
--   Usamos (SELECT auth.uid()) em vez de auth.uid() diretamente.
--   O planejador de queries PostgreSQL cacheia o resultado do
--   subquery por statement, evitando chamada por linha na varredura.
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  HABILITAR RLS em todas as tabelas                       │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.confeiteiros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_lotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronogramas_marketing ENABLE ROW LEVEL SECURITY;

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeiteiros                                            │
-- │  SELECT/UPDATE/INSERT próprio perfil apenas              │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "confeiteiros_select_proprio"
  ON public.confeiteiros
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "confeiteiros_update_proprio"
  ON public.confeiteiros
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "confeiteiros_insert_proprio"
  ON public.confeiteiros
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE é gerenciado pela cascade de auth.users (não exposto via API)

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos                                                │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "produtos_select_proprio"
  ON public.produtos
  FOR SELECT
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "produtos_insert_proprio"
  ON public.produtos
  FOR INSERT
  TO authenticated
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "produtos_update_proprio"
  ON public.produtos
  FOR UPDATE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()))
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "produtos_delete_proprio"
  ON public.produtos
  FOR DELETE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

-- ┌──────────────────────────────────────────────────────────┐
-- │  pedidos                                                 │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "pedidos_select_proprio"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "pedidos_insert_proprio"
  ON public.pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "pedidos_update_proprio"
  ON public.pedidos
  FOR UPDATE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()))
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "pedidos_delete_proprio"
  ON public.pedidos
  FOR DELETE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

-- ┌──────────────────────────────────────────────────────────┐
-- │  itens_pedido                                            │
-- │  Acesso via pedido pai (join policy)                     │
-- │                                                          │
-- │  Evita coluna redundante confeiteiro_id em itens.        │
-- │  O EXISTS usa índice em pedidos(id) — performance OK.    │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "itens_pedido_select_via_pedido"
  ON public.itens_pedido
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
       WHERE p.id = pedido_id
         AND p.confeiteiro_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "itens_pedido_insert_via_pedido"
  ON public.itens_pedido
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
       WHERE p.id = pedido_id
         AND p.confeiteiro_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "itens_pedido_update_via_pedido"
  ON public.itens_pedido
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
       WHERE p.id = pedido_id
         AND p.confeiteiro_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "itens_pedido_delete_via_pedido"
  ON public.itens_pedido
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
       WHERE p.id = pedido_id
         AND p.confeiteiro_id = (SELECT auth.uid())
    )
  );

-- ┌──────────────────────────────────────────────────────────┐
-- │  producao_lotes                                          │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "producao_lotes_select_proprio"
  ON public.producao_lotes
  FOR SELECT
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "producao_lotes_insert_proprio"
  ON public.producao_lotes
  FOR INSERT
  TO authenticated
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "producao_lotes_update_proprio"
  ON public.producao_lotes
  FOR UPDATE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()))
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "producao_lotes_delete_proprio"
  ON public.producao_lotes
  FOR DELETE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

-- ┌──────────────────────────────────────────────────────────┐
-- │  transacoes                                              │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "transacoes_select_proprio"
  ON public.transacoes
  FOR SELECT
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "transacoes_insert_proprio"
  ON public.transacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "transacoes_update_proprio"
  ON public.transacoes
  FOR UPDATE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()))
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "transacoes_delete_proprio"
  ON public.transacoes
  FOR DELETE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

-- ┌──────────────────────────────────────────────────────────┐
-- │  cronogramas_marketing                                   │
-- └──────────────────────────────────────────────────────────┘
CREATE POLICY "cronogramas_select_proprio"
  ON public.cronogramas_marketing
  FOR SELECT
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "cronogramas_insert_proprio"
  ON public.cronogramas_marketing
  FOR INSERT
  TO authenticated
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "cronogramas_update_proprio"
  ON public.cronogramas_marketing
  FOR UPDATE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()))
  WITH CHECK (confeiteiro_id = (SELECT auth.uid()));

CREATE POLICY "cronogramas_delete_proprio"
  ON public.cronogramas_marketing
  FOR DELETE
  TO authenticated
  USING (confeiteiro_id = (SELECT auth.uid()));

-- ┌──────────────────────────────────────────────────────────┐
-- │  NOTA: Webhooks Stripe (service_role)                    │
-- │                                                          │
-- │  O cliente de service_role bypasseia RLS por definição.  │
-- │  Nenhuma política especial necessária para webhooks.     │
-- │  NUNCA exponha SUPABASE_SERVICE_ROLE_KEY no browser.     │
-- └──────────────────────────────────────────────────────────┘
