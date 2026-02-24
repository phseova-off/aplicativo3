import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/** GET /api/produtos?q=&limit=&full=true — lista produtos */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const full = searchParams.get('full') === 'true'

  const selectCols = full
    ? 'id, nome, descricao, preco, preco_venda, custo, custo_calculado, rendimento, tempo_producao_minutos, categoria, foto_url, ativo, preco_desatualizado'
    : 'id, nome, descricao, preco, categoria, foto_url, ativo'

  let query = supabase
    .from('produtos')
    .select(selectCols)
    .eq('confeiteiro_id', user.id)
    .eq('ativo', true)
    .order('nome')
    .limit(limit)

  if (q) query = query.ilike('nome', `%${q}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

/** PATCH /api/produtos — atualiza preço de venda de um produto */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, preco_venda } = body as { id: string; preco_venda: number }

  if (!id || typeof preco_venda !== 'number' || preco_venda < 0) {
    return NextResponse.json({ error: 'id e preco_venda são obrigatórios' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('produtos')
    .update({ preco_venda, preco: preco_venda, preco_desatualizado: false })
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select('id, nome, preco_venda')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
