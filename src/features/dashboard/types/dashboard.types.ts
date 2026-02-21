import type { PedidoStatus } from '@/server/db/types'

// ─── KPIs ─────────────────────────────────────────────────────

export interface KPIFaturamento {
  valor: number
  percentualVsMesAnterior: number | null   // null = sem histórico
}

export interface KPIPedidos {
  total: number
  percentualEntregues: number              // 0–100
}

export interface KPITopProduto {
  nome: string
  quantidade: number
}

export interface KPIData {
  faturamento: KPIFaturamento
  pedidos: KPIPedidos
  topProduto: KPITopProduto | null
  margemMedia: number                      // 0–100 %
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
