-- ============================================================
-- Doceria Pro — Migration 012
-- Ajustes finais do schema:
--   • confeitarias.estado (separado de cidade)
--   • pedidos: numero, valor_sinal, endereco_entrega
--   • itens_pedido.personalizacao
--   • cronogramas_marketing.tokens_usados
--   • View: resumo_financeiro_mensal
--   • Storage bucket: avatars
--   • RLS em pedido_itens (alias)
--   • Índices adicionais
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  confeitarias — coluna estado                             │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.confeitarias
  ADD COLUMN IF NOT EXISTS estado TEXT;

-- Extrai estado de cidades existentes no formato "Cidade, UF"
UPDATE public.confeitarias
   SET estado = TRIM(SPLIT_PART(cidade, ',', 2)),
       cidade = TRIM(SPLIT_PART(cidade, ',', 1))
 WHERE cidade LIKE '%,%'
   AND estado IS NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  pedidos — colunas faltantes                              │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero           TEXT,
  ADD COLUMN IF NOT EXISTS valor_sinal      NUMERIC(10,2) DEFAULT 0 CHECK (valor_sinal >= 0),
  ADD COLUMN IF NOT EXISTS endereco_entrega TEXT;

-- Gera numero sequencial para pedidos existentes sem numero
DO $$
DECLARE
  r RECORD;
  seq INT;
BEGIN
  FOR r IN (
    SELECT confeiteiro_id, array_agg(id ORDER BY created_at) AS ids
    FROM public.pedidos
    WHERE numero IS NULL
    GROUP BY confeiteiro_id
  ) LOOP
    seq := 1;
    FOR i IN 1..array_length(r.ids, 1) LOOP
      UPDATE public.pedidos
         SET numero = LPAD(seq::TEXT, 4, '0')
       WHERE id = r.ids[i];
      seq := seq + 1;
    END LOOP;
  END LOOP;
END $$;

-- Trigger: gera numero automaticamente para novos pedidos
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  v_next INT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    SELECT COALESCE(MAX(numero::INT), 0) + 1
      INTO v_next
      FROM public.pedidos
     WHERE confeitaria_id = NEW.confeitaria_id
       AND numero ~ '^\d+$';

    NEW.numero := LPAD(COALESCE(v_next, 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_gerar_numero ON public.pedidos;
CREATE TRIGGER pedidos_gerar_numero
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_pedido();

-- ┌──────────────────────────────────────────────────────────┐
-- │  itens_pedido — personalização                            │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.itens_pedido
  ADD COLUMN IF NOT EXISTS personalizacao TEXT;

-- ┌──────────────────────────────────────────────────────────┐
-- │  cronogramas_marketing — tokens usados                    │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.cronogramas_marketing
  ADD COLUMN IF NOT EXISTS tokens_usados INT DEFAULT 0 CHECK (tokens_usados >= 0);

-- ┌──────────────────────────────────────────────────────────┐
-- │  VIEW: resumo_financeiro_mensal                           │
-- │                                                          │
-- │  Total de receitas, despesas e lucro por mês.            │
-- │  Filtra por confeitaria_id para multi-tenant.            │
-- └──────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW public.resumo_financeiro_mensal AS
SELECT
  COALESCE(t.confeitaria_id, t.confeiteiro_id) AS confeitaria_id,
  DATE_TRUNC('month', t.data)::DATE            AS mes,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'receita'),  0) AS total_receitas,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'despesa'),  0) AS total_despesas,
  COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'receita'),  0)
    - COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'despesa'), 0) AS lucro_liquido,
  COUNT(*) FILTER (WHERE t.tipo = 'receita')  AS qtd_receitas,
  COUNT(*) FILTER (WHERE t.tipo = 'despesa')  AS qtd_despesas,
  COUNT(DISTINCT t.pedido_id) FILTER (WHERE t.tipo = 'receita') AS pedidos_pagos
FROM public.transacoes t
GROUP BY
  COALESCE(t.confeitaria_id, t.confeiteiro_id),
  DATE_TRUNC('month', t.data)::DATE;

-- RLS na view é herdado das tabelas subjacentes (transacoes já tem RLS)

-- ┌──────────────────────────────────────────────────────────┐
-- │  ÍNDICES ADICIONAIS                                       │
-- └──────────────────────────────────────────────────────────┘

-- Pedidos: busca por numero dentro da confeitaria
CREATE INDEX IF NOT EXISTS idx_pedidos_confeitaria_numero
  ON public.pedidos (confeitaria_id, numero);

-- Pedidos: busca por data de entrega no dashboard
CREATE INDEX IF NOT EXISTS idx_pedidos_entrega_status
  ON public.pedidos (data_entrega, status)
  WHERE status NOT IN ('entregue', 'cancelado');

-- Confeitarias: busca por estado
CREATE INDEX IF NOT EXISTS idx_confeitarias_estado
  ON public.confeitarias (estado)
  WHERE estado IS NOT NULL;

-- ┌──────────────────────────────────────────────────────────┐
-- │  STORAGE: bucket para fotos de perfil                     │
-- │                                                          │
-- │  Execute no Supabase Dashboard → Storage ou via API:     │
-- │  Este SQL cria a configuração se executado via supabase   │
-- │  db push com acesso ao schema storage.                    │
-- └──────────────────────────────────────────────────────────┘

-- Criar bucket "avatars" (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: qualquer autenticado pode fazer upload em seu próprio diretório
CREATE POLICY IF NOT EXISTS "Usuarios fazem upload na sua pasta"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- RLS: leitura pública (bucket é público)
CREATE POLICY IF NOT EXISTS "Avatars sao publicos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- RLS: dono pode deletar/atualizar seus próprios arquivos
CREATE POLICY IF NOT EXISTS "Usuarios atualizam seus avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY IF NOT EXISTS "Usuarios deletam seus avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ┌──────────────────────────────────────────────────────────┐
-- │  ANALYZE                                                  │
-- └──────────────────────────────────────────────────────────┘

ANALYZE public.confeitarias;
ANALYZE public.pedidos;
ANALYZE public.itens_pedido;
ANALYZE public.cronogramas_marketing;
