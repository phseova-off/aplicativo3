import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { loteUpdateSchema } from '@/features/producao/schemas/producao.schema'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = loteUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('producao_lotes')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select()
    .single() as { data: Record<string, unknown> | null; error: Error | null }

  if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  const qtdPlanejada = Number(data.quantidade_planejada ?? 0)
  const qtdProduzida = Number(data.quantidade_produzida ?? 0)
  return NextResponse.json({
    ...data,
    progresso: qtdPlanejada > 0 ? Math.round((qtdProduzida / qtdPlanejada) * 100) : 0,
  })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('producao_lotes')
    .delete()
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
