// ============================================================
// Doceria Pro — Insight Diário por IA
//
// Gera 1 insight personalizado por confeitaria por dia.
// Cache de 24h na tabela `insights_diarios` para evitar
// chamadas desnecessárias à OpenAI.
// Fallback com insights predefinidos se OpenAI estiver fora.
// ============================================================

import { createSupabaseServiceClient } from '@/server/db/client'

// ─── Tipos ────────────────────────────────────────────────────

export interface InsightDiario {
  id?: string
  confeitaria_id: string
  texto: string
  acao_sugerida: string | null
  acao_url: string | null
  gerado_por: 'ia' | 'fallback'
  data: string // YYYY-MM-DD
  created_at?: string
}

// ─── Contexto que enviamos para a IA ─────────────────────────

interface ContextoConfeitaria {
  nome: string
  pedidosHojeAmanha: number
  produtoMaisRentavel: string | null
  margemMaisRentavel: number | null
  clientesInativos30d: number
  receitaMesAtual: number
  receitaMesAnterior: number
  diasAtePico: number | null
  nomePico: string | null
}

// ─── Buscar ou gerar insight ─────────────────────────────────

/**
 * Retorna o insight do dia para a confeitaria.
 * Se já existe um insight para hoje, retorna o cache.
 * Senão, gera um novo via OpenAI (ou fallback).
 */
export async function obterInsightDiario(
  confeitariaId: string
): Promise<InsightDiario> {
  const supabase = createSupabaseServiceClient()
  const hoje = new Date().toISOString().split('T')[0]

  // 1. Verificar cache
  const { data: cached } = await supabase
    .from('insights_diarios')
    .select('*')
    .eq('confeitaria_id', confeitariaId)
    .eq('data', hoje)
    .maybeSingle()

  if (cached) {
    return cached as InsightDiario
  }

  // 2. Buscar contexto da confeitaria
  const contexto = await buscarContexto(confeitariaId, supabase)

  // 3. Tentar gerar via IA
  let insight: InsightDiario
  try {
    insight = await gerarInsightIA(confeitariaId, contexto, hoje)
  } catch (err) {
    console.error('[insightIA] Falha na OpenAI, usando fallback', err)
    insight = gerarInsightFallback(confeitariaId, contexto, hoje)
  }

  // 4. Salvar no cache
  await supabase.from('insights_diarios').upsert(
    {
      confeitaria_id: insight.confeitaria_id,
      texto: insight.texto,
      acao_sugerida: insight.acao_sugerida,
      acao_url: insight.acao_url,
      gerado_por: insight.gerado_por,
      data: insight.data,
    },
    { onConflict: 'confeitaria_id,data' }
  )

  return insight
}

// ─── Buscar contexto ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buscarContexto(confeitariaId: string, supabase: any): Promise<ContextoConfeitaria> {
  const hoje = new Date()
  const hojeISO = hoje.toISOString().split('T')[0]
  const amanhaDate = new Date(hoje)
  amanhaDate.setDate(amanhaDate.getDate() + 1)
  const amanhaISO = amanhaDate.toISOString().split('T')[0]

  // Buscar em paralelo
  const [
    confeitariaRes,
    pedidosRes,
    produtoRes,
    clientesRes,
    resumoRes,
  ] = await Promise.all([
    // Nome da confeitaria
    supabase.from('confeitarias').select('nome').eq('id', confeitariaId).single(),
    // Pedidos para hoje/amanhã
    supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('confeitaria_id', confeitariaId)
      .in('status', ['novo', 'confirmado', 'producao', 'pronto'])
      .gte('data_entrega', hojeISO)
      .lte('data_entrega', amanhaISO + 'T23:59:59'),
    // Produto mais rentável
    supabase
      .from('produtos')
      .select('nome, preco_venda, custo_calculado')
      .eq('confeitaria_id', confeitariaId)
      .eq('ativo', true)
      .gt('custo_calculado', 0)
      .order('preco_venda', { ascending: false })
      .limit(10),
    // Clientes inativos (>30 dias)
    (() => {
      const d30 = new Date(hoje)
      d30.setDate(d30.getDate() - 30)
      return supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('confeitaria_id', confeitariaId)
        .lt('ultima_compra', d30.toISOString().split('T')[0])
        .gt('total_pedidos', 0)
    })(),
    // Receita mês atual e anterior
    (() => {
      const mesAtual = `${hoje.toISOString().slice(0, 7)}-01`
      const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const mesAnterior = `${mesAnteriorDate.toISOString().slice(0, 7)}-01`
      return supabase
        .from('resumo_financeiro_mensal')
        .select('mes, total_receitas')
        .eq('confeitaria_id', confeitariaId)
        .in('mes', [mesAtual, mesAnterior])
    })(),
  ])

  // Calcular produto mais rentável (maior margem percentual)
  let produtoMaisRentavel: string | null = null
  let margemMaisRentavel: number | null = null
  if (produtoRes.data && produtoRes.data.length > 0) {
    const comMargem = produtoRes.data
      .map((p: { nome: string; preco_venda: number; custo_calculado: number }) => ({
        nome: p.nome,
        margem: p.preco_venda > 0 ? ((p.preco_venda - p.custo_calculado) / p.preco_venda) * 100 : 0,
      }))
      .sort((a: { margem: number }, b: { margem: number }) => b.margem - a.margem)
    if (comMargem[0]) {
      produtoMaisRentavel = comMargem[0].nome
      margemMaisRentavel = Math.round(comMargem[0].margem)
    }
  }

  // Receita mês atual vs anterior
  const mesAtual = hoje.toISOString().slice(0, 7)
  const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mesAnterior = mesAnteriorDate.toISOString().slice(0, 7)
  const receitaAtual = resumoRes.data?.find(
    (r: { mes: string }) => r.mes?.startsWith(mesAtual)
  )?.total_receitas ?? 0
  const receitaAnterior = resumoRes.data?.find(
    (r: { mes: string }) => r.mes?.startsWith(mesAnterior)
  )?.total_receitas ?? 0

  // Pico sazonal
  const { picosProximos } = await import('@/server/lib/sazonalidade')
  const picos = picosProximos(30, hoje)
  const proximoPico = picos[0] ?? null

  return {
    nome: confeitariaRes.data?.nome ?? 'sua confeitaria',
    pedidosHojeAmanha: pedidosRes.count ?? 0,
    produtoMaisRentavel,
    margemMaisRentavel,
    clientesInativos30d: clientesRes.count ?? 0,
    receitaMesAtual: receitaAtual,
    receitaMesAnterior: receitaAnterior,
    diasAtePico: proximoPico?.diasRestantes ?? null,
    nomePico: proximoPico?.nome ?? null,
  }
}

