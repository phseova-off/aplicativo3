// ============================================================
// Doceria Pro — Motor de Alertas de Negócio
//
// Verifica condições do negócio e retorna alertas acionáveis.
// Chamado a cada login e via GET /api/dashboard/alertas.
// ============================================================

import { createSupabaseServiceClient } from '@/server/db/client'
import { LIMITES_PLANO } from '@/server/lib/planos'
import { picosProximos, type InfoPico } from '@/server/lib/sazonalidade'
import type { PlanoTipo } from '@/server/db/types'

// ─── Tipos ────────────────────────────────────────────────────

export type AlertaTipo =
  | 'pedidos_hoje'
  | 'producao_pendente'
  | 'preco_desatualizado'
  | 'cliente_inativo'
  | 'limite_plano'
  | 'comparativo_mensal'
  | 'pico_sazonal'

export type AlertaPrioridade = 'alta' | 'media' | 'baixa'

export interface Alerta {
  tipo: AlertaTipo
  prioridade: AlertaPrioridade
  titulo: string
  mensagem: string
  /** Rota para ação contextual (ex: '/pedidos', '/financeiro/precificacao') */
  acao_url?: string
  acao_label?: string
  /** Metadados extras para o frontend */
  meta?: Record<string, unknown>
}

// ─── Motor principal ──────────────────────────────────────────

/**
 * Busca todos os alertas ativos para uma confeitaria.
 * Retorna no máximo ~10 alertas, ordenados por prioridade.
 */
