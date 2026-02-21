import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { pedidoSchema } from '@/features/pedidos/schemas/pedido.schema'
import type { PedidoCanal, PedidoStatus } from '@/server/db/types'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const canal = searchParams.get('canal') as PedidoCanal | null
  const status = searchParams.get('status') as PedidoStatus | null
  const data_inicio = searchParams.get('data_inicio')
  const data_fim = searchParams.get('data_fim')

  let query = supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('confeiteiro_id', user.id)
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('cliente_nome', `%${search}%`)
  if (canal) query = query.eq('canal', canal)
  if (status) query = query.eq('status', status)
  if (data_inicio) query = query.gte('data_entrega', data_inicio)
  if (data_fim) query = query.lte('data_entrega', data_fim)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    .insert({ ...pedidoData, confeiteiro_id: user.id })
    .select()
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
  }

  if (itens && itens.length > 0) {
    await supabase
      .from('itens_pedido')
      .insert(itens.map((item) => ({ ...item, pedido_id: pedido.id })))
  }

  const { data: full } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('id', pedido.id)
    .single()

  return NextResponse.json(full, { status: 201 })
}
