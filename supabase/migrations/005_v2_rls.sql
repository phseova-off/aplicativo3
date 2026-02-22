-- ============================================================
-- Doceria Pro — RLS v2: Multi-Tenant via confeitaria_membros
-- Migration: 005_v2_rls.sql
--
-- PADRÃO v2:
--   auth.uid() ∈ confeitaria_membros WHERE confeitaria_id = <row>.confeitaria_id
--
-- FUNÇÕES AUXILIARES (SECURITY DEFINER + STABLE):
--   is_member(confeitaria_id) — qualquer role
--   is_editor(confeitaria_id) — owner ou editor
--   is_owner(confeitaria_id)  — owner apenas
--
--   STABLE permite que o PostgreSQL reutilize o resultado dentro
--   da mesma query, reduzindo lookups em confeitaria_membros.
--   SECURITY DEFINER garante que o lookup sempre sucede (sem RLS circular).
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  FUNÇÕES AUXILIARES DE MEMBERSHIP                        │
-- └──────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.is_member(p_confeitaria_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.confeitaria_membros
     WHERE confeitaria_id = p_confeitaria_id
       AND user_id        = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_editor(p_confeitaria_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.confeitaria_membros
     WHERE confeitaria_id = p_confeitaria_id
       AND user_id        = (SELECT auth.uid())
       AND role           IN ('owner', 'editor')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner(p_confeitaria_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.confeitaria_membros
     WHERE confeitaria_id = p_confeitaria_id
       AND user_id        = (SELECT auth.uid())
       AND role           = 'owner'
  )
$$;

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitarias                                            │
-- │                                                          │
-- │  SELECT: qualquer membro                                 │
-- │  INSERT: via trigger (handle_new_confeiteiro)            │
-- │  UPDATE: somente owner                                   │
-- │  DELETE: somente owner (CASCADE cuida dos filhos)        │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.confeitarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confeitarias_select_membros"
  ON public.confeitarias
  FOR SELECT
  TO authenticated
  USING (public.is_member(id));

CREATE POLICY "confeitarias_insert_trigger"
  ON public.confeitarias
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner(id));

CREATE POLICY "confeitarias_update_owner"
  ON public.confeitarias
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(id))
  WITH CHECK (public.is_owner(id));

CREATE POLICY "confeitarias_delete_owner"
  ON public.confeitarias
  FOR DELETE
  TO authenticated
  USING (public.is_owner(id));

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitaria_membros                                     │
-- │                                                          │
-- │  SELECT: qualquer membro vê os outros membros            │
-- │  INSERT: somente owner pode convidar                     │
-- │  UPDATE: somente owner pode mudar roles                  │
-- │  DELETE: owner pode remover; membro pode se auto-remover │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.confeitaria_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_select_propria_confeitaria"
  ON public.confeitaria_membros
  FOR SELECT
  TO authenticated
  USING (public.is_member(confeitaria_id));

CREATE POLICY "membros_insert_owner"
  ON public.confeitaria_membros
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner(confeitaria_id));

CREATE POLICY "membros_update_owner"
  ON public.confeitaria_membros
  FOR UPDATE
  TO authenticated
  USING (public.is_owner(confeitaria_id))
  WITH CHECK (public.is_owner(confeitaria_id));

-- Owner remove qualquer membro; membro remove a si mesmo
CREATE POLICY "membros_delete_owner_ou_proprio"
  ON public.confeitaria_membros
  FOR DELETE
  TO authenticated
  USING (
    public.is_owner(confeitaria_id)
    OR user_id = (SELECT auth.uid())
  );

-- ┌──────────────────────────────────────────────────────────┐
-- │  clientes                                                │
-- │                                                          │
-- │  SELECT: qualquer membro                                 │
-- │  INSERT/UPDATE/DELETE: editor ou owner                   │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_membros"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (public.is_member(confeitaria_id));

CREATE POLICY "clientes_insert_editores"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor(confeitaria_id));

CREATE POLICY "clientes_update_editores"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (public.is_editor(confeitaria_id))
  WITH CHECK (public.is_editor(confeitaria_id));

CREATE POLICY "clientes_delete_owner"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (public.is_owner(confeitaria_id));

-- ┌──────────────────────────────────────────────────────────┐
-- │  ingredientes_catalogo                                   │
-- │                                                          │
-- │  SELECT: qualquer membro                                 │
-- │  Mutações: editor ou owner                               │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.ingredientes_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredientes_select_membros"
  ON public.ingredientes_catalogo
  FOR SELECT
  TO authenticated
  USING (public.is_member(confeitaria_id));

CREATE POLICY "ingredientes_insert_editores"
  ON public.ingredientes_catalogo
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor(confeitaria_id));

CREATE POLICY "ingredientes_update_editores"
  ON public.ingredientes_catalogo
  FOR UPDATE
  TO authenticated
  USING (public.is_editor(confeitaria_id))
  WITH CHECK (public.is_editor(confeitaria_id));

