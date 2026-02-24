import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function mesLabel(anoMes: string): string {
  const [, m] = anoMes.split('-')
  return MESES_PT[parseInt(m, 10) - 1] ?? anoMes
}

function addMeses(dataBase: Date, n: number): Date {
  const d = new Date(dataBase)
  d.setMonth(d.getMonth() + n)
  return d
}

function formatYYYYMM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function primeiroDiaMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function ultimoDiaMes(d: Date): string {
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`
}

interface KPIComparativo {
  valor: number
  valorAnterior: number
  variacao: number
  tendencia: 'alta' | 'baixa' | 'estavel'
}

function calcKPI(atual: number, anterior: number): KPIComparativo {
  const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0
  return {
    valor: atual,
    valorAnterior: anterior,
    variacao: Math.round(variacao * 10) / 10,
    tendencia: variacao > 1 ? 'alta' : variacao < -1 ? 'baixa' : 'estavel',
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agora = new Date()
  const mesAtual = agora
  const mesAnterior = addMeses(agora, -1)

  // ── Datas ────────────────────────────────────────────────
  const mesAtualInicio = primeiroDiaMes(mesAtual)
  const mesAtualFim = ultimoDiaMes(mesAtual)
  const mesAnteriorInicio = primeiroDiaMes(mesAnterior)
  const mesAnteriorFim = ultimoDiaMes(mesAnterior)
  const seisAtras = addMeses(agora, -5)
  const historicoInicio = primeiroDiaMes(seisAtras)

  // ── Queries paralelas ─────────────────────────────────────
  const [
    { data: transAtual },
    { data: transAnterior },
    { data: historico },
    { data: produtos },
    { data: alertas },
    { data: prodDesatualizados },
  ] = await Promise.all([
    supabase
      .from('transacoes')
      .select('tipo, valor')
      .eq('confeiteiro_id', user.id)
      .gte('data', mesAtualInicio)
      .lte('data', mesAtualFim),

    supabase
      .from('transacoes')
      .select('tipo, valor')
      .eq('confeiteiro_id', user.id)
      .gte('data', mesAnteriorInicio)
      .lte('data', mesAnteriorFim),

    supabase
      .from('transacoes')
      .select('tipo, valor, data')
      .eq('confeiteiro_id', user.id)
      .gte('data', historicoInicio)
      .order('data', { ascending: true }),

    supabase
      .from('produtos')
      .select('nome, preco_venda, custo_calculado')
      .eq('confeiteiro_id', user.id)
      .eq('ativo', true),

    supabase
      .from('alertas_ingrediente')
      .select('id, ingrediente_nome, variacao_percentual, produtos_afetados')
      .eq('confeiteiro_id', user.id)
      .eq('lido', false)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('produtos')
      .select('id')
      .eq('confeiteiro_id', user.id)
      .eq('preco_desatualizado', true),
  ])

  // ── Agrega mês atual ──────────────────────────────────────
  const receitaAtual = (transAtual ?? [])
    .filter(t => t.tipo === 'receita')
    .reduce((s, t) => s + (t.valor ?? 0), 0)
  const despesaAtual = (transAtual ?? [])
    .filter(t => t.tipo === 'despesa')
    .reduce((s, t) => s + (t.valor ?? 0), 0)
  const lucroAtual = receitaAtual - despesaAtual
  const margemAtual = receitaAtual > 0 ? (lucroAtual / receitaAtual) * 100 : 0

  // ── Agrega mês anterior ───────────────────────────────────
  const receitaAnterior = (transAnterior ?? [])
    .filter(t => t.tipo === 'receita')
    .reduce((s, t) => s + (t.valor ?? 0), 0)
  const despesaAnterior = (transAnterior ?? [])
    .filter(t => t.tipo === 'despesa')
    .reduce((s, t) => s + (t.valor ?? 0), 0)
  const lucroAnterior = receitaAnterior - despesaAnterior
  const margemAnterior = receitaAnterior > 0 ? (lucroAnterior / receitaAnterior) * 100 : 0

  // ── Histórico 6 meses ─────────────────────────────────────
  const meses: Record<string, { mes: string; receita: number; despesa: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = addMeses(agora, -i)
    const key = formatYYYYMM(d)
    meses[key] = { mes: mesLabel(key), receita: 0, despesa: 0 }
  }

  for (const t of (historico ?? [])) {
    const key = (t.data as string).substring(0, 7)
    if (meses[key]) {
      if (t.tipo === 'receita') meses[key].receita += t.valor ?? 0
      else meses[key].despesa += t.valor ?? 0
    }
  }

  // ── Top 5 produtos por margem ─────────────────────────────
  const topProdutos = (produtos ?? [])
    .map(p => ({
      nome: p.nome,
      preco_venda: p.preco_venda ?? 0,
      custo_calculado: p.custo_calculado ?? 0,
      margem: (p.preco_venda ?? 0) > 0
        ? (((p.preco_venda ?? 0) - (p.custo_calculado ?? 0)) / (p.preco_venda ?? 0)) * 100
        : 0,
    }))
    .sort((a, b) => b.margem - a.margem)
    .slice(0, 5)

  return NextResponse.json({
    receitaBruta: calcKPI(receitaAtual, receitaAnterior),
    despesas: calcKPI(despesaAtual, despesaAnterior),
    lucroLiquido: calcKPI(lucroAtual, lucroAnterior),
    margemPercentual: calcKPI(margemAtual, margemAnterior),
    historicoMensal: Object.values(meses),
    topProdutosMargem: topProdutos,
    alertasPreco: alertas ?? [],
    totalProdutosDesatualizados: prodDesatualizados?.length ?? 0,
  })
}