// ─── Geração via OpenAI ──────────────────────────────────────

async function gerarInsightIA(
  confeitariaId: string,
  ctx: ContextoConfeitaria,
  data: string
): Promise<InsightDiario> {
  const { openai } = await import('@/server/services/openaiService')

  const prompt = `Você é uma consultora de negócios para confeitarias artesanais brasileiras.
Gere UM insight diário curto (máximo 2 frases) e uma ação sugerida (1 frase) para a confeitaria "${ctx.nome}".

CONTEXTO DE HOJE:
- Pedidos para entregar hoje/amanhã: ${ctx.pedidosHojeAmanha}
- Produto mais rentável: ${ctx.produtoMaisRentavel ?? 'não definido'} (margem ${ctx.margemMaisRentavel ?? 0}%)
- Clientes que não compram há 30+ dias: ${ctx.clientesInativos30d}
- Receita mês atual: R$${ctx.receitaMesAtual.toFixed(2)}
- Receita mês anterior: R$${ctx.receitaMesAnterior.toFixed(2)}
${ctx.nomePico ? `- Próximo evento sazonal: ${ctx.nomePico} em ${ctx.diasAtePico} dias` : ''}

REGRAS:
1. Seja específica e use os dados reais acima.
2. SEMPRE inclua uma ação concreta (não genérica).
3. Tom: acolhedor, direto, como uma amiga de negócios.
4. Use emojis com moderação (máx 2).
5. Retorne JSON: {"texto": "...", "acao_sugerida": "...", "acao_url": "/rota"}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  const parsed = JSON.parse(content) as {
    texto?: string
    acao_sugerida?: string
    acao_url?: string
  }

  return {
    confeitaria_id: confeitariaId,
    texto: parsed.texto ?? 'Seu negócio está crescendo! Continue assim.',
    acao_sugerida: parsed.acao_sugerida ?? null,
    acao_url: parsed.acao_url ?? null,
    gerado_por: 'ia',
    data,
  }
}

// ─── Fallback (sem IA) ───────────────────────────────────────

function gerarInsightFallback(
  confeitariaId: string,
  ctx: ContextoConfeitaria,
  data: string
): InsightDiario {
  // Escolher insight baseado no contexto mais relevante
  if (ctx.pedidosHojeAmanha > 0) {
    return {
      confeitaria_id: confeitariaId,
      texto: `Você tem ${ctx.pedidosHojeAmanha} pedido${ctx.pedidosHojeAmanha > 1 ? 's' : ''} para entregar nas próximas 48h. Organize sua produção!`,
      acao_sugerida: 'Confira sua lista de pedidos e planeje a produção.',
      acao_url: '/pedidos',
      gerado_por: 'fallback',
      data,
    }
  }

  if (ctx.clientesInativos30d > 2) {
    return {
      confeitaria_id: confeitariaId,
      texto: `${ctx.clientesInativos30d} clientes não compram há mais de 30 dias. Uma mensagem carinhosa pode trazer eles de volta! 💬`,
      acao_sugerida: 'Envie uma mensagem para seus clientes inativos.',
      acao_url: '/financeiro/clientes',
      gerado_por: 'fallback',
      data,
    }
  }

  if (ctx.produtoMaisRentavel && ctx.margemMaisRentavel) {
    return {
      confeitaria_id: confeitariaId,
      texto: `Seu produto mais rentável é ${ctx.produtoMaisRentavel} com ${ctx.margemMaisRentavel}% de margem. Considere destacá-lo no seu cardápio! ⭐`,
      acao_sugerida: 'Destaque esse produto no seu cardápio público.',
      acao_url: '/configuracoes/cardapio-publico',
      gerado_por: 'fallback',
      data,
    }
  }

  if (ctx.nomePico && ctx.diasAtePico !== null && ctx.diasAtePico <= 30) {
    return {
      confeitaria_id: confeitariaId,
      texto: `${ctx.nomePico} está chegando em ${ctx.diasAtePico} dias! É hora de planejar sua produção especial.`,
      acao_sugerida: 'Monte seu cardápio especial para a data.',
      acao_url: '/producao/planejamento',
      gerado_por: 'fallback',
      data,
    }
  }

  // Default genérico
  return {
    confeitaria_id: confeitariaId,
    texto: 'Dedique alguns minutos para revisar seus preços e garantir que sua margem está saudável. 📊',
    acao_sugerida: 'Revise a precificação dos seus produtos.',
    acao_url: '/financeiro/precificacao',
    gerado_por: 'fallback',
    data,
  }
}
