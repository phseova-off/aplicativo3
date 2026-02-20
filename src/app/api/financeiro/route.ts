import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'

const transacaoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  categoria: z.string().min(1),
  valor: z.number().positive(),
  descricao: z.string().optional(),
  data: z.string().min(1),
  pedido_id: z.string().uuid().optional().nullable(),
})

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes') // YYYY-MM
  const tipo = searchParams.get('tipo')

  let query = supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: false })

  if (mes) {
    query = query.gte('data', `${mes}-01`).lte('data', `${mes}-31`)
  }

  if (tipo === 'receita' || tipo === 'despesa') {
    query = query.eq('tipo', tipo)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = transacaoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('transacoes')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
