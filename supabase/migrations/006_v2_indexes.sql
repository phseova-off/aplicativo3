-- ============================================================
-- Doceria Pro — Índices v2: Novas tabelas + colunas adicionadas
-- Migration: 006_v2_indexes.sql
--
-- ESTRATÉGIA:
--   1. FKs em novas tabelas → índice B-tree
--   2. Filtros frequentes → índice composto (tenant + coluna)
--   3. Busca textual em nomes → índice GIN trigram (pg_trgm)
--   4. Colunas booleanas de filtro frequente → índice parcial
--   5. Lookup de membro por user_id (além da PK)
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitarias                                            │
-- └──────────────────────────────────────────────────────────┘

-- Lookup por Stripe customer ID (webhook handler)
CREATE INDEX IF NOT EXISTS idx_confeitarias_stripe_customer
  ON public.confeitarias (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Lookup por Stripe subscription ID (webhook handler)
CREATE INDEX IF NOT EXISTS idx_confeitarias_stripe_subscription
  ON public.confeitarias (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Filtro por plano (dashboards administrativos internos)
CREATE INDEX IF NOT EXISTS idx_confeitarias_plano
  ON public.confeitarias (plano);

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitaria_membros                                     │
-- └──────────────────────────────────────────────────────────┘

-- Lookup de todas as confeitarias de um usuário
-- (is_member/is_editor/is_owner + listar confeitarias do usuário)
CREATE INDEX IF NOT EXISTS idx_membros_user_id
  ON public.confeitaria_membros (user_id);

-- Lookup de todos os membros de uma confeitaria (já coberto pela PK)
-- Filtrar membros por role dentro de uma confeitaria
CREATE INDEX IF NOT EXISTS idx_membros_confeitaria_role
  ON public.confeitaria_membros (confeitaria_id, role);

-- ┌──────────────────────────────────────────────────────────┐
-- │  clientes                                                │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant (base de todos os filtros de clientes)
CREATE INDEX IF NOT EXISTS idx_clientes_confeitaria_id
  ON public.clientes (confeitaria_id);

-- Busca textual no nome do cliente
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm
  ON public.clientes USING GIN (nome gin_trgm_ops);

-- Busca por telefone (lookup direto e verificação de duplicidade)
CREATE INDEX IF NOT EXISTS idx_clientes_confeitaria_telefone
  ON public.clientes (confeitaria_id, telefone)
  WHERE telefone IS NOT NULL;

-- Relatório: melhores clientes (ORDER BY valor_total_compras DESC)
CREATE INDEX IF NOT EXISTS idx_clientes_valor_total
  ON public.clientes (confeitaria_id, valor_total_compras DESC);

-- Clientes inativos / recentes (ORDER BY ultima_compra)
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_compra
  ON public.clientes (confeitaria_id, ultima_compra DESC NULLS LAST);

-- Canal preferido (segmentação de marketing)
CREATE INDEX IF NOT EXISTS idx_clientes_canal
  ON public.clientes (confeitaria_id, canal_preferido)
  WHERE canal_preferido IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  ingredientes_catalogo                                   │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant
CREATE INDEX IF NOT EXISTS idx_ingredientes_confeitaria_id
  ON public.ingredientes_catalogo (confeitaria_id);

-- Busca textual no nome do ingrediente
CREATE INDEX IF NOT EXISTS idx_ingredientes_nome_trgm
  ON public.ingredientes_catalogo USING GIN (nome gin_trgm_ops);

-- Filtro por unidade de medida
CREATE INDEX IF NOT EXISTS idx_ingredientes_confeitaria_unidade
  ON public.ingredientes_catalogo (confeitaria_id, unidade);

-- Ingredientes com preço atualizado recentemente (auditoria de custo)
CREATE INDEX IF NOT EXISTS idx_ingredientes_preco_updated
  ON public.ingredientes_catalogo (confeitaria_id, preco_updated_at DESC)
  WHERE preco_updated_at IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos_ingredientes                                   │
-- └──────────────────────────────────────────────────────────┘

-- FK produto_id (expandir ingredientes de um produto)
CREATE INDEX IF NOT EXISTS idx_prod_ing_produto_id
  ON public.produtos_ingredientes (produto_id);

-- FK ingrediente_id (quais produtos usam um ingrediente — impacto de preço)
CREATE INDEX IF NOT EXISTS idx_prod_ing_ingrediente_id
  ON public.produtos_ingredientes (ingrediente_id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos — colunas novas adicionadas em 004             │
-- └──────────────────────────────────────────────────────────┘

-- FK confeitaria_id (join/filter via nova coluna)
CREATE INDEX IF NOT EXISTS idx_produtos_confeitaria_id
  ON public.produtos (confeitaria_id)
  WHERE confeitaria_id IS NOT NULL;

-- Produtos ativos por confeitaria (listagem de cardápio v2)
CREATE INDEX IF NOT EXISTS idx_produtos_confeitaria_ativo_v2
  ON public.produtos (confeitaria_id, categoria)
  WHERE confeitaria_id IS NOT NULL AND ativo = TRUE;

-- Margem: ORDER BY (preco_venda - custo_calculado) DESC (relatório de produtos)
-- PostgreSQL não indexa expressões diretamente de forma simples, mas
-- cobrimos os dois lados para que o planner use index-only scan.
CREATE INDEX IF NOT EXISTS idx_produtos_preco_venda
  ON public.produtos (confeitaria_id, preco_venda DESC)
  WHERE confeitaria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_custo_calculado
  ON public.produtos (confeitaria_id, custo_calculado)
  WHERE confeitaria_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  pedidos — colunas novas adicionadas em 004              │
-- └──────────────────────────────────────────────────────────┘

-- FK confeitaria_id
CREATE INDEX IF NOT EXISTS idx_pedidos_confeitaria_id
  ON public.pedidos (confeitaria_id)
  WHERE confeitaria_id IS NOT NULL;

-- FK cliente_id (histórico de pedidos de um cliente)
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id
  ON public.pedidos (cliente_id)
  WHERE cliente_id IS NOT NULL;

-- Filtro confeitaria + status (Kanban v2)
CREATE INDEX IF NOT EXISTS idx_pedidos_confeitaria_status_v2
  ON public.pedidos (confeitaria_id, status)
  WHERE confeitaria_id IS NOT NULL;

-- Agenda: confeitaria + data_entrega (pedidos futuros pendentes)
CREATE INDEX IF NOT EXISTS idx_pedidos_confeitaria_entrega_v2
  ON public.pedidos (confeitaria_id, data_entrega ASC NULLS LAST)
  WHERE confeitaria_id IS NOT NULL
    AND status NOT IN ('entregue', 'cancelado');

-- Histórico recente por confeitaria (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_pedidos_confeitaria_created_v2
  ON public.pedidos (confeitaria_id, created_at DESC)
  WHERE confeitaria_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  producao_lotes — confeitaria_id                         │
-- └──────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_producao_confeitaria_id
  ON public.producao_lotes (confeitaria_id)
  WHERE confeitaria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_producao_confeitaria_data_v2
  ON public.producao_lotes (confeitaria_id, data_producao DESC)
  WHERE confeitaria_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  transacoes — confeitaria_id                             │
-- └──────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_transacoes_confeitaria_id
  ON public.transacoes (confeitaria_id)
  WHERE confeitaria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_confeitaria_tipo_data_v2
  ON public.transacoes (confeitaria_id, tipo, data DESC)
  WHERE confeitaria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_confeitaria_data_v2
  ON public.transacoes (confeitaria_id, data DESC)
  WHERE confeitaria_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  cronogramas_marketing — confeitaria_id                  │
-- └──────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_cronogramas_confeitaria_id
  ON public.cronogramas_marketing (confeitaria_id)
  WHERE confeitaria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cronogramas_confeitaria_ano_v2
  ON public.cronogramas_marketing (confeitaria_id, ano DESC, mes DESC)
  WHERE confeitaria_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  ANALYZE — atualiza estatísticas do query planner        │
-- └──────────────────────────────────────────────────────────┘
ANALYZE public.confeitarias;
ANALYZE public.confeitaria_membros;
ANALYZE public.clientes;
ANALYZE public.ingredientes_catalogo;
ANALYZE public.produtos_ingredientes;
ANALYZE public.produtos;
ANALYZE public.pedidos;
ANALYZE public.producao_lotes;
ANALYZE public.transacoes;
ANALYZE public.cronogramas_marketing;
