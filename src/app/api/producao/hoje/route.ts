import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * GET /api/producao/hoje
 * Retorna lotes de produção para hoje e amanhã, ordenados por urgência.
 * Inclui dados do pedido de origem (cliente, data_entrega, valor_total).
 * Revalidate a cada 2 minutos — dados críticos do dia.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hoje = new Date()
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const hojeStr   = hoje.toISOString().split('T')[0]
  const amanhaStr = amanha.toISOString().split('T')[0]

  // Buscar lotes não finalizados com pedido de origem
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lotes, error } = await (supabase as any)
    .from('producao_lotes')
    .select(`
      *,
      pedido:pedidos(
        id,
        cliente_nome,
        cliente_telefone,
        data_entrega,
        valor_total,
        status,
        observacoes
      )
    `)
    .eq('confeiteiro_id', user.id)
    .in('status', ['planejado', 'em_andamento'])
    .order('data_producao', { ascending: true }) as {
      data: Array<Record<string, unknown>> | null
      error: Error | null
    }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer com campos derivados
  const hoje_lotes = (lotes ?? []).map((l) => {
    const dataProducao = String(l.data_producao ?? '')
    const urgencia = dataProducao <= hojeStr
      ? 'atrasado'
      : dataProducao === amanhaStr
        ? 'amanha'
        : 'futuro'

    const qtdPlanejada = Number(l.quantidade_planejada ?? 0)
    const qtdProduzida = Number(l.quantidade_produzida ?? 0)
    const progresso = qtdPlanejada > 0
      ? Math.min(Math.round((qtdProduzida / qtdPlanejada) * 100), 100)
      : 0

    return { ...l, urgencia, progresso }
  })

  // Ordenar: atrasados → hoje → amanhã → futuro; dentro de cada grupo por data_producao ASC
  const ordemUrgencia: Record<string, number> = { atrasado: 0, amanha: 1, futuro: 2 }
  hoje_lotes.sort((a, b) => {
    const uA = ordemUrgencia[String(a.urgencia)] ?? 99
    const uB = ordemUrgencia[String(b.urgencia)] ?? 99
    if (uA !== uB) return uA - uB
    return String(a.data_producao).localeCompare(String(b.data_producao))
  })

  return NextResponse.json(hoje_lotes, {
    headers: { 'Cache-Control': 'private, max-age=120' }, // 2 min
  })
}
