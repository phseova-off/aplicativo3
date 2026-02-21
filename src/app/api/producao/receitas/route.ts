import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { receitaSchema } from '@/features/producao/schemas/producao.schema'
import type { Ingrediente } from '@/server/db/types'

function calcularCusto(ingredientes: Ingrediente[]): number {
  return ingredientes.reduce(
    (sum, ing) => sum + ing.quantidade * ing.custo_unitario,
    0
  )
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('confeiteiro_id', user.id)
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const receitas = (data ?? []).map((p) => {
    const custo_calculado = calcularCusto(p.ingredientes ?? [])
    return {
      ...p,
      custo_calculado,
      margem_percentual: p.preco > 0
        ? Math.round(((p.preco - custo_calculado) / p.preco) * 100)
        : 0,
    }
  })

  return NextResponse.json(receitas)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = receitaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  // Sync custo from ingredientes
  const custo_calculado = calcularCusto(parsed.data.ingredientes ?? [])

  const { data, error } = await supabase
    .from('produtos')
    .insert({
      ...parsed.data,
      confeiteiro_id: user.id,
      custo: custo_calculado,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    custo_calculado,
    margem_percentual: data.preco > 0
      ? Math.round(((data.preco - custo_calculado) / data.preco) * 100)
      : 0,
  }, { status: 201 })
}
