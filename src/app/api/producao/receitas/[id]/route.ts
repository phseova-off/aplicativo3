import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { receitaSchema } from '@/features/producao/schemas/producao.schema'
import type { Ingrediente } from '@/server/db/types'

interface Params { params: Promise<{ id: string }> }

function calcularCusto(ingredientes: Ingrediente[]): number {
  return ingredientes.reduce((sum, i) => sum + i.quantidade * i.custo_unitario, 0)
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = receitaSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updateData = { ...parsed.data } as Record<string, unknown>
  if (parsed.data.ingredientes) {
    updateData.custo = calcularCusto(parsed.data.ingredientes as Ingrediente[])
  }

  const { data, error } = await supabase
    .from('produtos')
    .update(updateData)
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  const custo_calculado = calcularCusto(data.ingredientes ?? [])
  return NextResponse.json({
    ...data,
    custo_calculado,
    margem_percentual: data.preco > 0
      ? Math.round(((data.preco - custo_calculado) / data.preco) * 100)
      : 0,
  })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
