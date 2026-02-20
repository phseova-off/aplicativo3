export type ProducaoEtapa = 'preparo' | 'assar' | 'decorar' | 'embalar' | 'pronto'
export type ProducaoStatus = 'pendente' | 'em_andamento' | 'concluido'

export const ETAPA_LABELS: Record<ProducaoEtapa, string> = {
  preparo: 'Preparo',
  assar: 'Assar',
  decorar: 'Decorar',
  embalar: 'Embalar',
  pronto: 'Pronto',
}

export const ETAPA_EMOJIS: Record<ProducaoEtapa, string> = {
  preparo: '🥣',
  assar: '🔥',
  decorar: '🎨',
  embalar: '📦',
  pronto: '✅',
}

export const STATUS_LABELS: Record<ProducaoStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

export const ETAPAS_ORDER: ProducaoEtapa[] = ['preparo', 'assar', 'decorar', 'embalar', 'pronto']

export interface ProducaoWithPedido {
  id: string
  pedido_id: string
  user_id: string
  etapa: ProducaoEtapa
  status: ProducaoStatus
  observacoes: string | null
  created_at: string
  updated_at: string
  pedidos?: {
    id: string
    cliente_nome: string
    descricao: string | null
    data_entrega: string | null
    valor: number
  } | null
}
