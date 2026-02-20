import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { pedidoSchema } from '@/features/pedidos/schemas/pedido.schema'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = pedidoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { itens, ...pedidoData } = parsed.data

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({ ...pedidoData, user_id: user.id })
    .select()
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
  }

  // Insert itens if provided
  if (itens && itens.length > 0) {
    await supabase.from('itens_pedido').insert(
      itens.map((item) => ({ ...item, pedido_id: pedido.id }))
    )
  }

  // Fetch with itens
  const { data: full } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('id', pedido.id)
    .single()

  return NextResponse.json(full, { status: 201 })
}
