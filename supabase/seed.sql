-- ============================================================
-- Doceria Pro — Seed de Desenvolvimento
-- Arquivo: supabase/seed.sql
-- ============================================================
--
-- COMO USAR:
--
--   Opção A — Supabase CLI (recomendado):
--     supabase db reset          # aplica migrations + seed automaticamente
--
--   Opção B — SQL Editor do Dashboard:
--     1. Acesse https://supabase.com/dashboard > SQL Editor
--     2. Cole este arquivo e execute com service_role (padrão do editor)
--
--   Opção C — psql com service role:
--     psql "$DATABASE_URL" -f supabase/seed.sql
--
-- NOTA SOBRE AUTH:
--   Usamos SET session_replication_role = replica para inserir
--   diretamente em auth.users sem passar pelo trigger de confirmação
--   de email. Isso é seguro APENAS em ambiente de desenvolvimento.
--   Em produção, use o fluxo normal de autenticação.
-- ============================================================

BEGIN;

-- Bypass FK constraints temporariamente para inserir auth users no seed
SET session_replication_role = replica;

-- ┌──────────────────────────────────────────────────────────┐
-- │  USUÁRIOS DE TESTE no auth.users                         │
-- └──────────────────────────────────────────────────────────┘

-- Confeiteira 1: Maria (usuária principal de demo)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'maria@doceriapro.dev',
  crypt('senha123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Maria da Silva"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Confeiteira 2: Ana (segundo tenant para testar isolamento de dados)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ana@doceriapro.dev',
  crypt('senha123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Ana Souza"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Restaurar verificação de FK
SET session_replication_role = DEFAULT;

-- ┌──────────────────────────────────────────────────────────┐
-- │  CONFEITEIROS (perfil legado — compatibilidade)          │
-- │  (normalmente criado pelo trigger handle_new_confeiteiro) │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.confeiteiros (id, nome, email, telefone, cidade, plano, onboarding_completo)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Maria da Silva',
    'maria@doceriapro.dev',
    '(11) 99999-0001',
    'São Paulo',
    'starter',
    TRUE
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000002',
    'Ana Souza',
    'ana@doceriapro.dev',
    '(21) 99999-0002',
    'Rio de Janeiro',
    'free',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  nome     = EXCLUDED.nome,
  telefone = EXCLUDED.telefone,
  cidade   = EXCLUDED.cidade,
  plano    = EXCLUDED.plano,
  onboarding_completo = EXCLUDED.onboarding_completo;

-- ┌──────────────────────────────────────────────────────────┐
-- │  CONFEITARIAS (novo schema v2)                           │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.confeitarias (id, nome, cidade, telefone, plano, mes_referencia)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Doceria da Maria',
    'São Paulo',
    '(11) 99999-0001',
    'starter',
    DATE_TRUNC('month', NOW())::DATE
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000002',
    'Atelier da Ana',
    'Rio de Janeiro',
    '(21) 99999-0002',
    'free',
    DATE_TRUNC('month', NOW())::DATE
  )
ON CONFLICT (id) DO UPDATE SET
  nome           = EXCLUDED.nome,
  plano          = EXCLUDED.plano,
  mes_referencia = EXCLUDED.mes_referencia;

-- ┌──────────────────────────────────────────────────────────┐
-- │  CONFEITARIA_MEMBROS                                     │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.confeitaria_membros (confeitaria_id, user_id, role)
VALUES
  -- Maria é owner da própria confeitaria
  ('a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'owner'),
  -- Ana é owner da própria confeitaria
  ('a1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002', 'owner'),
  -- Ana também é editora na confeitaria da Maria (demo multi-usuário)
  ('a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002', 'editor')
ON CONFLICT (confeitaria_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- ┌──────────────────────────────────────────────────────────┐
-- │  CLIENTES — Confeitaria da Maria                         │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.clientes (id, confeitaria_id, nome, telefone, canal_preferido, total_pedidos, valor_total_compras, ultima_compra)
VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Fernanda Lima',
    '(11) 98765-4321',
    'whatsapp',
    3, 162.00,
    CURRENT_DATE - INTERVAL '7 days'
  ),
  (
    'd0000001-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Carlos Eduardo',
    '(11) 97654-3210',
    'instagram',
    2, 90.00,
    CURRENT_DATE - INTERVAL '30 days'
  ),
  (
    'd0000001-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Beatriz Oliveira',
    '(11) 96543-2109',
    'whatsapp',
    1, 135.00,
    CURRENT_DATE - INTERVAL '60 days'
  ),
  (
    'd0000001-0000-0000-0000-000000000004',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Juliana Costa',
    '(11) 95432-1098',
    'instagram',
    2, 108.00,
    CURRENT_DATE - INTERVAL '5 days'
  )
ON CONFLICT (confeitaria_id, telefone) DO UPDATE SET
  nome                = EXCLUDED.nome,
  total_pedidos       = EXCLUDED.total_pedidos,
  valor_total_compras = EXCLUDED.valor_total_compras,
  ultima_compra       = EXCLUDED.ultima_compra;

-- ┌──────────────────────────────────────────────────────────┐
-- │  INGREDIENTES_CATALOGO — Confeitaria da Maria            │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.ingredientes_catalogo (id, confeitaria_id, nome, unidade, preco_atual, preco_anterior, fornecedor)
VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Chocolate belga 70%',    'g',  0.0800, 0.0750, 'Importadora Cacau Premium'),
  ('e0000001-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Chocolate ao leite',     'g',  0.0500, NULL,   'Distribuidora Doce Brasil'),
  ('e0000001-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Chocolate branco',       'g',  0.0600, NULL,   'Distribuidora Doce Brasil'),
  ('e0000001-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Creme de leite',         'ml', 0.0100, NULL,   'Mercado local'),
  ('e0000001-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Manteiga sem sal',       'g',  0.0200, NULL,   'Mercado local'),
  ('e0000001-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Cacau em pó',            'g',  0.0150, NULL,   'Casa de Confeitaria'),
  ('e0000001-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Pasta de avelã',         'g',  0.0600, 0.0550, 'Importadora Cacau Premium'),
  ('e0000001-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 'Wafer triturado',        'g',  0.0300, NULL,   'Distribuidora Doce Brasil'),
  ('e0000001-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001', 'Avelãs inteiras',        'un', 0.1500, NULL,   'Importadora Cacau Premium'),
  ('e0000001-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 'Morango fresco',         'g',  0.0200, NULL,   'Feira do produtor'),
  ('e0000001-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 'Açúcar de confeiteiro', 'g',  0.0050, NULL,   'Mercado local'),
  ('e0000001-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', 'Polpa de maracujá',      'ml', 0.0250, NULL,   'Feira do produtor'),
  ('e0000001-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', 'Açúcar cristal',         'g',  0.0050, NULL,   'Mercado local'),
  ('e0000001-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001', 'Flor de sal',            'g',  0.0500, NULL,   'Empório Gourmet')
ON CONFLICT (confeitaria_id, nome) DO UPDATE SET
  preco_atual    = EXCLUDED.preco_atual,
  preco_anterior = EXCLUDED.preco_anterior,
  fornecedor     = EXCLUDED.fornecedor;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PRODUTOS — Cardápio da Maria                            │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.produtos (id, confeiteiro_id, confeitaria_id, nome, descricao, preco, preco_venda, custo, custo_calculado, categoria, ativo, ingredientes)
VALUES
  -- rendimento: unidades que a receita rende; custo_calculado será recalculado por trigger
  ('b0000001-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Trufa de Chocolate Belga',
   'Trufa artesanal com ganache de chocolate belga 70%, banho de chocolate ao leite e cacau em pó.',
   4.50, 4.50, 1.20, 18.45, 'trufa', TRUE,
   '[{"nome":"Chocolate belga 70%","quantidade":200,"unidade":"g","custo_unitario":0.08},{"nome":"Creme de leite","quantidade":100,"unidade":"ml","custo_unitario":0.01},{"nome":"Manteiga sem sal","quantidade":20,"unidade":"g","custo_unitario":0.02},{"nome":"Cacau em pó","quantidade":30,"unidade":"g","custo_unitario":0.015}]'::jsonb),

  ('b0000001-0000-0000-0000-000000000002','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Trufa de Ferrero Rocher',
   'Trufa recheada com pasta de avelã e wafer crocante, coberta com chocolate ao leite e avelãs.',
   5.50, 5.50, 1.80, 20.50, 'trufa', TRUE,
   '[{"nome":"Pasta de avelã","quantidade":150,"unidade":"g","custo_unitario":0.06},{"nome":"Chocolate ao leite","quantidade":200,"unidade":"g","custo_unitario":0.05},{"nome":"Wafer triturado","quantidade":50,"unidade":"g","custo_unitario":0.03},{"nome":"Avelãs inteiras","quantidade":30,"unidade":"unid","custo_unitario":0.15}]'::jsonb),

  ('b0000001-0000-0000-0000-000000000003','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Bombom Recheado de Morango',
   'Bombom de chocolate branco com recheio cremoso de morango natural.',
   3.80, 3.80, 0.95, 14.50, 'bombom', TRUE,
   '[{"nome":"Chocolate branco","quantidade":200,"unidade":"g","custo_unitario":0.06},{"nome":"Morango fresco","quantidade":100,"unidade":"g","custo_unitario":0.02},{"nome":"Creme de leite","quantidade":50,"unidade":"ml","custo_unitario":0.01},{"nome":"Açúcar de confeiteiro","quantidade":20,"unidade":"g","custo_unitario":0.005}]'::jsonb),

  ('b0000001-0000-0000-0000-000000000004','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Kit Presente 9 Trufas',
   'Caixa elegante com 9 trufas sortidas: 3 chocolate belga, 3 Ferrero e 3 sortidas.',
   45.00, 45.00, 14.00, 14.00, 'kit', TRUE, '[]'::jsonb),

  ('b0000001-0000-0000-0000-000000000005','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Trufa de Maracujá',
   'Trufa de chocolate branco com recheio azedo-doce de maracujá fresco.',
   4.80, 4.80, 1.30, 14.00, 'trufa', TRUE,
   '[{"nome":"Chocolate branco","quantidade":200,"unidade":"g","custo_unitario":0.06},{"nome":"Polpa de maracujá","quantidade":80,"unidade":"ml","custo_unitario":0.025},{"nome":"Creme de leite","quantidade":60,"unidade":"ml","custo_unitario":0.01}]'::jsonb),

  ('b0000001-0000-0000-0000-000000000006','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Bombom de Caramelo Salgado',
   'Bombom de chocolate ao leite com recheio de caramelo artesanal e flor de sal.',
   4.20, 4.20, 1.10, 11.60, 'bombom', TRUE,
   '[{"nome":"Chocolate ao leite","quantidade":200,"unidade":"g","custo_unitario":0.05},{"nome":"Açúcar cristal","quantidade":100,"unidade":"g","custo_unitario":0.005},{"nome":"Creme de leite","quantidade":100,"unidade":"ml","custo_unitario":0.01},{"nome":"Flor de sal","quantidade":2,"unidade":"g","custo_unitario":0.05}]'::jsonb),

  -- Produto inativo (arquivado)
  ('b0000001-0000-0000-0000-000000000007','a1b2c3d4-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001',
   'Trufa de Menta (Descontinuada)',
   'Trufa de chocolate amargo com recheio de menta. Fora de linha.',
   4.00, 4.00, 1.00, 1.00, 'trufa', FALSE, '[]'::jsonb)

ON CONFLICT (confeiteiro_id, nome) DO UPDATE SET
  confeitaria_id  = EXCLUDED.confeitaria_id,
  descricao       = EXCLUDED.descricao,
  preco           = EXCLUDED.preco,
  preco_venda     = EXCLUDED.preco_venda,
  custo           = EXCLUDED.custo,
  custo_calculado = EXCLUDED.custo_calculado;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PRODUTOS_INGREDIENTES — Receitas da Maria               │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.produtos_ingredientes (produto_id, ingrediente_id, quantidade)
VALUES
  -- Trufa de Chocolate Belga (rende ~15 unid, custo por lote)
  ('b0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 200),  -- Chocolate belga 70% 200g
  ('b0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000004', 100),  -- Creme de leite 100ml
  ('b0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000005',  20),  -- Manteiga sem sal 20g
  ('b0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000006',  30),  -- Cacau em pó 30g

  -- Trufa de Ferrero Rocher
  ('b0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000007', 150),  -- Pasta de avelã 150g
  ('b0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000002', 200),  -- Chocolate ao leite 200g
  ('b0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000008',  50),  -- Wafer triturado 50g
  ('b0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000009',  30),  -- Avelãs inteiras 30un

  -- Bombom Recheado de Morango
  ('b0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000003', 200),  -- Chocolate branco 200g
  ('b0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000010', 100),  -- Morango fresco 100g
  ('b0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004',  50),  -- Creme de leite 50ml
  ('b0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000011',  20),  -- Açúcar de confeiteiro 20g

  -- Trufa de Maracujá
  ('b0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000003', 200),  -- Chocolate branco 200g
  ('b0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000012',  80),  -- Polpa de maracujá 80ml
  ('b0000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000004',  60),  -- Creme de leite 60ml

  -- Bombom de Caramelo Salgado
  ('b0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000002', 200),  -- Chocolate ao leite 200g
  ('b0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000013', 100),  -- Açúcar cristal 100g
  ('b0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000004', 100),  -- Creme de leite 100ml
  ('b0000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000014',   2)   -- Flor de sal 2g

ON CONFLICT (produto_id, ingrediente_id) DO UPDATE SET quantidade = EXCLUDED.quantidade;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PEDIDOS — Maria                                         │
-- └──────────────────────────────────────────────────────────┘

-- id, confeiteiro_id, confeitaria_id, cliente_id, cliente_nome, cliente_telefone, status, canal, data_entrega, valor_total, observacoes, created_at
INSERT INTO public.pedidos (id, confeiteiro_id, confeitaria_id, cliente_id, cliente_nome, cliente_telefone, status, canal, data_entrega, valor_total, observacoes, created_at)
VALUES
  -- Pedido 1: Entregue (histórico)
  ('c0000001-0000-0000-0000-000000000001',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000001',
   'Fernanda Lima', '(11) 98765-4321',
   'entregue', 'whatsapp', NOW() - INTERVAL '7 days', 54.00,
   'Presentear a sogra. Quer laço dourado na caixa.', NOW() - INTERVAL '10 days'),

  -- Pedido 2: Em produção
  ('c0000001-0000-0000-0000-000000000002',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000002',
   'Carlos Eduardo', '(11) 97654-3210',
   'producao', 'instagram', NOW() + INTERVAL '2 days', 90.00,
   'Festa de 15 anos. Tema: rosa e dourado. Kit com nome da aniversariante.', NOW() - INTERVAL '3 days'),

  -- Pedido 3: Confirmado (próximo)
  ('c0000001-0000-0000-0000-000000000003',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000003',
   'Beatriz Oliveira', '(11) 96543-2109',
   'confirmado', 'whatsapp', NOW() + INTERVAL '5 days', 135.00,
   'Casamento. Preferência por sabores clássicos. Evitar amendoim (alergia).', NOW() - INTERVAL '1 day'),

  -- Pedido 4: Novo (recém chegou — sem cliente cadastrado ainda)
  ('c0000001-0000-0000-0000-000000000004',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   NULL,
   'Rafael Santos', NULL,
   'novo', 'presencial', NOW() + INTERVAL '14 days', 45.00,
   NULL, NOW()),

  -- Pedido 5: Pronto para retirada
  ('c0000001-0000-0000-0000-000000000005',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000004',
   'Juliana Costa', '(11) 95432-1098',
   'pronto', 'instagram', NOW() + INTERVAL '1 day', 54.00,
   'Retirada no ateliê. Confirmar horário.', NOW() - INTERVAL '5 days'),

  -- Pedido 6: Cancelado
  ('c0000001-0000-0000-0000-000000000006',
   'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001',
   NULL,
   'Pedro Alves', '(11) 94321-0987',
   'cancelado', 'whatsapp', NOW() - INTERVAL '2 days', 45.00,
   'Cliente cancelou — mudança de data do evento.', NOW() - INTERVAL '8 days')

ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  ITENS DOS PEDIDOS                                       │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.itens_pedido (pedido_id, produto_id, nome_produto, quantidade, preco_unitario)
VALUES
  -- Pedido 1 (Fernanda — entregue)
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000004', 'Kit Presente 9 Trufas',        1,  45.00),
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Trufa de Chocolate Belga',     2,   4.50),

  -- Pedido 2 (Carlos — produção)
  ('c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000004', 'Kit Presente 9 Trufas',        2,  45.00),

  -- Pedido 3 (Beatriz — confirmado)
  ('c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004', 'Kit Presente 9 Trufas',        3,  45.00),

  -- Pedido 4 (Rafael — novo)
  ('c0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000004', 'Kit Presente 9 Trufas',        1,  45.00),

  -- Pedido 5 (Juliana — pronto)
  ('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'Trufa de Chocolate Belga',     6,   4.50),
  ('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002', 'Trufa de Ferrero Rocher',      6,   5.50),

  -- Pedido 6 (Pedro — cancelado)
  ('c0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000004', 'Kit Presente 9 Trufas',        1,  45.00)

ON CONFLICT DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  LOTES DE PRODUÇÃO — histórico do mês                   │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.producao_lotes (confeiteiro_id, produto_id, nome_produto, quantidade_planejada, quantidade_produzida, data_producao, custo_total, observacoes)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'Trufa de Chocolate Belga',
    50, 50,
    CURRENT_DATE - INTERVAL '5 days',
    60.00,
    'Lote semanal. Chocolate belga da importadora.'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000002',
    'Trufa de Ferrero Rocher',
    30, 28,
    CURRENT_DATE - INTERVAL '5 days',
    50.40,
    '2 unidades com defeito na cobertura — descartadas.'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000003',
    'Bombom Recheado de Morango',
    40, 40,
    CURRENT_DATE - INTERVAL '3 days',
    38.00,
    'Morango fresco da feira — qualidade excelente.'
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b0000001-0000-0000-0000-000000000001',
    'Trufa de Chocolate Belga',
    60, 0,
    CURRENT_DATE + INTERVAL '2 days',
    0.00,
    'Lote para pedidos do final de semana. Separar 18 unidades para pedido da Beatriz.'
  )

ON CONFLICT DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRANSAÇÕES FINANCEIRAS — últimos 30 dias               │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.transacoes (confeiteiro_id, tipo, categoria, descricao, valor, data, pedido_id)
VALUES
  -- Receitas de pedidos entregues
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'receita', 'Pedidos',
    'Pedido Fernanda Lima — Kit + 2 trufas',
    54.00,
    CURRENT_DATE - INTERVAL '7 days',
    'c0000001-0000-0000-0000-000000000001'
  ),
  -- Despesas com matéria-prima
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'despesa', 'Ingredientes',
    'Chocolate belga 70% — 2kg (Importadora)',
    89.90,
    CURRENT_DATE - INTERVAL '6 days',
    NULL
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'despesa', 'Embalagens',
    'Caixas presenteáveis + laços dourados (50 unid)',
    42.00,
    CURRENT_DATE - INTERVAL '4 days',
    NULL
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'despesa', 'Ingredientes',
    'Pasta de avelã importada — 1kg',
    55.00,
    CURRENT_DATE - INTERVAL '2 days',
    NULL
  ),
  -- Receita adicional
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'receita', 'Outros',
    'Aula de trufa artesanal (3 alunas)',
    150.00,
    CURRENT_DATE - INTERVAL '10 days',
    NULL
  ),
  -- Despesa fixa
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'despesa', 'Energia',
    'Conta de luz — proporção do ateliê',
    180.00,
    CURRENT_DATE - INTERVAL '15 days',
    NULL
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'despesa', 'Marketing',
    'Impulsionamento Instagram — março',
    50.00,
    CURRENT_DATE - INTERVAL '20 days',
    NULL
  ),
  -- Receitas futuras antecipadas (sinal de pedidos)
  (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'receita', 'Pedidos',
    'Sinal 50% — Pedido Beatriz Oliveira (casamento)',
    67.50,
    CURRENT_DATE - INTERVAL '1 day',
    'c0000001-0000-0000-0000-000000000003'
  )

ON CONFLICT DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  CRONOGRAMA DE MARKETING — mês atual                    │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.cronogramas_marketing (confeiteiro_id, mes, ano, conteudo, datas_comemorativas)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  EXTRACT(MONTH FROM CURRENT_DATE)::SMALLINT,
  EXTRACT(YEAR  FROM CURRENT_DATE)::SMALLINT,
  '[
    {
      "dia": 1,
      "plataforma": "Instagram",
      "tema": "Apresentação da semana",
      "legenda": "✨ Começando a semana com muito chocolate! Veja o que preparei para vocês essa semana. Encomendas abertas! 🍫 #trufa #doceria #confeitaria #encomendas",
      "hashtags": ["#trufa", "#doceria", "#confeitaria", "#encomendas", "#chocolatebelga"],
      "horario_sugerido": "19:00"
    },
    {
      "dia": 3,
      "plataforma": "WhatsApp",
      "tema": "Status do processo de produção",
      "legenda": "🎬 Bastidores: veja como nossas trufas são feitas com amor e chocolate belga 70%! Cada detalhe importa. 💛",
      "hashtags": [],
      "horario_sugerido": "10:00"
    },
    {
      "dia": 5,
      "plataforma": "Instagram",
      "tema": "Produto em destaque: Trufa Ferrero",
      "legenda": "🌰 A queridinha das clientes está de volta! Trufa de Ferrero Rocher — avelã, wafer crocante e chocolate ao leite. Já pediu a sua? Link na bio! #ferrero #trufa #presente",
      "hashtags": ["#ferrero", "#trufaferrero", "#presente", "#doceria", "#ateliedetrufas"],
      "horario_sugerido": "12:00"
    },
    {
      "dia": 7,
      "plataforma": "Instagram",
      "tema": "Depoimento de cliente",
      "legenda": "💬 ''As trufas chegaram lindas e deliciosas! Minha mãe amou o presente'' — Obrigada, Fernanda! 🥹 Isso é tudo que eu preciso para continuar. Quer presentear alguém especial? Me chama! 💌",
      "hashtags": ["#clientefeliz", "#depoimento", "#presenteperfeito", "#trufas"],
      "horario_sugerido": "18:00"
    },
    {
      "dia": 10,
      "plataforma": "Instagram",
      "tema": "Reels: processo de temperar chocolate",
      "legenda": "🍫 Sabia que temperar o chocolate corretamente é o segredo para aquele brilho perfeito? Assiste esse vídeo até o final! 👀 #chocolatetêmpera #confeitaria #bastidores",
      "hashtags": ["#chocolatetempera", "#confeitaria", "#bastidores", "#dicasdeconfeitaria"],
      "horario_sugerido": "20:00"
    }
  ]'::jsonb,
  '[
    {"data": "2025-02-14", "nome": "Dia dos Namorados (Brasil — jul/2025 tema futuro)"},
    {"data": "2025-03-08", "nome": "Dia Internacional da Mulher"},
    {"data": "2025-04-18", "nome": "Páscoa"},
    {"data": "2025-05-11", "nome": "Dia das Mães"}
  ]'::jsonb
)
ON CONFLICT (confeiteiro_id, mes, ano) DO UPDATE SET
  conteudo            = EXCLUDED.conteudo,
  datas_comemorativas = EXCLUDED.datas_comemorativas;

