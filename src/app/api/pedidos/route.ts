import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { pedidoSchema } from '@/features/pedidos/schemas/pedido.schema'
import { assertPodeCriarPedido } from '@/server/lib/planos'
import { handleApiError } from '@/server/middleware/errorHandler'
import type { PedidoCanal, PedidoStatus, PlanoTipo } from '@/server/db/types'

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
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '100', 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('confeiteiro_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

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
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Plan limit check (v2 schema) ──────────────────────────
    const { data: membro } = await supabase
      .from('confeitaria_membros')
      .select('confeitarias(plano, pedidos_mes_atual)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confeitaria = (membro as any)?.confeitarias
    const plano: PlanoTipo = confeitaria?.plano ?? 'free'
    const pedidosMesAtual: number = confeitaria?.pedidos_mes_atual ?? 0

    assertPodeCriarPedido(plano, pedidosMesAtual)

    // ── Parse & validate body ─────────────────────────────────
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

    // ── Insert itens ──────────────────────────────────────────
    if (itens && itens.length > 0) {
      await supabase
        .from('itens_pedido')
        .insert(itens.map((item) => ({ ...item, pedido_id: pedido.id })))
    }

    // ── Auto-create revenue transaction ──────────────────────
    if ((pedido.valor_total ?? 0) > 0) {
      const dataTransacao = pedido.data_entrega
        ? String(pedido.data_entrega).split('T')[0]
        : new Date().toISOString().split('T')[0]

      await supabase.from('transacoes').insert({
        confeiteiro_id: user.id,
        tipo:       'receita',
        categoria:  'pedido',
        valor:      pedido.valor_total,
        descricao:  `Pedido #${pedido.id.slice(0, 8)} — ${pedido.cliente_nome}`,
        data:       dataTransacao,
        pedido_id:  pedido.id,
      })
    }

    const { data: full } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .eq('id', pedido.id)
      .single()

    return NextResponse.json(full, { status: 201 })
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'POST /api/pedidos')
    return NextResponse.json(body, { status })
  }
}
