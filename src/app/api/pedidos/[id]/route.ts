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

  // Fetch current state before update (needed for batch creation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pedidoAntes } = await (supabase as any)
    .from('pedidos')
    .select('status, data_entrega, itens_pedido(*)')
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .single() as { data: { status: string; data_entrega: string | null; itens_pedido: any[] } | null }

  // Update main pedido record
  const { data, error } = await supabase
    .from('pedidos')
    .update(pedidoData)
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select('*, itens_pedido(*)')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  // Auto-create producao_lotes when moving to 'producao'
  const movingToProducao =
    pedidoData.status === 'producao' && pedidoAntes?.status !== 'producao'

  if (movingToProducao) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itensAtuais: any[] = (pedidoAntes as any)?.itens_pedido ?? []

    const grouped = new Map<string, { nome: string; quantidade: number; produto_id: string | null }>()
    for (const item of itensAtuais) {
      const key = item.produto_id ?? item.nome_produto
      const existing = grouped.get(key)
      if (existing) {
        existing.quantidade += item.quantidade
      } else {
        grouped.set(key, {
          nome: item.nome_produto,
          quantidade: item.quantidade,
          produto_id: item.produto_id ?? null,
        })
      }
    }

    if (grouped.size > 0) {
      const dataProducao = pedidoAntes?.data_entrega
        ? pedidoAntes.data_entrega.split('T')[0]
        : new Date().toISOString().split('T')[0]

      const lotes = Array.from(grouped.values()).map((g) => ({
        confeiteiro_id: user.id,
        nome_produto: g.nome,
        quantidade_planejada: g.quantidade,
        quantidade_produzida: 0,
        data_producao: dataProducao,
        custo_total: 0,
        produto_id: g.produto_id,
      }))

      await (supabase as any).from('producao_lotes').insert(lotes)
    }
  }

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

// Soft-delete: marca como cancelado em vez de remover fisicamente
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('pedidos')
    .update({ status: 'cancelado' })
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
