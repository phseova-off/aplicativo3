export type TransacaoTipo = 'receita' | 'despesa'

export const CATEGORIAS_RECEITA = [
  'Pedidos',
  'Encomendas',
  'Doces finos',
  'Bolos',
  'Salgados',
  'Outros',
] as const

export const CATEGORIAS_DESPESA = [
  'Ingredientes',
  'Embalagens',
  'Equipamentos',
  'Energia',
  'Aluguel',
  'Marketing',
  'Outros',
] as const

// ── KPI com comparativo vs mês anterior ──────────────────────

export interface KPIComparativo {
  valor: number
  valorAnterior: number
  variacao: number
  tendencia: 'alta' | 'baixa' | 'estavel'
}

// ── Histórico mensal para gráfico de linhas ───────────────────

export interface MesHistorico {
  mes: string
  receita: number
  despesa: number
}

// ── Produto com margem para gráfico de barras ─────────────────

export interface ProdutoMargem {
  nome: string
  margem: number
  preco_venda: number
  custo_calculado: number
}

// ── Alerta de ingrediente com preço alterado ──────────────────

export interface AlertaIngredienteUI {
  id: string
  ingrediente_nome: string
  variacao_percentual: number
  produtos_afetados: number
}

// ── Payload completo do dashboard ────────────────────────────

export interface DashboardFinanceiro {
  receitaBruta: KPIComparativo
  despesas: KPIComparativo
  lucroLiquido: KPIComparativo
  margemPercentual: KPIComparativo
  historicoMensal: MesHistorico[]
  topProdutosMargem: ProdutoMargem[]
  alertasPreco: AlertaIngredienteUI[]
  totalProdutosDesatualizados: number
}

// ── Análise de clientes ───────────────────────────────────────

export interface ClienteAnalise {
  id: string
  nome: string
  telefone: string | null
  total_pedidos: number
  valor_total_compras: number
  ultima_compra: string | null
  dias_sem_comprar: number | null
  produto_favorito: string | null
}

// ── Calculadora de precificação ───────────────────────────────

export interface IngredienteCalculo {
  ingrediente_id: string
  nome: string
  quantidade: number
  custo_unitario: number
  unidade: string
}

export interface ResultadoPrecificacao {
  custo_ingredientes: number
  custo_embalagem: number
  custo_mao_de_obra: number
  custo_impostos: number
  custo_total: number
  preco_sugerido_50: number
  preco_sugerido_70: number
  preco_sugerido_80: number
  preco_atual: number | null
  margem_atual: number | null
  detalhes_ingredientes: {
    nome: string
    quantidade: number
    unidade: string
    custo: number
  }[]
  tempo_producao_minutos: number
  valor_hora_trabalho: number
  rendimento: number
}

// ── ResumoFinanceiro legado ───────────────────────────────────

export interface ResumoFinanceiro {
  totalReceitas: number
  totalDespesas: number
  lucroLiquido: number
  ticketMedio: number
  totalPedidos: number
}
