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

export interface ResumoFinanceiro {
  totalReceitas: number
  totalDespesas: number
  lucroLiquido: number
  ticketMedio: number
  totalPedidos: number
}
