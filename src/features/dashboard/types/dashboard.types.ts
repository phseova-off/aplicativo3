import type { PedidoStatus } from '@/server/db/types'

// ─── KPIs ─────────────────────────────────────────────────────

export interface KPIData {
  /** Soma de valor_total dos pedidos entregues no mês corrente */
  receitaMes: {
    valor: number
    percentualVsMesAnterior: number | null   // null = sem histórico
  }
  /** Pedidos com status != entregue e != cancelado */
  pedidosAtivos: number
  /** Pedidos com data_entrega nos próximos 7 dias e status ativo */
  proximasEntregas: number
  /** Receita / pedidos entregues (0 se sem dados) */
  ticketMedio: number
  /** Kept for AI suggestion context */
  topProduto: { nome: string; quantidade: number } | null
  margemMedia: number
}

// ─── Weekly bar chart (current month) ────────────────────────

export interface SemanaMes {
  semana: string   // "Sem 1" … "Sem 4"
  receita: number  // sum of valor_total for non-cancelled orders that week
  pedidos: number  // count
}

// ─── "Para fazer hoje" ────────────────────────────────────────

export interface PedidoHoje {
  id: string
  cliente_nome: string
  hora_entrega: string | null              // "HH:MM" or null
  valor_total: number
  status: PedidoStatus
}

export interface LotePendente {
  id: string
  nome_produto: string
  quantidade_planejada: number
  quantidade_produzida: number
}

export interface ParaFazerHojeData {
  pedidosHoje: PedidoHoje[]
  lotesPendentes: LotePendente[]
}

// ─── Sparkline (last 30 days) ─────────────────────────────────

export interface SparklinePoint {
  data: string        // YYYY-MM-DD
  quantidade: number
}

// ─── Próximos pedidos ─────────────────────────────────────────

export interface ProximoPedido {
  id: string
  cliente_nome: string
  data_entrega: string | null
  valor_total: number
  status: PedidoStatus
}

// ─── AI Suggestion ────────────────────────────────────────────

export interface SugestaoContext {
  pedidosHoje: number
  pedidosAmanha: number
  faturamentoMes: number
  lotesAbertos: number
  topProduto: string | null
  margemMedia: number
  nomePrimeiro: string
}

// ─── Full dashboard payload (for API route / legacy hook) ─────

export interface DashboardMetricas {
  totalPedidos: number
  pedidosPendentes: number
  pedidosEmProducao: number
  receitaMes: number
  despesaMes: number
  lucroMes: number
  pedidosRecentes: ProximoPedido[]
}
