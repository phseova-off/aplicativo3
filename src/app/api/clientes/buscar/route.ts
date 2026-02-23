import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/** GET /api/clientes/buscar?q= — busca clientes existentes por nome (a partir de pedidos históricos) */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  if (q.length < 2) return NextResponse.json([])

  // Busca combinações únicas de nome+telefone em pedidos anteriores
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pedidos')
    .select('cliente_nome, cliente_telefone')
    .eq('confeiteiro_id', user.id)
    .ilike('cliente_nome', `%${q}%`)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })
    .limit(30) as { data: Array<{ cliente_nome: string; cliente_telefone: string | null }> | null; error: Error | null }

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 })

  // Deduplica por nome (mantém telefone mais recente)
  const seen = new Map<string, { nome: string; telefone: string | null }>()
  for (const row of data ?? []) {
    const key = row.cliente_nome.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.set(key, { nome: row.cliente_nome, telefone: row.cliente_telefone })
    }
  }

  return NextResponse.json(Array.from(seen.values()).slice(0, 10))
}
