import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { cronogramaInputSchema } from '@/features/marketing/schemas/marketing.schema'
import { generateCronogramaMarketing } from '@/server/services/openaiService'

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
  const parsed = cronogramaInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { mes, ano, datas_especiais, produtos } = parsed.data

  // Fetch confeiteiro name
  const { data: confeiteiro } = await supabase
    .from('confeiteiros')
    .select('nome')
    .eq('id', user.id)
    .single()

  const posts = await generateCronogramaMarketing({
    mes,
    ano,
    nome_negocio: confeiteiro?.nome ?? 'Minha Doceria',
    datas_especiais,
    produtos,
  })

  // Upsert: one cronograma per confeiteiro/mes/ano
  const { data: saved, error } = await supabase
    .from('cronogramas_marketing')
    .upsert(
      {
        confeiteiro_id: user.id,
        mes,
        ano,
        conteudo: posts,
        datas_comemorativas: datas_especiais.map((d) => ({ data: d.data, nome: d.nome })),
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

/** GET /api/marketing/gerar-cronograma?mes=M&ano=A */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  let query = supabase
    .from('cronogramas_marketing')
    .select('*')
    .eq('confeiteiro_id', user.id)

  if (mes) query = query.eq('mes', parseInt(mes, 10))
  if (ano) query = query.eq('ano', parseInt(ano, 10))

  const { data, error } = await query.order('ano', { ascending: false }).order('mes', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
