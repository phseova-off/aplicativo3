// Server-only — never import this from client components
import { createSupabaseServerClient } from '@/server/db/client'
import { openai } from '@/server/services/openaiService'
import type {
  KPIData,
  ParaFazerHojeData,
  SparklinePoint,
  ProximoPedido,
  SugestaoContext,
} from '../types/dashboard.types'
import type { PedidoStatus } from '@/server/db/types'

// ─── helpers ──────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function startOfMonth(offset = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).toISOString().split('T')[0]
}

function endOfMonth(offset = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1 + offset, 0).toISOString().split('T')[0]
}

function nDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ─── KPIs ─────────────────────────────────────────────────────

export async function getKPIs(userId: string): Promise<KPIData> {
  const supabase = await createSupabaseServerClient()

  const mesIni  = startOfMonth()
  const mesFim  = endOfMonth()
  const mesAntIni = startOfMonth(-1)
  const mesAntFim = endOfMonth(-1)

  const [
    transacoesMes,
    transacoesMesAnt,
    pedidosMes,
    produtos,
    itensMes,
  ] = await Promise.all([
    supabase.from('transacoes').select('tipo,valor')
      .eq('confeiteiro_id', userId).gte('data', mesIni).lte('data', mesFim),
    supabase.from('transacoes').select('tipo,valor')
      .eq('confeiteiro_id', userId).gte('data', mesAntIni).lte('data', mesAntFim),
    supabase.from('pedidos').select('id,status')
      .eq('confeiteiro_id', userId).gte('created_at', `${mesIni}T00:00:00Z`).lte('created_at', `${mesFim}T23:59:59Z`),
    supabase.from('produtos').select('nome,preco,custo').eq('confeiteiro_id', userId).eq('ativo', true),
    supabase.from('itens_pedido').select('nome_produto,quantidade,pedido_id'),
  ])

  // Faturamento (receitas only)
  const receita    = (transacoesMes.data ?? []).filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const receitaAnt = (transacoesMesAnt.data ?? []).filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const pctVsAnt   = receitaAnt > 0 ? ((receita - receitaAnt) / receitaAnt) * 100 : null

  // Pedidos
  const ped = pedidosMes.data ?? []
  const totalPed = ped.length
  const entregues = ped.filter((p) => p.status === 'entregue').length
  const pctEntregues = totalPed > 0 ? (entregues / totalPed) * 100 : 0

  // Top produto por quantidade nos itens do mês
  const pedIds = new Set(ped.map((p) => p.id))
  const itensMesData = (itensMes.data ?? []).filter((i) => pedIds.has(i.pedido_id))
  const contagem: Record<string, number> = {}
  for (const item of itensMesData) {
    contagem[item.nome_produto] = (contagem[item.nome_produto] ?? 0) + item.quantidade
  }
  const topEntry = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]
  const topProduto = topEntry ? { nome: topEntry[0], quantidade: topEntry[1] } : null

  // Margem média
  const prods = produtos.data ?? []
  const margemMedia = prods.length > 0
    ? prods.reduce((s, p) => s + (p.preco > 0 ? ((p.preco - p.custo) / p.preco) * 100 : 0), 0) / prods.length
    : 0

  return {
    faturamento: { valor: receita, percentualVsMesAnterior: pctVsAnt },
    pedidos: { total: totalPed, percentualEntregues: pctEntregues },
    topProduto,
    margemMedia,
  }
}

// ─── Para fazer hoje ──────────────────────────────────────────

