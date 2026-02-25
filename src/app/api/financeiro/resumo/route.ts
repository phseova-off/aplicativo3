import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes') // YYYY-MM

  if (!mes) return NextResponse.json({ error: 'Parâmetro mes obrigatório' }, { status: 400 })

  const [ano, m] = mes.split('-').map(Number)
  const inicio = `${String(ano)}-${String(m).padStart(2, '0')}-01`
  const fim = new Date(ano, m, 0).toISOString().split('T')[0] // last day of month

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transacoes, error } = await (supabase as any)
    .from('transacoes')
    .select('tipo, valor, categoria')
    .eq('confeiteiro_id', user.id)
    .gte('data', inicio)
    .lte('data', fim) as { data: { tipo: string; valor: number; categoria: string }[] | null; error: Error | null }

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 })

  const ts = transacoes ?? []
  const receitas = ts.filter((t) => t.tipo === 'receita').reduce((s, t) => s + (t.valor ?? 0), 0)
  const despesas = ts.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + (t.valor ?? 0), 0)

  // Despesas por categoria (for pie chart)
  const despesasPorCategoria: Record<string, number> = {}
  for (const t of ts.filter((t) => t.tipo === 'despesa')) {
    despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] ?? 0) + (t.valor ?? 0)
  }

  return NextResponse.json({
    receitas,
    despesas,
    lucroLiquido: receitas - despesas,
    qtdReceitas: ts.filter((t) => t.tipo === 'receita').length,
    qtdDespesas: ts.filter((t) => t.tipo === 'despesa').length,
    despesasPorCategoria,
  })
}
