import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/server/db/client'
import type { Confeitaria, Produto } from '@/server/db/types'

interface Params {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/cardapio/[slug] — endpoint público (sem auth)
 * Retorna dados da confeitaria + produtos ativos para o cardápio público.
 * Usa o service client para bypass de RLS, mas expõe apenas campos seguros.
 */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
  }

  // Service role para bypass de RLS (dados públicos controlados manualmente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseServiceClient() as any

  const { data: confeitaria, error } = await supabase
    .from('confeitarias')
    .select(
      'id, nome, cidade, telefone, descricao, logo_url, area_entrega, prazo_padrao_dias, horarios_atendimento, menu_publico_ativo, slug'
    )
    .eq('slug', slug)
    .single() as { data: Confeitaria | null; error: Error | null }

  if (error || !confeitaria) {
    return NextResponse.json({ error: 'Cardápio não encontrado' }, { status: 404 })
  }

  if (!confeitaria.menu_publico_ativo) {
    return NextResponse.json({ error: 'Este cardápio não está disponível no momento' }, { status: 403 })
  }

  // Produtos ativos da confeitaria (confeitaria.id === confeiteiro.id por design)
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, descricao, preco, categoria, foto_url')
    .eq('confeiteiro_id', confeitaria.id)
    .eq('ativo', true)
    .order('categoria')
    .order('nome') as { data: Produto[] | null }

  // Resposta com headers de cache (5 min no CDN, 1 min no browser)
  return NextResponse.json(
    {
      confeitaria: {
        nome: confeitaria.nome,
        cidade: confeitaria.cidade,
        telefone: confeitaria.telefone,
        descricao: confeitaria.descricao,
        logo_url: confeitaria.logo_url,
        area_entrega: confeitaria.area_entrega,
        prazo_padrao_dias: confeitaria.prazo_padrao_dias,
        horarios_atendimento: confeitaria.horarios_atendimento,
        slug: confeitaria.slug,
      },
      produtos: produtos ?? [],
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  )
}
