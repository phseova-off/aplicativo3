import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * POST /api/producao/iniciar
 * Body: { pedido_id: string }
 * 1. Muda status do pedido para 'producao'
 * 2. Cria um lote em producao_lotes para cada item do pedido
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pedido_id } = await request.json() as { pedido_id: string }
  if (!pedido_id) return NextResponse.json({ error: 'pedido_id required' }, { status: 400 })

  // Fetch pedido with items
  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('id', pedido_id)
    .eq('confeiteiro_id', user.id)
    .single()

  if (pedidoErr || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Update pedido status to 'producao'
  const { error: updateErr } = await supabase
    .from('pedidos')
    .update({ status: 'producao' })
    .eq('id', pedido_id)
    .eq('confeiteiro_id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Create one lote per item
  const hoje = new Date().toISOString().split('T')[0]
  const dataProducao = pedido.data_entrega
    ? pedido.data_entrega.split('T')[0]
    : hoje

  const itens = (pedido.itens_pedido as { nome_produto: string; quantidade: number; preco_unitario: number; produto_id: string | null }[]) ?? []

  if (itens.length > 0) {
    const lotes = itens.map((item) => ({
      confeiteiro_id: user.id,
      produto_id: item.produto_id ?? null,
      nome_produto: item.nome_produto,
      quantidade_planejada: item.quantidade,
      quantidade_produzida: 0,
      data_producao: dataProducao,
      custo_total: 0,
      observacoes: `Pedido: ${pedido.cliente_nome}`,
    }))

    const { error: loteErr } = await supabase.from('producao_lotes').insert(lotes)
    if (loteErr) console.error('Erro ao criar lotes:', loteErr.message)
  }

  return NextResponse.json({ ok: true })
}
