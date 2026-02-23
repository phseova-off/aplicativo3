import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/server/db/client'
import { z } from 'zod'
import { handleApiError } from '@/server/middleware/errorHandler'
import { assertPodeCriarPedido } from '@/server/lib/planos'
import type { PlanoTipo } from '@/server/db/types'

interface Params {
  params: Promise<{ slug: string }>
}

const itemSchema = z.object({
  produto_id: z.string().uuid().optional().nullable(),
  nome_produto: z.string().min(1),
  quantidade: z.coerce.number().int().min(1),
  preco_unitario: z.coerce.number().min(0),
})

const pedidoPublicoSchema = z.object({
  cliente_nome: z.string().min(2, 'Informe seu nome'),
  cliente_telefone: z.string().min(8, 'Informe um telefone válido'),
  data_entrega: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  itens: z.array(itemSchema).min(1, 'Adicione ao menos um produto'),
})

/**
 * POST /api/cardapio/[slug]/pedido — endpoint público (sem auth)
 * Cria um pedido no sistema da confeiteira via cardápio público.
 * - Verifica se o cardápio está ativo
 * - Respeita os limites de plano da confeiteira
 * - Marca o pedido com canal='cardapio_publico'
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params

    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseServiceClient() as any

    // 1. Buscar confeitaria e verificar se cardápio está ativo
    const { data: confeitaria, error: confeitariaError } = await supabase
      .from('confeitarias')
      .select('id, nome, menu_publico_ativo, plano')
      .eq('slug', slug)
      .single() as {
        data: { id: string; nome: string; menu_publico_ativo: boolean; plano: string } | null
        error: Error | null
      }

    if (confeitariaError || !confeitaria) {
      return NextResponse.json({ error: 'Cardápio não encontrado' }, { status: 404 })
    }

    if (!confeitaria.menu_publico_ativo) {
      return NextResponse.json(
        { error: 'Este cardápio não está aceitando pedidos no momento' },
        { status: 403 }
      )
    }

    // 2. Verificar limite de pedidos do plano da confeiteira
    // A confeitaria.id == confeiteiro.id (design v1/v2)
    const { data: confeiteiro } = await supabase
      .from('confeiteiros')
      .select('plano')
      .eq('id', confeitaria.id)
      .single() as { data: { plano: string } | null }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: pedidosMes } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('confeiteiro_id', confeitaria.id)
      .gte('created_at', startOfMonth.toISOString())
      .neq('status', 'cancelado') as { count: number | null }

    assertPodeCriarPedido(
      (confeiteiro?.plano ?? confeitaria.plano ?? 'free') as PlanoTipo,
      pedidosMes ?? 0
    )

    // 3. Validar body
    const body = await request.json()
    const parsed = pedidoPublicoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { itens, ...pedidoData } = parsed.data

    // Calcular valor total a partir dos itens
    const valor_total = itens.reduce(
      (sum, item) => sum + item.quantidade * item.preco_unitario,
      0
    )

    // 4. Criar pedido com canal='cardapio_publico'
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        ...pedidoData,
        confeiteiro_id: confeitaria.id,
        canal: 'cardapio_publico',
        status: 'novo',
        valor_total,
      })
      .select()
      .single() as { data: { id: string } | null; error: Error | null }

    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: pedidoError?.message ?? 'Erro ao registrar pedido' },
        { status: 500 }
      )
    }

    // 5. Inserir itens do pedido
    if (itens.length > 0) {
      await supabase
        .from('itens_pedido')
        .insert(itens.map((item) => ({ ...item, pedido_id: pedido.id })))
    }

    return NextResponse.json(
      {
        success: true,
        pedido_id: pedido.id,
        mensagem: `Seu pedido foi recebido! A ${confeitaria.nome} vai confirmar em breve.`,
        confeitaria_nome: confeitaria.nome,
      },
      { status: 201 }
    )
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'POST /api/cardapio/[slug]/pedido')
    return NextResponse.json(body, { status })
  }
}
