// ============================================================
// GET /api/dashboard/insight
// Retorna o insight diário IA para a confeitaria do usuário.
// Usa cache de 24h — não chama OpenAI a cada request.
// ============================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { obterInsightDiario } from '@/server/services/insightIA'
import { handleApiError } from '@/server/middleware/errorHandler'

export const revalidate = 3600 // 1 hora — insight muda 1x/dia

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar a confeitaria do usuário
    const { data: membro } = await supabase
      .from('confeitaria_membros')
      .select('confeitaria_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!membro) {
      return NextResponse.json({
        data: {
          texto: 'Bem-vinda ao Doceria Pro! Complete seu cadastro para receber insights personalizados.',
          acao_sugerida: null,
          acao_url: '/onboarding',
          gerado_por: 'fallback' as const,
        },
        error: null,
        status: 200,
      })
    }

    const insight = await obterInsightDiario(membro.confeitaria_id)

    return NextResponse.json({
      data: {
        texto: insight.texto,
        acao_sugerida: insight.acao_sugerida,
        acao_url: insight.acao_url,
        gerado_por: insight.gerado_por,
      },
      error: null,
      status: 200,
    })
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'GET /api/dashboard/insight')
    return NextResponse.json(body, { status })
  }
}
