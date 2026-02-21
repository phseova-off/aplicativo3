import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/** GET /api/producao/lotes?semana=YYYY-MM-DD (segunda da semana) */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const semana = searchParams.get('semana')

  let query = supabase
    .from('producao_lotes')
    .select('*')
    .eq('confeiteiro_id', user.id)
    .order('data_producao', { ascending: true })

  if (semana) {
    // Filter to 7 days starting from semana date
    const inicio = semana
    const fim = new Date(semana)
    fim.setDate(fim.getDate() + 6)
    query = query
      .gte('data_producao', inicio)
      .lte('data_producao', fim.toISOString().split('T')[0])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate progresso
  const lotes = (data ?? []).map((l) => ({
    ...l,
    progresso: l.quantidade_planejada > 0
      ? Math.round((l.quantidade_produzida / l.quantidade_planejada) * 100)
      : 0,
  }))

  return NextResponse.json(lotes)
}

/** POST /api/producao/lotes — criar lote manual */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('producao_lotes')
    .insert({ ...body, confeiteiro_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
