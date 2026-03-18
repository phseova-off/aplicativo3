// ============================================================
// GET /api/dashboard/alertas
// Retorna alertas de negócio ativos para a confeitaria do usuário.
// ============================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { buscarAlertas } from '@/server/services/alertas'
import { handleApiError } from '@/server/middleware/errorHandler'

export const revalidate = 60 // 1 minuto — alertas mudam com frequência

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
      return NextResponse.json({ data: [], error: null, status: 200 })
    }

    const alertas = await buscarAlertas(membro.confeitaria_id)

    return NextResponse.json({
      data: alertas,
      error: null,
      status: 200,
    })
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'GET /api/dashboard/alertas')
    return NextResponse.json(body, { status })
  }
}