export async function buscarAlertas(confeitariaId: string): Promise<Alerta[]> {
  const supabase = createSupabaseServiceClient()
  const alertas: Alerta[] = []
  const hoje = new Date()
  const hojeISO = hoje.toISOString().split('T')[0] // YYYY-MM-DD
  const amanhaDate = new Date(hoje)
  amanhaDate.setDate(amanhaDate.getDate() + 1)
  const amanhaISO = amanhaDate.toISOString().split('T')[0]

  // ── 1. Pedidos para hoje / amanhã ─────────────────────────
  await (async () => {
    const { data: pedidosHoje } = await supabase
      .from('pedidos')
      .select('id, cliente_nome, data_entrega, status')
      .eq('confeitaria_id', confeitariaId)
      .in('status', ['novo', 'confirmado', 'producao', 'pronto'])
      .gte('data_entrega', hojeISO)
      .lte('data_entrega', amanhaISO + 'T23:59:59')

    if (pedidosHoje && pedidosHoje.length > 0) {
      const paraHoje = pedidosHoje.filter(
        (p) => p.data_entrega && p.data_entrega.startsWith(hojeISO)
      )
      const paraAmanha = pedidosHoje.filter(
        (p) => p.data_entrega && p.data_entrega.startsWith(amanhaISO)
      )

      if (paraHoje.length > 0) {
        alertas.push({
          tipo: 'pedidos_hoje',
          prioridade: 'alta',
          titulo: `${paraHoje.length} pedido${paraHoje.length > 1 ? 's' : ''} para entregar hoje`,
          mensagem: paraHoje
            .slice(0, 3)
            .map((p) => p.cliente_nome)
            .join(', ') + (paraHoje.length > 3 ? ` e mais ${paraHoje.length - 3}` : ''),
          acao_url: '/pedidos',
          acao_label: 'Ver pedidos',
          meta: { count: paraHoje.length },
        })
      }

      if (paraAmanha.length > 0) {
        alertas.push({
          tipo: 'pedidos_hoje',
          prioridade: 'media',
          titulo: `${paraAmanha.length} pedido${paraAmanha.length > 1 ? 's' : ''} para amanhã`,
          mensagem: paraAmanha
            .slice(0, 3)
            .map((p) => p.cliente_nome)
            .join(', ') + (paraAmanha.length > 3 ? ` e mais ${paraAmanha.length - 3}` : ''),
          acao_url: '/pedidos',
          acao_label: 'Ver pedidos',
          meta: { count: paraAmanha.length },
        })
      }
    }
  })()

  // ── 2. Produção pendente ──────────────────────────────────
  await (async () => {
    const { data: lotesPendentes } = await supabase
      .from('producao_lotes')
      .select('id, nome_produto, data_producao, status')
      .eq('confeitaria_id', confeitariaId)
      .in('status', ['planejado'])
      .lte('data_producao', amanhaISO)

    if (lotesPendentes && lotesPendentes.length > 0) {
      alertas.push({
        tipo: 'producao_pendente',
        prioridade: 'alta',
        titulo: `${lotesPendentes.length} lote${lotesPendentes.length > 1 ? 's' : ''} precisa${lotesPendentes.length > 1 ? 'm' : ''} ser iniciado${lotesPendentes.length > 1 ? 's' : ''}`,
        mensagem: lotesPendentes
          .slice(0, 3)
          .map((l) => l.nome_produto)
          .join(', '),
        acao_url: '/producao',
        acao_label: 'Ver produção',
        meta: { count: lotesPendentes.length },
      })
    }
  })()

  // ── 3. Produtos com preço desatualizado ───────────────────
  await (async () => {
    const { data: produtosDesatualizados, count } = await supabase
      .from('produtos')
      .select('id, nome', { count: 'exact' })
      .eq('confeitaria_id', confeitariaId)
      .eq('preco_desatualizado', true)
      .eq('ativo', true)
      .limit(5)

    if (produtosDesatualizados && count && count > 0) {
      alertas.push({
        tipo: 'preco_desatualizado',
        prioridade: 'media',
        titulo: `${count} produto${count > 1 ? 's' : ''} com preço possivelmente desatualizado`,
        mensagem: `O custo de ingredientes mudou. Revise os preços de venda de: ${produtosDesatualizados.map((p) => p.nome).join(', ')}`,
        acao_url: '/financeiro/precificacao',
        acao_label: 'Revisar preços',
        meta: { count, nomes: produtosDesatualizados.map((p) => p.nome) },
      })
    }
  })()

  // ── 4. Clientes inativos (> 30 dias sem comprar) ──────────
  await (async () => {
    const trintaDiasAtras = new Date(hoje)
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
    const trintaDiasISO = trintaDiasAtras.toISOString().split('T')[0]

    const { data: clientesInativos, count } = await supabase
      .from('clientes')
      .select('id, nome, ultima_compra', { count: 'exact' })
      .eq('confeitaria_id', confeitariaId)
      .lt('ultima_compra', trintaDiasISO)
      .gt('total_pedidos', 0)
      .order('ultima_compra', { ascending: true })
      .limit(3)

    if (clientesInativos && count && count > 0) {
      alertas.push({
        tipo: 'cliente_inativo',
        prioridade: 'baixa',
        titulo: `${count} cliente${count > 1 ? 's' : ''} não compra${count > 1 ? 'm' : ''} há mais de 30 dias`,
        mensagem: clientesInativos
          .map((c) => {
            const dias = Math.round(
              (hoje.getTime() - new Date(c.ultima_compra!).getTime()) / 86400000
            )
            return `${c.nome} (${dias} dias)`
          })
          .join(', '),
        acao_url: '/financeiro/clientes',
        acao_label: 'Ver clientes',
        meta: { count },
      })
    }
  })()

  // ── 5. Limite do plano ────────────────────────────────────
  await (async () => {
    const { data: confeitaria } = await supabase
      .from('confeitarias')
      .select('plano, pedidos_mes_atual, cronogramas_ia_mes_atual')
      .eq('id', confeitariaId)
      .single()

    if (confeitaria) {
      const plano = confeitaria.plano as PlanoTipo
      const limites = LIMITES_PLANO[plano]
      const pedidosMes = confeitaria.pedidos_mes_atual ?? 0
      const limitePedidos = limites.pedidos_mes

      if (limitePedidos !== Infinity) {
        const pct = (pedidosMes / limitePedidos) * 100
        if (pct >= 80) {
          alertas.push({
            tipo: 'limite_plano',
            prioridade: pct >= 100 ? 'alta' : 'media',
            titulo:
              pct >= 100
                ? `Limite de pedidos atingido (${pedidosMes}/${limitePedidos})`
                : `Você usou ${pedidosMes} dos ${limitePedidos} pedidos do plano ${plano}`,
            mensagem:
              pct >= 100
                ? 'Faça upgrade para continuar criando pedidos este mês.'
                : 'Considere fazer upgrade antes de atingir o limite.',
            acao_url: '/configuracoes/plano',
            acao_label: 'Ver planos',
            meta: { pedidosMes, limitePedidos, pct: Math.round(pct) },
          })
        }
      }
    }
  })()

  // ── 6. Comparativo mensal ─────────────────────────────────
  await (async () => {
    const mesAtual = hoje.toISOString().slice(0, 7) // YYYY-MM
    const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const mesAnterior = mesAnteriorDate.toISOString().slice(0, 7)

    const { data: resumos } = await supabase
      .from('resumo_financeiro_mensal')
      .select('mes, total_receitas')
      .eq('confeitaria_id', confeitariaId)
      .in('mes', [`${mesAtual}-01`, `${mesAnterior}-01`])

    if (resumos && resumos.length === 2) {
      const atual = resumos.find((r) => r.mes?.startsWith(mesAtual))
      const anterior = resumos.find((r) => r.mes?.startsWith(mesAnterior))

      if (atual && anterior && anterior.total_receitas > 0) {
        const variacao = ((atual.total_receitas - anterior.total_receitas) / anterior.total_receitas) * 100

        alertas.push({
          tipo: 'comparativo_mensal',
          prioridade: 'baixa',
          titulo: variacao >= 0
            ? `Faturamento ${Math.round(variacao)}% acima do mês passado 📈`
            : `Faturamento ${Math.abs(Math.round(variacao))}% abaixo do mês passado 📉`,
          mensagem: `Mês passado: R$${anterior.total_receitas.toFixed(2)}. Mês atual até agora: R$${atual.total_receitas.toFixed(2)}.`,
          acao_url: '/financeiro',
          acao_label: 'Ver financeiro',
          meta: { variacao: Math.round(variacao), atual: atual.total_receitas, anterior: anterior.total_receitas },
        })
      }
    }
  })()

  // ── 7. Pico sazonal próximo ───────────────────────────────
  ;(() => {
    const picos = picosProximos(30, hoje)
    for (const pico of picos.slice(0, 1)) {
      if (pico.diasRestantes > 0 && pico.diasRestantes <= 30) {
        alertas.push({
          tipo: 'pico_sazonal',
          prioridade: pico.diasRestantes <= 7 ? 'alta' : 'media',
          titulo: `${pico.diasRestantes} dias para ${pico.nome}`,
          mensagem: picoMensagem(pico),
          acao_url: '/producao/planejamento',
          acao_label: 'Planejar produção',
          meta: { chave: pico.chave, diasRestantes: pico.diasRestantes },
        })
      }
    }
  })()

  // Ordenar por prioridade: alta > media > baixa
  const prioridadeOrdem: Record<AlertaPrioridade, number> = { alta: 0, media: 1, baixa: 2 }
  alertas.sort((a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade])

  return alertas.slice(0, 10)
}

// ─── Helpers ──────────────────────────────────────────────────

function picoMensagem(pico: InfoPico): string {
  const mensagens: Record<string, string> = {
    pascoa: 'Já definiu quantos ovos e trufas vai produzir? Comece a planejar agora.',
    maes: 'Kits especiais para o Dia das Mães costumam ter alta demanda. Monte suas opções!',
    namorados: 'Cestas e kits românticos são populares. Planeje seu cardápio especial.',
    junina: 'Doces juninos como paçoca e pé-de-moleque podem ser destaque. Planeje!',
    criancas: 'Doces temáticos e kits infantis são sucesso. Prepare seu estoque!',
    natal: 'Panetones, cestas natalinas e trufas natalinas. Comece a pré-venda.',
    ano_novo: 'Doces para confraternizações e festas. Finalize suas encomendas.',
  }
  return mensagens[pico.chave] ?? `Período de alta demanda se aproxima. Planeje sua produção com antecedência.`
}
