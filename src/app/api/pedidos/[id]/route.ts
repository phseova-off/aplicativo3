import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { pedidoUpdateSchema } from '@/features/pedidos/schemas/pedido.schema'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = pedidoUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { itens, ...pedidoData } = parsed.data

  // Update main pedido record
  const { data, error } = await supabase
    .from('pedidos')
    .update(pedidoData)
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select('*, itens_pedido(*)')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  // Replace itens if provided
  if (itens !== undefined) {
    await supabase.from('itens_pedido').delete().eq('pedido_id', id)
    if (itens.length > 0) {
      await supabase
        .from('itens_pedido')
        .insert(itens.map((item) => ({ ...item, pedido_id: id })))
    }
    const { data: full } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .eq('id', id)
      .single()
    return NextResponse.json(full)
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
