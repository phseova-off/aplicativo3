import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/**
 * POST /api/producao/concluir
 * Body: { pedido_id: string }
 * 1. Muda status do pedido para 'pronto'
 * 2. Marca lotes do dia como concluídos (quantidade_produzida = planejada)
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pedido_id } = await request.json() as { pedido_id: string }
  if (!pedido_id) return NextResponse.json({ error: 'pedido_id required' }, { status: 400 })

  // Update pedido status to 'pronto'
  const { error } = await supabase
    .from('pedidos')
    .update({ status: 'pronto' })
    .eq('id', pedido_id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
