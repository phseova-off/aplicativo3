import type { Produto, ProducaoLote, Ingrediente, PedidoStatus } from '@/server/db/types'

export type { Ingrediente }

// ─── Lote ─────────────────────────────────────────────────────

export interface LoteComProgresso extends ProducaoLote {
  progresso: number // 0–100
}

// ─── Pedido para produção (daily view) ─────────────────────────

export interface PedidoProducao {
  id: string
  confeiteiro_id: string
  cliente_nome: string
  cliente_telefone: string | null
  status: PedidoStatus
  canal: string
  data_entrega: string | null
  valor_total: number
  observacoes: string | null
  created_at: string
  updated_at: string
  itens_pedido: {
    id: string
    nome_produto: string
    quantidade: number
    preco_unitario: number
    subtotal: number
    produto_id: string | null
  }[]
}

// ─── Receita (Produto com ficha técnica) ───────────────────────

export interface ReceitaComCusto extends Produto {
  custo_calculado: number       // sum(ingrediente.qtd * ingrediente.custo_unitario)
  margem_percentual: number     // (preco - custo_calculado) / preco * 100
}

// ─── Agrupamento semanal ───────────────────────────────────────

export interface DiaSemana {
  data: string            // YYYY-MM-DD
  label: string           // "Seg 18"
  pedidos: PedidoProducao[]
  custo_estimado: number
  valor_total: number
}

// ─── Alerta de ingrediente ─────────────────────────────────────

export interface AlertaIngrediente {
  nome: string
  unidade: string
  total_necessario: number
  pedidos_afetados: number
}
