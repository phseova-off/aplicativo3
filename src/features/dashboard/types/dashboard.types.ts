export interface DashboardMetricas {
  totalPedidos: number
  pedidosPendentes: number
  pedidosEmProducao: number
  receitaMes: number
  despesaMes: number
  lucroMes: number
  pedidosRecentes: PedidoRecente[]
}

export interface PedidoRecente {
  id: string
  cliente_nome: string
  valor: number
  status: string
  data_entrega: string | null
  created_at: string
}
