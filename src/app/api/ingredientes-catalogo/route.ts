import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * GET /api/ingredientes-catalogo?q=&modo=catalogo
 *
 * modo=autocomplete (default): busca para FichaTecnica — id, nome, unidade, preco_atual, fornecedor
 * modo=catalogo: lista completa para página de gerenciamento — inclui preco_anterior, preco_updated_at,
 *   observacoes, created_at + contagem de produtos vinculados
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const modo = searchParams.get('modo') ?? 'autocomplete'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (modo === 'catalogo') {
    // Full catalog with product count
    let query = db
      .from('ingredientes_catalogo')
      .select('id, nome, unidade, preco_atual, preco_anterior, preco_updated_at, fornecedor, observacoes, created_at')
      .eq('confeiteiro_id', user.id)
      .order('nome')
      .limit(limit)

    if (q) query = query.ilike('nome', `%${q}%`)

    const { data: ingredientes, error } = await query as {
      data: Array<{
        id: string; nome: string; unidade: string
        preco_atual: number; preco_anterior: number | null; preco_updated_at: string | null
        fornecedor: string | null; observacoes: string | null; created_at: string
      }> | null
      error: Error | null
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Count products per ingredient via join table
    const ids = (ingredientes ?? []).map((i) => i.id)
    const countMap: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: counts } = await db
        .from('produtos_ingredientes')
        .select('ingrediente_id')
        .in('ingrediente_id', ids) as { data: Array<{ ingrediente_id: string }> | null }

      for (const c of counts ?? []) {
        countMap[c.ingrediente_id] = (countMap[c.ingrediente_id] ?? 0) + 1
      }
    }

    const result = (ingredientes ?? []).map((i) => ({
      ...i,
      produtos_count: countMap[i.id] ?? 0,
    }))

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  }

  // Autocomplete mode (original behaviour)
  let query = db
    .from('ingredientes_catalogo')
    .select('id, nome, unidade, preco_atual, fornecedor')
    .eq('confeiteiro_id', user.id)
    .order('nome')
    .limit(Math.min(limit, 50))

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
