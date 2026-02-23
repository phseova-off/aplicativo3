import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'
import { concluirLoteSchema } from '@/features/producao/schemas/producao.schema'
import { handleApiError } from '@/server/middleware/errorHandler'

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/producao/lotes/[id]/concluir
 * Registra a conclusão de um lote de produção com:
 * - quantidade_produzida real
 * - custo_real calculado no servidor com preços ATUAIS de ingredientes_catalogo
 * - observacoes e motivo_desvio quando aplicável
 *
 * Se todos os lotes do pedido de origem estiverem concluídos,
 * retorna sugestao_pronto=true para o frontend sugerir mover o pedido.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Validar body
    const body = await request.json()
    const parsed = concluirLoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { quantidade_produzida, observacoes, motivo_desvio } = parsed.data

    // 2. Buscar lote com produto para calcular custo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lote, error: fetchError } = await (supabase as any)
      .from('producao_lotes')
      .select('id, status, produto_id, quantidade_planejada, confeiteiro_id, pedido_id')
      .eq('id', id)
      .eq('confeiteiro_id', user.id)
      .single() as {
        data: {
          id: string; status: string; produto_id: string | null
          quantidade_planejada: number; confeiteiro_id: string; pedido_id: string | null
        } | null
        error: Error | null
      }

    if (fetchError || !lote) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    if (lote.status !== 'em_andamento') {
      return NextResponse.json(
        { error: `Lote não pode ser concluído. Status atual: ${lote.status}. Inicie a produção primeiro.` },
        { status: 409 }
      )
    }

    // 3. Calcular custo_real com preços ATUAIS de ingredientes_catalogo
    //    (nunca confiar no valor enviado pelo client)
    let custoReal = 0
    if (lote.produto_id) {
      // Buscar ingredientes do produto (JSONB legado — coluna ingredientes em produtos)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: produto } = await (supabase as any)
        .from('produtos')
        .select('ingredientes, rendimento')
        .eq('id', lote.produto_id)
        .single() as {
          data: { ingredientes: Array<{ nome: string; quantidade: number; custo_unitario: number }>; rendimento: number | null } | null
        }

      if (produto?.ingredientes?.length) {
        const rendimento = produto.rendimento ?? 1
        // Custo por unidade = sum(ingrediente.qtd * custo_unitario) / rendimento
        const custoPorUnidade = produto.ingredientes.reduce(
          (s, ing) => s + (ing.quantidade * ing.custo_unitario),
          0
        ) / rendimento
        custoReal = custoPorUnidade * quantidade_produzida

        // Tentar buscar preços atualizados do catálogo para ingredientes com mesmo nome
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: catalogPrecos } = await (supabase as any)
          .from('ingredientes_catalogo')
          .select('nome, preco_atual')
          .eq('confeiteiro_id', user.id) as {
            data: Array<{ nome: string; preco_atual: number }> | null
          }

        if (catalogPrecos?.length) {
          const precoAtualMap = new Map(catalogPrecos.map((c) => [c.nome.toLowerCase(), c.preco_atual]))
          let custoComCatalogo = 0
          let usandoCatalogo = false

          for (const ing of produto.ingredientes) {
            const precoAtual = precoAtualMap.get(ing.nome.toLowerCase())
            if (precoAtual !== undefined) {
              custoComCatalogo += (ing.quantidade * precoAtual)
              usandoCatalogo = true
            } else {
              custoComCatalogo += (ing.quantidade * ing.custo_unitario)
            }
          }

          if (usandoCatalogo) {
            custoReal = (custoComCatalogo / rendimento) * quantidade_produzida
          }
        }
      }
    }

    // 4. Registrar conclusão
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase as any)
      .from('producao_lotes')
      .update({
        status: 'concluido',
        quantidade_produzida,
        custo_real: Math.round(custoReal * 100) / 100,
        custo_total: Math.round(custoReal * 100) / 100, // atualiza custo_total legado também
        observacoes: observacoes ?? null,
        motivo_desvio: quantidade_produzida < lote.quantidade_planejada ? (motivo_desvio ?? null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: Error | null }

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Erro ao concluir lote' }, { status: 500 })
    }

    // 5. Verificar se todos os lotes do pedido estão concluídos
    let sugestao_pronto = false
    if (lote.pedido_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lotesRestantes } = await (supabase as any)
        .from('producao_lotes')
        .select('id, status')
        .eq('pedido_id', lote.pedido_id)
        .in('status', ['planejado', 'em_andamento']) as {
          data: Array<{ id: string; status: string }> | null
        }

      sugestao_pronto = (lotesRestantes?.length ?? 0) === 0
    }

    return NextResponse.json({ ...updated, sugestao_pronto })
  } catch (err) {
    const { status, ...body } = handleApiError(err, 'POST /api/producao/lotes/[id]/concluir')
    return NextResponse.json(body, { status })
  }
}
