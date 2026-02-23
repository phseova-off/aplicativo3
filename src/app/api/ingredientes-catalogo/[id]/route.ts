import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/server/db/client'

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  unidade: z.string().optional(),
  preco_atual: z.number().positive().optional(),
  fornecedor: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
})

/**
 * PATCH /api/ingredientes-catalogo/[id]
 * Atualiza um ingrediente. Se preco_atual mudou, dispara cascata:
 *   1. Salva preco_anterior
 *   2. Recalcula custo_calculado dos produtos afetados
 *   3. Marca preco_desatualizado=true nos produtos afetados
 *   4. Cria um alerta na tabela alertas_ingrediente
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Buscar ingrediente atual (garante propriedade)
  const { data: ingrediente, error: fetchErr } = await db
    .from('ingredientes_catalogo')
    .select('id, nome, preco_atual, confeiteiro_id')
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .single() as { data: { id: string; nome: string; preco_atual: number; confeiteiro_id: string } | null; error: Error | null }

  if (fetchErr || !ingrediente) {
    return NextResponse.json({ error: 'Ingrediente não encontrado' }, { status: 404 })
  }

  const novoPreco = parsed.data.preco_atual
  const mudouPreco = novoPreco !== undefined && novoPreco !== ingrediente.preco_atual

  // Montar payload de atualização
  const updatePayload: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (mudouPreco) {
    updatePayload.preco_anterior = ingrediente.preco_atual
    updatePayload.preco_updated_at = new Date().toISOString()
  }

  const { data: updated, error: updateErr } = await db
    .from('ingredientes_catalogo')
    .update(updatePayload)
    .eq('id', id)
    .eq('confeiteiro_id', user.id)
    .select()
    .single() as { data: Record<string, unknown> | null; error: Error | null }

  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? 'Falha ao atualizar' }, { status: 500 })
  }

  // ── Cascata de preço ──────────────────────────────────────────
  let produtosAfetados = 0

  if (mudouPreco && novoPreco !== undefined) {
    // 1. Encontrar produtos que usam este ingrediente via produtos_ingredientes (v2)
    const { data: vinculosV2 } = await db
      .from('produtos_ingredientes')
      .select('produto_id, quantidade')
      .eq('ingrediente_id', id) as {
        data: Array<{ produto_id: string; quantidade: number }> | null
      }

    const produtoIdsV2 = (vinculosV2 ?? []).map((v) => v.produto_id)

    if (produtoIdsV2.length > 0) {
      // 2. Para cada produto, recalcular custo_calculado
      // Buscar todos os ingredientes de cada produto de uma vez
      const { data: todosVinculos } = await db
        .from('produtos_ingredientes')
        .select('produto_id, quantidade, ingrediente_id')
        .in('produto_id', produtoIdsV2) as {
          data: Array<{ produto_id: string; quantidade: number; ingrediente_id: string }> | null
        }

      // Buscar preços atuais de todos os ingredientes envolvidos
      const ingredienteIds = [...new Set((todosVinculos ?? []).map((v) => v.ingrediente_id))]
      const { data: precosIngredientes } = await db
        .from('ingredientes_catalogo')
        .select('id, preco_atual')
        .in('id', ingredienteIds) as {
          data: Array<{ id: string; preco_atual: number }> | null
        }

      const precoMap: Record<string, number> = {}
      for (const p of precosIngredientes ?? []) {
        precoMap[p.id] = p.id === id ? novoPreco : p.preco_atual
      }

      // Buscar rendimento dos produtos
      const { data: produtosInfo } = await db
        .from('produtos')
        .select('id, rendimento')
        .in('id', produtoIdsV2)
        .eq('confeiteiro_id', user.id) as {
          data: Array<{ id: string; rendimento: number | null }> | null
        }

      const rendimentoMap: Record<string, number> = {}
      for (const p of produtosInfo ?? []) {
        rendimentoMap[p.id] = p.rendimento ?? 1
      }

      // Agrupar vínculos por produto
      const vinculosPorProduto: Record<string, Array<{ quantidade: number; ingrediente_id: string }>> = {}
      for (const v of todosVinculos ?? []) {
        if (!vinculosPorProduto[v.produto_id]) vinculosPorProduto[v.produto_id] = []
        vinculosPorProduto[v.produto_id].push(v)
      }

      // Atualizar custo_calculado + preco_desatualizado para cada produto
      for (const produtoId of produtoIdsV2) {
        const vinculos = vinculosPorProduto[produtoId] ?? []
        const custoTotal = vinculos.reduce((sum, v) => {
          return sum + v.quantidade * (precoMap[v.ingrediente_id] ?? 0)
        }, 0)
        const rendimento = rendimentoMap[produtoId] ?? 1
        const custoPorUnidade = rendimento > 1 ? custoTotal / rendimento : custoTotal

        await db
          .from('produtos')
          .update({
            custo_calculado: parseFloat(custoPorUnidade.toFixed(4)),
            preco_desatualizado: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', produtoId)
          .eq('confeiteiro_id', user.id)
      }

      produtosAfetados = produtoIdsV2.length
    }

    // 3. Criar alerta se houve mudança real de preço
    const variacaoPercentual =
      ingrediente.preco_atual > 0
        ? ((novoPreco - ingrediente.preco_atual) / ingrediente.preco_atual) * 100
        : 0

    await db
      .from('alertas_ingrediente')
      .insert({
        confeiteiro_id: user.id,
        ingrediente_id: id,
        ingrediente_nome: ingrediente.nome,
        preco_anterior: ingrediente.preco_atual,
        preco_novo: novoPreco,
        variacao_percentual: parseFloat(variacaoPercentual.toFixed(2)),
        produtos_afetados: produtosAfetados,
      })
  }

  return NextResponse.json({
    ...updated,
    _meta: { mudou_preco: mudouPreco, produtos_afetados: produtosAfetados },
  })
}

/**
 * DELETE /api/ingredientes-catalogo/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

  const { error } = await db
    .from('ingredientes_catalogo')
    .delete()
    .eq('id', id)
    .eq('confeiteiro_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