export async function getParaFazerHoje(userId: string): Promise<ParaFazerHojeData> {
  const supabase = await createSupabaseServerClient()
  const hoje = todayISO()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const amanhaISO = amanha.toISOString().split('T')[0]

  const [pedidosRes, lotesRes] = await Promise.all([
    supabase.from('pedidos')
      .select('id,cliente_nome,data_entrega,valor_total,status')
      .eq('confeiteiro_id', userId)
      .gte('data_entrega', `${hoje}T00:00:00Z`)
      .lt('data_entrega', `${amanhaISO}T00:00:00Z`)
      .not('status', 'in', '("entregue","cancelado")')
      .order('data_entrega', { ascending: true }),
    supabase.from('producao_lotes')
      .select('id,nome_produto,quantidade_planejada,quantidade_produzida,data_producao')
      .eq('confeiteiro_id', userId)
      .eq('data_producao', hoje),
  ])

  const pedidosHoje = (pedidosRes.data ?? []).map((p) => {
    const hora = p.data_entrega
      ? new Date(p.data_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null
    return {
      id: p.id,
      cliente_nome: p.cliente_nome,
      hora_entrega: hora === '00:00' ? null : hora,
      valor_total: p.valor_total,
      status: p.status as PedidoStatus,
    }
  })

  const lotesPendentes = (lotesRes.data ?? [])
    .filter((l) => l.quantidade_produzida < l.quantidade_planejada)
    .map((l) => ({
      id: l.id,
      nome_produto: l.nome_produto,
      quantidade_planejada: l.quantidade_planejada,
      quantidade_produzida: l.quantidade_produzida,
    }))

  return { pedidosHoje, lotesPendentes }
}

// ─── Sparkline (últimos 30 dias) ──────────────────────────────

export async function getSparkline(userId: string): Promise<SparklinePoint[]> {
  const supabase = await createSupabaseServerClient()
  const inicio = nDaysAgo(29)
  const hoje = todayISO()

  const { data } = await supabase
    .from('pedidos')
    .select('created_at')
    .eq('confeiteiro_id', userId)
    .gte('created_at', `${inicio}T00:00:00Z`)
    .lte('created_at', `${hoje}T23:59:59Z`)

  // Group by day
  const byDay: Record<string, number> = {}
  for (const p of data ?? []) {
    const day = p.created_at.split('T')[0]
    byDay[day] = (byDay[day] ?? 0) + 1
  }

  // Fill all 30 days (even zeros)
  const points: SparklinePoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    points.push({ data: iso, quantidade: byDay[iso] ?? 0 })
  }
  return points
}

// ─── Próximos pedidos ─────────────────────────────────────────

export async function getProximosPedidos(userId: string): Promise<ProximoPedido[]> {
  const supabase = await createSupabaseServerClient()
  const hoje = todayISO()

  const { data } = await supabase
    .from('pedidos')
    .select('id,cliente_nome,data_entrega,valor_total,status')
    .eq('confeiteiro_id', userId)
    .not('status', 'in', '("entregue","cancelado")')
    .gte('data_entrega', `${hoje}T00:00:00Z`)
    .order('data_entrega', { ascending: true })
    .limit(5)

  return (data ?? []).map((p) => ({
    id: p.id,
    cliente_nome: p.cliente_nome,
    data_entrega: p.data_entrega,
    valor_total: p.valor_total,
    status: p.status as PedidoStatus,
  }))
}

// ─── AI Suggestion ────────────────────────────────────────────

export async function getSugestaoIA(ctx: SugestaoContext): Promise<string> {
  const { pedidosHoje, pedidosAmanha, faturamentoMes, lotesAbertos, topProduto, margemMedia, nomePrimeiro } = ctx

  const prompt = `Você é uma assistente de negócios para confeitarias artesanais brasileiras.
Seja direta, calorosa e prática. Responda em 1-2 frases curtas em português.

Contexto de hoje para ${nomePrimeiro}:
- Pedidos para entregar HOJE: ${pedidosHoje}
- Pedidos para entregar AMANHÃ: ${pedidosAmanha}
- Faturamento do mês até agora: R$ ${faturamentoMes.toFixed(2)}
- Lotes de produção pendentes hoje: ${lotesAbertos}
- Produto mais vendido do mês: ${topProduto ?? 'sem dados'}
- Margem média dos produtos: ${margemMedia.toFixed(1)}%

Dê UMA sugestão prática e específica para hoje. Foque no que é mais urgente ou lucrativo.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 120,
    })
    return completion.choices[0]?.message?.content?.trim() ?? fallbackSugestao(ctx)
  } catch {
    return fallbackSugestao(ctx)
  }
}

function fallbackSugestao(ctx: SugestaoContext): string {
  if (ctx.pedidosHoje > 0) {
    return `Você tem ${ctx.pedidosHoje} ${ctx.pedidosHoje === 1 ? 'pedido' : 'pedidos'} para entregar hoje — organize sua rota de entrega com antecedência para evitar atrasos.`
  }
  if (ctx.pedidosAmanha > 0) {
    return `Amanhã você tem ${ctx.pedidosAmanha} ${ctx.pedidosAmanha === 1 ? 'pedido' : 'pedidos'} — aproveite hoje para produzir e embalar com calma.`
  }
  if (ctx.topProduto) {
    return `${ctx.topProduto} é seu campeão de vendas este mês — considere divulgá-lo nas redes sociais para aumentar os pedidos.`
  }
  return `Sua margem média está em ${ctx.margemMedia.toFixed(1)}% — verifique se os custos dos ingredientes estão atualizados para garantir o lucro real.`
}
