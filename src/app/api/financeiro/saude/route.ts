import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export interface ProdutoSaude {
  id: string
  nome: string
  preco_venda: number
  custo_calculado: number
  margem_percentual: number
  margem_valor: number
  preco_desatualizado: boolean
  categoria: string
  ativo: boolean
}

export interface SaudeFinanceiraResponse {
  produtos: ProdutoSaude[]
  /** Quantos produtos têm margem saudável (>= 40%) */
  produtos_saudaveis: number
  /** Quantos têm margem crítica (< 20%) */
  produtos_criticos: number
  /** Percentual da receita representado pelos top-N produtos rentáveis */
  top_n: number
  top_n_receita_percentual: number
  /** Alertas de preço não lidos */
  alertas_nao_lidos: number
}

/**
 * GET /api/financeiro/saude
 * Retorna produtos ordenados por margem (ASC) com indicadores de saúde.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Buscar produtos ativos
  const { data: produtos, error } = await db
    .from('produtos')
    .select('id, nome, preco_venda, custo_calculado, preco_desatualizado, categoria, ativo')
    .eq('confeiteiro_id', user.id)
    .eq('ativo', true)
    .gt('preco_venda', 0) as {
      data: Array<{
        id: string
        nome: string
        preco_venda: number
        custo_calculado: number
        preco_desatualizado: boolean
        categoria: string
        ativo: boolean
      }> | null
      error: Error | null
    }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const produtosList = produtos ?? []

  // Calcular margem para cada produto
  const comMargem: ProdutoSaude[] = produtosList.map((p) => {
    const margem = p.preco_venda > 0
      ? ((p.preco_venda - p.custo_calculado) / p.preco_venda) * 100
      : 0
    return {
      ...p,
      margem_percentual: parseFloat(margem.toFixed(1)),
      margem_valor: parseFloat((p.preco_venda - p.custo_calculado).toFixed(2)),
    }
  })

  // Ordenar por margem ASC (piores primeiro)
  comMargem.sort((a, b) => a.margem_percentual - b.margem_percentual)

  const totalProdutos = comMargem.length
  const produtosSaudaveis = comMargem.filter((p) => p.margem_percentual >= 40).length
  const produtosCriticos = comMargem.filter((p) => p.margem_percentual < 20).length

  // Top produtos mais rentáveis geram X% da receita (simulado por preco_venda * vendas)
  // Como não há histórico de vendas aqui, calculamos top 20% por margem absoluta
  let topNReceita = 0
  let topN = 0
  if (totalProdutos > 0) {
    const sorted = [...comMargem].sort((a, b) => b.margem_valor - a.margem_valor)
    topN = Math.max(1, Math.ceil(totalProdutos * 0.2))
    const somaTop = sorted.slice(0, topN).reduce((s, p) => s + p.margem_valor, 0)
    const somaTotal = sorted.reduce((s, p) => s + Math.max(0, p.margem_valor), 0)
    topNReceita = somaTotal > 0 ? Math.round((somaTop / somaTotal) * 100) : 0
  }

  // Alertas não lidos
  const { count: alertasNaoLidos } = await db
    .from('alertas_ingrediente')
    .select('id', { count: 'exact', head: true })
    .eq('confeiteiro_id', user.id)
    .eq('lido', false) as { count: number | null }

  const response: SaudeFinanceiraResponse = {
    produtos: comMargem,
    produtos_saudaveis: produtosSaudaveis,
    produtos_criticos: produtosCriticos,
    top_n: topN,
    top_n_receita_percentual: topNReceita,
    alertas_nao_lidos: alertasNaoLidos ?? 0,
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