CREATE POLICY "ingredientes_delete_owner"
  ON public.ingredientes_catalogo
  FOR DELETE
  TO authenticated
  USING (public.is_owner(confeitaria_id));

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos_ingredientes                                   │
-- │                                                          │
-- │  Acesso via produto pai (produto.confeitaria_id).        │
-- │  Evita coluna redundante confeitaria_id na tabela.       │
-- └──────────────────────────────────────────────────────────┘
ALTER TABLE public.produtos_ingredientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_ing_select_via_produto"
  ON public.produtos_ingredientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.produtos p
       WHERE p.id = produto_id
         AND public.is_member(p.confeitaria_id)
    )
  );

CREATE POLICY "prod_ing_insert_via_produto"
  ON public.produtos_ingredientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.produtos p
       WHERE p.id = produto_id
         AND public.is_editor(p.confeitaria_id)
    )
  );

CREATE POLICY "prod_ing_update_via_produto"
  ON public.produtos_ingredientes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.produtos p
       WHERE p.id = produto_id
         AND public.is_editor(p.confeitaria_id)
    )
  );

CREATE POLICY "prod_ing_delete_via_produto"
  ON public.produtos_ingredientes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.produtos p
       WHERE p.id = produto_id
         AND public.is_editor(p.confeitaria_id)
    )
  );

-- ┌──────────────────────────────────────────────────────────┐
-- │  POLÍTICAS ADICIONAIS para tabelas existentes            │
-- │  (novas colunas confeitaria_id adicionadas em 004)       │
-- │                                                          │
-- │  As políticas v1 (002_rls.sql) baseadas em confeiteiro_id│
-- │  são MANTIDAS para compatibilidade com código legado.    │
-- │  As novas políticas abaixo usam confeitaria_id.          │
-- │                                                          │
-- │  Quando todo o código for migrado para confeitaria_id,   │
-- │  remova as políticas v1 e mantenha apenas as v2.         │
-- └──────────────────────────────────────────────────────────┘

-- ── produtos (v2 — via confeitaria_id) ───────────────────────────────────
-- Nota: políticas legadas (confeiteiro_id) em 002_rls.sql já cobrem isso.
-- Políticas v2 permitem que editores convidados também acessem.
CREATE POLICY "produtos_select_membros_v2"
  ON public.produtos
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_member(confeitaria_id)
  );

CREATE POLICY "produtos_insert_editores_v2"
  ON public.produtos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "produtos_update_editores_v2"
  ON public.produtos
  FOR UPDATE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  )
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "produtos_delete_owner_v2"
  ON public.produtos
  FOR DELETE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_owner(confeitaria_id)
  );

-- ── pedidos (v2) ─────────────────────────────────────────────────────────
CREATE POLICY "pedidos_select_membros_v2"
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_member(confeitaria_id)
  );

CREATE POLICY "pedidos_insert_editores_v2"
  ON public.pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "pedidos_update_editores_v2"
  ON public.pedidos
  FOR UPDATE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  )
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "pedidos_delete_owner_v2"
  ON public.pedidos
  FOR DELETE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_owner(confeitaria_id)
  );

-- ── producao_lotes (v2) ───────────────────────────────────────────────────
CREATE POLICY "producao_select_membros_v2"
  ON public.producao_lotes
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_member(confeitaria_id)
  );

CREATE POLICY "producao_insert_editores_v2"
  ON public.producao_lotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "producao_update_editores_v2"
  ON public.producao_lotes
  FOR UPDATE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  )
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "producao_delete_owner_v2"
  ON public.producao_lotes
  FOR DELETE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_owner(confeitaria_id)
  );

-- ── transacoes (v2) ───────────────────────────────────────────────────────
CREATE POLICY "transacoes_select_membros_v2"
  ON public.transacoes
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_member(confeitaria_id)
  );

CREATE POLICY "transacoes_insert_editores_v2"
  ON public.transacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "transacoes_update_editores_v2"
  ON public.transacoes
  FOR UPDATE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  )
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "transacoes_delete_owner_v2"
  ON public.transacoes
  FOR DELETE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_owner(confeitaria_id)
  );

-- ── cronogramas_marketing (v2) ────────────────────────────────────────────
CREATE POLICY "cronogramas_select_membros_v2"
  ON public.cronogramas_marketing
  FOR SELECT
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_member(confeitaria_id)
  );

CREATE POLICY "cronogramas_insert_editores_v2"
  ON public.cronogramas_marketing
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "cronogramas_update_editores_v2"
  ON public.cronogramas_marketing
  FOR UPDATE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  )
  WITH CHECK (
    confeitaria_id IS NOT NULL
    AND public.is_editor(confeitaria_id)
  );

CREATE POLICY "cronogramas_delete_owner_v2"
  ON public.cronogramas_marketing
  FOR DELETE
  TO authenticated
  USING (
    confeitaria_id IS NOT NULL
    AND public.is_owner(confeitaria_id)
  );

-- ┌──────────────────────────────────────────────────────────┐
-- │  NOTA: service_role (Stripe webhooks)                    │
-- │  O cliente service_role bypassa RLS por definição.       │
-- │  Nenhuma política adicional necessária para webhooks.    │
-- └──────────────────────────────────────────────────────────┘
