import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'
import { generateMarketingSchedule } from '@/server/services/openaiService'

const gerarSchema = z.object({
  tipo_negocio: z.string().min(1),
  publico_alvo: z.string().min(1),
  periodo_dias: z.number().int().min(7).max(30),
  foco: z.string().min(1),
  // Mês/ano para o cronograma (padrão: mês corrente)
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2024).optional(),
})

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('cronogramas_marketing')
    .select('*')
    .eq('confeiteiro_id', user.id)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 gerações por dia
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('cronogramas_marketing')
    .select('*', { count: 'exact', head: true })
    .eq('confeiteiro_id', user.id)
    .gte('created_at', `${today}T00:00:00Z`)

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

  const now = new Date()
  const mes = parsed.data.mes ?? (now.getMonth() + 1)
  const ano = parsed.data.ano ?? now.getFullYear()

  const { data: confeiteiro } = await supabase
    .from('confeiteiros')
    .select('nome')
    .eq('id', user.id)
    .single()

  const posts = await generateMarketingSchedule({
    tipo_negocio: parsed.data.tipo_negocio,
    publico_alvo: parsed.data.publico_alvo,
    periodo_dias: parsed.data.periodo_dias,
    foco: parsed.data.foco,
    nome_negocio: confeiteiro?.nome ?? undefined,
  })

  // UPSERT: se já existe cronograma para esse mês/ano, substitui o conteúdo
  const { data: saved, error } = await supabase
    .from('cronogramas_marketing')
    .upsert(
      {
        confeiteiro_id: user.id,
        mes,
        ano,
        conteudo: posts,
        datas_comemorativas: [],
      },
      { onConflict: 'confeiteiro_id,mes,ano' }
    )
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
    .from('cronogramas_marketing')
    .delete()
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
