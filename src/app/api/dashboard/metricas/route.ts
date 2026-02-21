import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export const revalidate = 300   // 5 minutes

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const mesIni = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [pedidosRes, receitasRes, despesasRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id,cliente_nome,valor_total,status,data_entrega,created_at,canal')
      .eq('confeiteiro_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('transacoes')
      .select('valor')
      .eq('confeiteiro_id', user.id)
      .eq('tipo', 'receita')
      .gte('data', mesIni)
      .lte('data', mesFim),
    supabase
      .from('transacoes')
      .select('valor')
      .eq('confeiteiro_id', user.id)
      .eq('tipo', 'despesa')
      .gte('data', mesIni)
      .lte('data', mesFim),
  ])

  const pedidos   = pedidosRes.data  ?? []
  const receitas  = receitasRes.data ?? []
  const despesas  = despesasRes.data ?? []

  const receitaMes = receitas.reduce((s, t) => s + (t.valor ?? 0), 0)
  const despesaMes = despesas.reduce((s, t) => s + (t.valor ?? 0), 0)

  return NextResponse.json({
    totalPedidos:      pedidos.length,
    pedidosPendentes:  pedidos.filter((p) => p.status === 'novo' || p.status === 'confirmado').length,
    pedidosEmProducao: pedidos.filter((p) => p.status === 'producao').length,
    receitaMes,
    despesaMes,
    lucroMes: receitaMes - despesaMes,
    pedidosRecentes: pedidos.slice(0, 5).map((p) => ({
      id:           p.id,
      cliente_nome: p.cliente_nome,
      valor_total:  p.valor_total,
      status:       p.status,
      canal:        p.canal,
      data_entrega: p.data_entrega,
      created_at:   p.created_at,
    })),
  })
}