-- ┌──────────────────────────────────────────────────────────┐
-- │  PRODUTOS da Ana (segundo tenant — isolamento de dados)  │
-- └──────────────────────────────────────────────────────────┘

INSERT INTO public.produtos (confeiteiro_id, confeitaria_id, nome, preco, preco_venda, custo, custo_calculado, categoria, ingredientes)
VALUES
  (
    'a1b2c3d4-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000002',
    'Brigadeiro Gourmet',
    3.50, 3.50, 0.80, 5.93, 'bombom',
    '[{"nome":"Leite condensado","quantidade":395,"unidade":"g","custo_unitario":0.015}]'::jsonb
  ),
  (
    'a1b2c3d4-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000002',
    'Kit Festa 20 Brigadeiros',
    65.00, 65.00, 18.00, 18.00, 'kit',
    '[]'::jsonb
  )
ON CONFLICT (confeiteiro_id, nome) DO NOTHING;

-- Ingrediente do catálogo da Ana
INSERT INTO public.ingredientes_catalogo (confeitaria_id, nome, unidade, preco_atual)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Leite condensado', 'g', 0.0150),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Chocolate em pó',  'g', 0.0120),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Manteiga',         'g', 0.0180)
ON CONFLICT (confeitaria_id, nome) DO NOTHING;

COMMIT;

-- ============================================================
-- CREDENCIAIS DE ACESSO (apenas desenvolvimento local)
-- ============================================================
--   Email:  maria@doceriapro.dev    Senha: senha123!
--   Email:  ana@doceriapro.dev      Senha: senha123!
--
-- Para verificar os dados inseridos:
--   SELECT * FROM public.confeiteiros;
--   SELECT * FROM public.produtos WHERE confeiteiro_id = 'a1b2c3d4-0000-0000-0000-000000000001';
--   SELECT * FROM public.pedidos   WHERE confeiteiro_id = 'a1b2c3d4-0000-0000-0000-000000000001';
--   SELECT p.*, ip.* FROM public.pedidos p JOIN public.itens_pedido ip ON ip.pedido_id = p.id;
--   SELECT * FROM public.transacoes WHERE confeiteiro_id = 'a1b2c3d4-0000-0000-0000-000000000001';
-- ============================================================
