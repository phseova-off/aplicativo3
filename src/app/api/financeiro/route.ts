import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'

const transacaoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  categoria: z.string().min(1),
  valor: z.number().positive(),
  descricao: z.string().optional().nullable(),
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
  const categoria = searchParams.get('categoria')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = (page - 1) * limit

  let query = supabase
    .from('transacoes')
    .select('*', { count: 'exact' })
    .eq('confeiteiro_id', user.id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (mes) {
    const [ano, m] = mes.split('-')
    const mesNum = parseInt(m, 10)
    const anoNum = parseInt(ano, 10)
    const inicio = `${ano}-${m}-01`
    const proximoMes = mesNum === 12
      ? `${anoNum + 1}-01-01`
      : `${anoNum}-${String(mesNum + 1).padStart(2, '0')}-01`
    query = query.gte('data', inicio).lt('data', proximoMes)
  }

  if (tipo === 'receita' || tipo === 'despesa') {
    query = query.eq('tipo', tipo)
  }

  if (categoria) {
    query = query.eq('categoria', categoria)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
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
    .insert({
      ...parsed.data,
      confeiteiro_id: user.id,
    })
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
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
