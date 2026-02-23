import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/** GET /api/produtos?q=&limit= — lista produtos ativos (para autocomplete) */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  let query = supabase
    .from('produtos')
    .select('id, nome, descricao, preco, categoria, foto_url, ativo')
    .eq('confeiteiro_id', user.id)
    .eq('ativo', true)
    .order('nome')
    .limit(limit)

  if (q) query = query.ilike('nome', `%${q}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
