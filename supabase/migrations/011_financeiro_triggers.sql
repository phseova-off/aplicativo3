-- ============================================================
-- Doceria Pro — Migration 011
-- Módulo Financeiro: triggers de integração automática
--   • Pedido entregue → gera transação de receita
--   • Lote concluído → gera transação de despesa de insumos
--   • confeitaria_id em transacoes (compatibilidade v2)
-- ============================================================

-- ┌──────────────────────────────────────────────────────────┐
-- │  transacoes — adicionar confeitaria_id (v2)              │
-- └──────────────────────────────────────────────────────────┘

ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS confeitaria_id UUID REFERENCES public.confeitarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem TEXT CHECK (origem IN ('manual', 'pedido_automatico', 'lote_automatico')) DEFAULT 'manual';

-- Índice para consultas por confeitaria
CREATE INDEX IF NOT EXISTS idx_transacoes_confeitaria
  ON public.transacoes (confeitaria_id, data DESC)
  WHERE confeitaria_id IS NOT NULL;

-- Índice para consultas por mês/ano (muito usadas no dashboard)
CREATE INDEX IF NOT EXISTS idx_transacoes_confeiteiro_data
  ON public.transacoes (confeiteiro_id, data DESC);

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRIGGER 1: pedido entregue → receita automática         │
-- └──────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.gerar_receita_pedido_entregue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só dispara quando o status muda para 'entregue'
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status <> 'entregue') THEN
    -- Evita duplicata: se já existe uma receita automática para este pedido, não insere
    IF NOT EXISTS (
      SELECT 1 FROM public.transacoes
      WHERE pedido_id = NEW.id AND tipo = 'receita' AND origem = 'pedido_automatico'
    ) THEN
      INSERT INTO public.transacoes (
        confeiteiro_id,
        confeitaria_id,
        tipo,
        categoria,
        descricao,
        valor,
        data,
        pedido_id,
        origem
      ) VALUES (
        NEW.confeiteiro_id,
        NEW.confeitaria_id,
        'receita',
        'Pedidos',
        'Pedido entregue — ' || NEW.cliente_nome,
        GREATEST(NEW.valor_total, 0),
        COALESCE(CAST(NEW.data_entrega AS DATE), CURRENT_DATE),
        NEW.id,
        'pedido_automatico'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS pedido_entregue_gera_receita ON public.pedidos;

CREATE TRIGGER pedido_entregue_gera_receita
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.gerar_receita_pedido_entregue();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRIGGER 2: lote concluído → despesa de insumos          │
-- └──────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.gerar_despesa_lote_concluido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custo NUMERIC(10,2);
BEGIN
  -- Só dispara quando o status muda para 'concluido'
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status <> 'concluido') THEN
    -- Usa custo_real se disponível, senão custo_estimado, senão custo_total
    v_custo := COALESCE(
      NULLIF(NEW.custo_real, 0),
      NULLIF(NEW.custo_estimado, 0),
      NEW.custo_total,
      0
    );

    IF v_custo > 0 THEN
      INSERT INTO public.transacoes (
        confeiteiro_id,
        confeitaria_id,
        tipo,
        categoria,
        descricao,
        valor,
        data,
        origem
      ) VALUES (
        NEW.confeiteiro_id,
        NEW.confeitaria_id,
        'despesa',
        'Ingredientes',
        'Insumos produção: ' || NEW.nome_produto ||
          ' (' || NEW.quantidade_produzida || ' unid.)',
        v_custo,
        CURRENT_DATE,
        'lote_automatico'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS lote_concluido_gera_despesa ON public.producao_lotes;

CREATE TRIGGER lote_concluido_gera_despesa
  AFTER UPDATE ON public.producao_lotes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.gerar_despesa_lote_concluido();

-- ┌──────────────────────────────────────────────────────────┐
-- │  TRIGGER 3: ingrediente com preço alterado               │
-- │  → sinaliza produtos afetados com preco_desatualizado    │
-- │  (complementa migration 010, que já tem o trigger base)  │
-- └──────────────────────────────────────────────────────────┘

-- Garante que o trigger de cascata de preço existe (idempotente)
CREATE OR REPLACE FUNCTION public.cascatear_preco_ingrediente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variacao NUMERIC(6,2);
  v_afetados INTEGER;
BEGIN
  -- Só processa quando o preço de fato mudou
  IF NEW.preco_atual = OLD.preco_atual THEN
    RETURN NEW;
  END IF;

  -- Salva preço anterior
  NEW.preco_anterior  := OLD.preco_atual;
  NEW.preco_updated_at := NOW();

  -- Calcula variação percentual
  IF OLD.preco_atual > 0 THEN
    v_variacao := ((NEW.preco_atual - OLD.preco_atual) / OLD.preco_atual) * 100;
  ELSE
    v_variacao := 0;
  END IF;

  -- Marca produtos que usam este ingrediente como desatualizados
  UPDATE public.produtos p
     SET preco_desatualizado = TRUE,
         updated_at          = NOW()
   FROM public.produtos_ingredientes pi
  WHERE pi.produto_id        = p.id
    AND pi.ingrediente_id    = NEW.id
    AND p.confeiteiro_id     = NEW.confeiteiro_id;

  GET DIAGNOSTICS v_afetados = ROW_COUNT;

  -- Registra alerta de variação (apenas se tiver produtos afetados)
  IF v_afetados > 0 THEN
    INSERT INTO public.alertas_ingrediente (
      confeiteiro_id,
      ingrediente_id,
      ingrediente_nome,
      preco_anterior,
      preco_novo,
      variacao_percentual,
      produtos_afetados
    ) VALUES (
      NEW.confeiteiro_id,
      NEW.id,
      NEW.nome,
      OLD.preco_atual,
      NEW.preco_atual,
      v_variacao,
      v_afetados
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Remove trigger anterior se existir (migration 010 pode tê-lo criado com nome diferente)
DROP TRIGGER IF EXISTS ingrediente_preco_cascatear ON public.ingredientes_catalogo;
DROP TRIGGER IF EXISTS on_ingrediente_preco_atualizado ON public.ingredientes_catalogo;

CREATE TRIGGER ingrediente_preco_cascatear
  BEFORE UPDATE OF preco_atual ON public.ingredientes_catalogo
  FOR EACH ROW
  EXECUTE FUNCTION public.cascatear_preco_ingrediente();

-- ┌──────────────────────────────────────────────────────────┐
-- │  ANALYZE                                                  │
-- └──────────────────────────────────────────────────────────┘

ANALYZE public.transacoes;
ANALYZE public.pedidos;
ANALYZE public.producao_lotes;
ANALYZE public.ingredientes_catalogo;
