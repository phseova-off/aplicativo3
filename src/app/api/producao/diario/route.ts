import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

/** Pedidos confirmados ou em produção, ordenados por data de entrega */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pedidos')
    .select('*, itens_pedido(*)')
    .eq('confeiteiro_id', user.id)
    .in('status', ['confirmado', 'producao'])
    .order('data_entrega', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
