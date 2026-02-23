import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/producao/lotes/[id]/iniciar
 * Muda o status do lote de 'planejado' para 'em_andamento'.
 * Valida que o lote está no estado correto antes de prosseguir.
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lote, error: fetchError } = await (supabase as any)
    .from('producao_lotes')
    .select('id, status, confeiteiro_id')
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .single() as { data: { id: string; status: string; confeiteiro_id: string } | null; error: Error | null }

  if (fetchError || !lote) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
  }

  if (lote.status !== 'planejado') {
    return NextResponse.json(
      { error: `Lote não pode ser iniciado. Status atual: ${lote.status}` },
      { status: 409 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase as any)
    .from('producao_lotes')
    .update({ status: 'em_andamento', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single() as { data: Record<string, unknown> | null; error: Error | null }

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Erro ao iniciar lote' }, { status: 500 })
  }

  return NextResponse.json(updated)
}
