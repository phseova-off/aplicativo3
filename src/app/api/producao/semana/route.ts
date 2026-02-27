import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * GET /api/producao/semana?inicio=YYYY-MM-DD
 * Retorna agrupamento semanal: pedidos por dia + estimativa de tempo.
 * Revalidate a cada 10 minutos.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const inicioParam = searchParams.get('inicio')

  // Default: semana atual (segunda-feira)
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana
  const segundaFeira = new Date(hoje)
  segundaFeira.setDate(hoje.getDate() + diff)
  segundaFeira.setHours(0, 0, 0, 0)

  const inicio = inicioParam ?? segundaFeira.toISOString().split('T')[0]
  const fimDate = new Date(inicio)
  fimDate.setDate(fimDate.getDate() + 6)
  const fim = fimDate.toISOString().split('T')[0]

  // Pedidos na semana (status que ainda precisam ser produzidos)
  const { data: pedidos, error: pedidosError } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('confeiteiro_id', user.id)
    .in('status', ['confirmado', 'producao'])
    .gte('data_entrega', inicio)
    .lte('data_entrega', fim)
    .order('data_entrega', { ascending: true, nullsFirst: false })

  if (pedidosError) return NextResponse.json({ error: pedidosError.message }, { status: 500 })

  // Produtos para estimativas de tempo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: produtos } = await (supabase as any)
    .from('produtos')
    .select('id, nome, tempo_producao_minutos, rendimento')
    .eq('confeiteiro_id', user.id) as {
      data: Array<{ id: string; nome: string; tempo_producao_minutos: number | null; rendimento: number | null }> | null
    }

  const produtoMap = new Map((produtos ?? []).map((p) => [p.id, p]))

  // Construir dias da semana
  const dias: Array<{
    data: string
    pedidos: typeof pedidos
    total_pedidos: number
    total_valor: number
    tempo_estimado_minutos: number
    sobrecarregado: boolean
    agrupamento_produtos: Array<{ nome: string; quantidade: number; produto_id: string | null }>
  }> = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]

    const dayPedidos = (pedidos ?? []).filter((p) =>
      p.data_entrega?.startsWith(iso)
    )

    // Agrupamento de produtos (para otimizar produção em lote)
    const prodMap = new Map<string, { nome: string; quantidade: number; produto_id: string | null }>()
    dayPedidos.forEach((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(p.itens_pedido ?? []).forEach((item: any) => {
        const key = item.produto_id ?? item.nome_produto
        if (prodMap.has(key)) {
          prodMap.get(key)!.quantidade += item.quantidade
        } else {
          prodMap.set(key, {
            nome: item.nome_produto,
            quantidade: item.quantidade,
            produto_id: item.produto_id,
          })
        }
      })
    })
    const agrupamento = Array.from(prodMap.values()).sort((a, b) => b.quantidade - a.quantidade)

    // Estimativa de tempo total para o dia
    let tempoEstimadoMinutos = 0
    dayPedidos.forEach((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(p.itens_pedido ?? []).forEach((item: any) => {
        if (item.produto_id) {
          const prod = produtoMap.get(item.produto_id)
          if (prod?.tempo_producao_minutos && prod.rendimento) {
            // tempo total = (quantidade / rendimento) * tempo_producao
            tempoEstimadoMinutos += (item.quantidade / prod.rendimento) * prod.tempo_producao_minutos
          }
        }
      })
    })
    tempoEstimadoMinutos = Math.round(tempoEstimadoMinutos)

    dias.push({
      data: iso,
      pedidos: dayPedidos,
      total_pedidos: dayPedidos.length,
      total_valor: dayPedidos.reduce((s, p) => s + (p.valor_total ?? 0), 0),
      tempo_estimado_minutos: tempoEstimadoMinutos,
      sobrecarregado: tempoEstimadoMinutos > 360, // > 6 horas
      agrupamento_produtos: agrupamento,
    })
  }

  return NextResponse.json(
    { inicio, fim, dias },
    { headers: { 'Cache-Control': 'private, max-age=600' } } // 10 min
  )
}
