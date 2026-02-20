import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [pedidosRes, receitasRes, despesasRes] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, cliente_nome, valor, status, data_entrega, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('transacoes')
      .select('valor')
      .eq('user_id', user.id)
      .eq('tipo', 'receita')
      .gte('data', mesInicio)
      .lte('data', mesFim),

    supabase
      .from('transacoes')
      .select('valor')
      .eq('user_id', user.id)
      .eq('tipo', 'despesa')
      .gte('data', mesInicio)
      .lte('data', mesFim),
  ])

  const pedidos = pedidosRes.data ?? []
  const receitas = receitasRes.data ?? []
  const despesas = despesasRes.data ?? []

  const receitaMes = receitas.reduce((sum, t) => sum + t.valor, 0)
  const despesaMes = despesas.reduce((sum, t) => sum + t.valor, 0)

  return NextResponse.json({
    totalPedidos: pedidos.length,
    pedidosPendentes: pedidos.filter((p) => p.status === 'pendente').length,
    pedidosEmProducao: pedidos.filter((p) => p.status === 'em_producao').length,
    receitaMes,
    despesaMes,
    lucroMes: receitaMes - despesaMes,
    pedidosRecentes: pedidos.slice(0, 5),
  })
}
