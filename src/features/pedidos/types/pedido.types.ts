export type PedidoStatus = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'

export const PEDIDO_STATUS_LABELS: Record<PedidoStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const PEDIDO_STATUS_VARIANTS: Record<PedidoStatus, 'default' | 'warning' | 'info' | 'success' | 'error' | 'purple' | 'orange'> = {
  pendente: 'warning',
  em_producao: 'info',
  pronto: 'success',
  entregue: 'purple',
  cancelado: 'error',
}

export interface PedidoWithItens {
  id: string
  user_id: string
  cliente_nome: string
  cliente_telefone: string | null
  descricao: string | null
  valor: number
  status: PedidoStatus
  data_entrega: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  itens_pedido?: {
    id: string
    produto: string
    quantidade: number
    preco_unitario: number
  }[]
}
