import type { PedidoStatus, PedidoCanal, ItemPedido } from '@/server/db/types'

export type { PedidoStatus, PedidoCanal }

export const PEDIDO_STATUS_ORDER: PedidoStatus[] = [
  'novo',
  'confirmado',
  'producao',
  'pronto',
  'entregue',
  'cancelado',
]

export const PEDIDO_STATUS_LABELS: Record<PedidoStatus, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const PEDIDO_STATUS_VARIANTS: Record<
  PedidoStatus,
  'default' | 'warning' | 'info' | 'success' | 'error' | 'purple' | 'orange'
> = {
  novo: 'default',
  confirmado: 'warning',
  producao: 'info',
  pronto: 'success',
  entregue: 'purple',
  cancelado: 'error',
}

export const PEDIDO_CANAL_LABELS: Record<PedidoCanal, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  presencial: 'Presencial',
}

export const PEDIDO_STATUS_COLUMN_COLORS: Record<PedidoStatus, { header: string; body: string }> = {
  novo:       { header: 'bg-gray-100 text-gray-700',   body: 'bg-gray-50'   },
  confirmado: { header: 'bg-yellow-100 text-yellow-800', body: 'bg-yellow-50' },
  producao:   { header: 'bg-blue-100 text-blue-800',   body: 'bg-blue-50'   },
  pronto:     { header: 'bg-green-100 text-green-800', body: 'bg-green-50'  },
  entregue:   { header: 'bg-purple-100 text-purple-800', body: 'bg-purple-50' },
  cancelado:  { header: 'bg-red-100 text-red-800',     body: 'bg-red-50'    },
}

export interface PedidoWithItens {
  id: string
  confeiteiro_id: string
  cliente_nome: string
  cliente_telefone: string | null
  status: PedidoStatus
  canal: PedidoCanal
  data_entrega: string | null
  valor_total: number
  observacoes: string | null
  created_at: string
  updated_at: string
  itens_pedido: ItemPedido[]
}

export interface PedidoFilters {
  search?: string
  canal?: PedidoCanal | ''
  data_inicio?: string
  data_fim?: string
}
