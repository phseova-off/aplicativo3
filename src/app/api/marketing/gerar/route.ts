import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'
import { generateMarketingSchedule } from '@/server/services/openaiService'

const gerarSchema = z.object({
  tipo_negocio: z.string().min(1),
  publico_alvo: z.string().min(1),
  periodo_dias: z.number().int().min(7).max(30),
  foco: z.string().min(1),
})

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('marketing_cronogramas')
    .select('*')
    .eq('user_id', user.id)
    .order('gerado_em', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 per day
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('marketing_cronogramas')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('gerado_em', `${today}T00:00:00Z`)

  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Limite diário de 5 cronogramas atingido. Tente novamente amanhã.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const parsed = gerarSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_negocio')
    .eq('id', user.id)
    .single()

  const posts = await generateMarketingSchedule({
    ...parsed.data,
    nome_negocio: profile?.nome_negocio ?? undefined,
  })

  const titulo = `${parsed.data.tipo_negocio} — ${parsed.data.foco} (${parsed.data.periodo_dias} dias)`

  const { data: saved, error } = await supabase
    .from('marketing_cronogramas')
    .insert({
      user_id: user.id,
      titulo,
      conteudo: posts,
    })
    .select()
    .single()

  if (error || !saved) {
    return NextResponse.json({ error: 'Erro ao salvar cronograma' }, { status: 500 })
  }

  return NextResponse.json(saved, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabase
    .from('marketing_cronogramas')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
