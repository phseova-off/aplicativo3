-- ============================================================
-- Doceria Pro — Índices de Performance
-- Migration: 003_indexes.sql
-- ============================================================
--
-- ESTRATÉGIA:
--   1. Todas as FKs recebem índice (lookups e JOINs)
--   2. Colunas de filtro frequente (status, data, tipo)
--   3. Índices parciais onde o filtro ativo é comum (ativo = TRUE)
--   4. GIN em colunas JSONB para queries inside arrays
--   5. GIN trigram em nomes para busca textual (ILIKE)
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeiteiros                                            │
-- └──────────────────────────────────────────────────────────┘

-- Busca por Stripe customer ID (webhook handler)
CREATE INDEX idx_confeiteiros_stripe_customer
  ON public.confeiteiros (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Busca por plano (filtragem administrativa, futuros dashboards internos)
CREATE INDEX idx_confeiteiros_plano
  ON public.confeiteiros (plano);

-- ┌──────────────────────────────────────────────────────────┐
-- │  produtos                                                │
-- └──────────────────────────────────────────────────────────┘

-- FK + filtro de tenant (mais consultado)
CREATE INDEX idx_produtos_confeiteiro_id
  ON public.produtos (confeiteiro_id);

-- Listagem de cardápio: apenas produtos ativos por categoria
CREATE INDEX idx_produtos_confeiteiro_ativo_categoria
  ON public.produtos (confeiteiro_id, categoria)
  WHERE ativo = TRUE;

-- Busca textual no nome do produto (ILIKE '%trufa%')
CREATE INDEX idx_produtos_nome_trgm
  ON public.produtos USING GIN (nome gin_trgm_ops);

-- Queries em ingredientes JSONB (ex: buscar por ingrediente específico)
CREATE INDEX idx_produtos_ingredientes_gin
  ON public.produtos USING GIN (ingredientes);

-- ┌──────────────────────────────────────────────────────────┐
-- │  pedidos                                                 │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant (base de todos os filtros de pedidos)
CREATE INDEX idx_pedidos_confeiteiro_id
  ON public.pedidos (confeiteiro_id);

-- Filtro por status (kanban, relatórios)
-- Inclui confeiteiro_id para evitar seq scan + filter
CREATE INDEX idx_pedidos_confeiteiro_status
  ON public.pedidos (confeiteiro_id, status);

-- Agenda do dia / semana / mês (ordenação e filtro por data)
CREATE INDEX idx_pedidos_confeiteiro_data_entrega
  ON public.pedidos (confeiteiro_id, data_entrega ASC NULLS LAST)
  WHERE status NOT IN ('entregue', 'cancelado');

-- Histórico recente (ORDER BY created_at DESC)
CREATE INDEX idx_pedidos_confeiteiro_created_at
  ON public.pedidos (confeiteiro_id, created_at DESC);

-- Busca por nome do cliente
CREATE INDEX idx_pedidos_cliente_nome_trgm
  ON public.pedidos USING GIN (cliente_nome gin_trgm_ops);

-- Filtro por canal de venda
CREATE INDEX idx_pedidos_confeiteiro_canal
  ON public.pedidos (confeiteiro_id, canal);

-- ┌──────────────────────────────────────────────────────────┐
-- │  itens_pedido                                            │
-- └──────────────────────────────────────────────────────────┘

-- FK pedido_id (lookup ao expandir pedido)
CREATE INDEX idx_itens_pedido_pedido_id
  ON public.itens_pedido (pedido_id);

-- FK produto_id (relatório: quais pedidos contêm determinado produto)
CREATE INDEX idx_itens_pedido_produto_id
  ON public.itens_pedido (produto_id)
  WHERE produto_id IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  producao_lotes                                          │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant
CREATE INDEX idx_producao_lotes_confeiteiro_id
  ON public.producao_lotes (confeiteiro_id);

-- FK produto_id (histórico de produção de um produto)
CREATE INDEX idx_producao_lotes_produto_id
  ON public.producao_lotes (produto_id)
  WHERE produto_id IS NOT NULL;

-- Relatório por data de produção (calendário de produção)
CREATE INDEX idx_producao_lotes_confeiteiro_data
  ON public.producao_lotes (confeiteiro_id, data_producao DESC);

-- ┌──────────────────────────────────────────────────────────┐
-- │  transacoes                                              │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant
CREATE INDEX idx_transacoes_confeiteiro_id
  ON public.transacoes (confeiteiro_id);

-- Filtro por tipo e período (DRE, fluxo de caixa)
CREATE INDEX idx_transacoes_confeiteiro_tipo_data
  ON public.transacoes (confeiteiro_id, tipo, data DESC);

-- Filtro só por data (calendário financeiro, mês corrente)
CREATE INDEX idx_transacoes_confeiteiro_data
  ON public.transacoes (confeiteiro_id, data DESC);

-- FK pedido_id (transações geradas por pedido)
CREATE INDEX idx_transacoes_pedido_id
  ON public.transacoes (pedido_id)
  WHERE pedido_id IS NOT NULL;

-- Filtro por categoria (agrupamento no relatório)
CREATE INDEX idx_transacoes_confeiteiro_categoria
  ON public.transacoes (confeiteiro_id, categoria);

-- ┌──────────────────────────────────────────────────────────┐
-- │  cronogramas_marketing                                   │
-- └──────────────────────────────────────────────────────────┘

-- FK de tenant (já coberto pelo UNIQUE, mas índice explícito é mais claro)
CREATE INDEX idx_cronogramas_confeiteiro_id
  ON public.cronogramas_marketing (confeiteiro_id);

-- Busca por ano (listar cronogramas do ano)
CREATE INDEX idx_cronogramas_confeiteiro_ano
  ON public.cronogramas_marketing (confeiteiro_id, ano DESC, mes DESC);

-- Queries dentro do JSONB de conteúdo (ex: buscar posts de uma plataforma)
CREATE INDEX idx_cronogramas_conteudo_gin
  ON public.cronogramas_marketing USING GIN (conteudo);

-- ┌──────────────────────────────────────────────────────────┐
-- │  ANALYZE — atualiza estatísticas para o query planner   │
-- └──────────────────────────────────────────────────────────┘
ANALYZE public.confeiteiros;
ANALYZE public.produtos;
ANALYZE public.pedidos;
ANALYZE public.itens_pedido;
ANALYZE public.producao_lotes;
ANALYZE public.transacoes;
ANALYZE public.cronogramas_marketing;
