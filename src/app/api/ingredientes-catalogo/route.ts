import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * GET /api/ingredientes-catalogo?q=
 * Busca ingredientes do catálogo para autocomplete na FichaTecnica.
 * Retorna id, nome, unidade, preco_atual.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('ingredientes_catalogo')
    .select('id, nome, unidade, preco_atual, fornecedor')
    .eq('confeiteiro_id', user.id)
    .order('nome')
    .limit(limit)

  if (q) {
    query = query.ilike('nome', `%${q}%`)
  }

  const { data, error } = await query as {
    data: Array<{ id: string; nome: string; unidade: string; preco_atual: number; fornecedor: string | null }> | null
    error: Error | null
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/ingredientes-catalogo
 * Cria um novo ingrediente no catálogo.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nome, unidade, preco_atual, fornecedor } = body

  if (!nome || !preco_atual) {
    return NextResponse.json({ error: 'Nome e preço são obrigatórios' }, { status: 422 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ingredientes_catalogo')
    .insert({
      confeiteiro_id: user.id,
      nome,
      unidade: unidade ?? 'g',
      preco_atual,
      fornecedor: fornecedor ?? null,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: Error | null }

  if (error) {
    if (error.message?.includes('ingredientes_nome_unico')) {
      return NextResponse.json({ error: 'Já existe um ingrediente com este nome' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
