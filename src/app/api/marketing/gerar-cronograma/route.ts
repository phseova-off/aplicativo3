import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { cronogramaInputSchema } from '@/features/marketing/schemas/marketing.schema'
import { generateCronogramaMarketing } from '@/server/services/openaiService'
import { assertPodeCronogramaIA } from '@/server/lib/planos'
import { handleApiError } from '@/server/middleware/errorHandler'
import type { PlanoTipo } from '@/server/db/types'

// ─── POST /api/marketing/gerar-cronograma ─────────────────────
// Verifica autenticação → confeitaria (v2) → plano → gera com IA
// → salva no banco → incrementa contador mensal.

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 1. Look up confeitaria via v2 membership table ───────────
  const { data: membro } = await supabase
    .from('confeitaria_membros')
    .select(`
      confeitaria_id,
      confeitarias (
        id,
        nome,
        plano,
        cronogramas_ia_mes_atual,
        mes_referencia
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confeitaria = (membro as any)?.confeitarias as {
    id: string
    nome: string | null
    plano: PlanoTipo
    cronogramas_ia_mes_atual: number
    mes_referencia: string | null
  } | null

  if (!confeitaria) {
    return NextResponse.json({ error: 'Confeitaria não encontrada' }, { status: 404 })
  }

  const confeitariaId = confeitaria.id

  // ── 2. Reset monthly counter if it's a new month ─────────────
  const hoje     = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  let cronogramasMes = confeitaria.cronogramas_ia_mes_atual

  if (confeitaria.mes_referencia !== mesAtual) {
    await supabase
      .from('confeitarias')
      .update({ cronogramas_ia_mes_atual: 0, mes_referencia: mesAtual })
      .eq('id', confeitariaId)
    cronogramasMes = 0
  }

  // ── 3. Enforce plan limit ─────────────────────────────────────
  try {
    assertPodeCronogramaIA(confeitaria.plano, cronogramasMes)
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'gerar-cronograma-plan')
    return NextResponse.json(body, { status })
  }

  // ── 4. Parse + validate request body ─────────────────────────
  const raw = await request.json()
  const parsed = cronogramaInputSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { mes, ano, datas_especiais, produtos } = parsed.data

  // ── 5. Call OpenAI ────────────────────────────────────────────
  let posts
  try {
    posts = await generateCronogramaMarketing({
      mes,
      ano,
      nome_negocio: confeitaria.nome ?? 'Minha Doceria',
      datas_especiais,
      produtos,
    })
  } catch (err) {
    console.error('[gerar-cronograma] OpenAI error', err)
    return NextResponse.json(
      { error: 'Erro ao gerar cronograma com IA. Tente novamente em instantes.' },
      { status: 502 }
    )
  }

  // ── 6. Upsert to DB (one cronograma per confeiteiro/mes/ano) ─
  const { data: saved, error: dbError } = await supabase
    .from('cronogramas_marketing')
    .upsert(
      {
        confeiteiro_id:      user.id,
        confeitaria_id:      confeitariaId,
        mes,
        ano,
        conteudo:            posts,
        datas_comemorativas: datas_especiais.map((d) => ({ data: d.data, nome: d.nome })),
        tokens_usados:       posts.length * 500, // conservative estimate
      },
      { onConflict: 'confeiteiro_id,mes,ano' }
    )
    .select()
    .single()

  if (dbError || !saved) {
    console.error('[gerar-cronograma] DB error', dbError)
    return NextResponse.json({ error: 'Erro ao salvar cronograma' }, { status: 500 })
  }

  // ── 7. Increment monthly usage counter ───────────────────────
  await supabase
    .from('confeitarias')
    .update({ cronogramas_ia_mes_atual: cronogramasMes + 1 })
    .eq('id', confeitariaId)

  return NextResponse.json(saved, { status: 201 })
}

// ─── GET /api/marketing/gerar-cronograma?mes=M&ano=A ─────────
// Retorna cronograma(s) salvos do usuário para o mês/ano.

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const { data, error } = await query
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
