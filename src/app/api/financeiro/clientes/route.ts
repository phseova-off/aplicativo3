import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/server/db/client'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Busca clientes com stats desnormalizados
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, total_pedidos, valor_total_compras, ultima_compra')
    .eq('confeitaria_id', user.id)
    .order('valor_total_compras', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Busca produto favorito por cliente (item mais pedido por cliente)
  const { data: itensFavoritos } = await supabase
    .from('pedidos')
    .select('cliente_id, itens_pedido(nome_produto, quantidade)')
    .eq('confeiteiro_id', user.id)
    .not('cliente_id', 'is', null)
    .eq('status', 'entregue')

  // Monta mapa de produto favorito por cliente
  const favoritoMap: Record<string, Record<string, number>> = {}
  for (const pedido of (itensFavoritos ?? [])) {
    const cid = pedido.cliente_id as string
    if (!cid) continue
    if (!favoritoMap[cid]) favoritoMap[cid] = {}
    const itens = (pedido.itens_pedido ?? []) as { nome_produto: string; quantidade: number }[]
    for (const item of itens) {
      favoritoMap[cid][item.nome_produto] = (favoritoMap[cid][item.nome_produto] ?? 0) + item.quantidade
    }
  }

  const agora = new Date()

  const resultado = (clientes ?? []).map(c => {
    // Dias sem comprar
    let diasSemComprar: number | null = null
    if (c.ultima_compra) {
      const ultima = new Date(c.ultima_compra + 'T00:00:00')
      diasSemComprar = Math.floor((agora.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Produto favorito
    let produtoFavorito: string | null = null
    const prods = favoritoMap[c.id]
    if (prods) {
      const sorted = Object.entries(prods).sort((a, b) => b[1] - a[1])
      produtoFavorito = sorted[0]?.[0] ?? null
    }

    return {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      total_pedidos: c.total_pedidos ?? 0,
      valor_total_compras: c.valor_total_compras ?? 0,
      ultima_compra: c.ultima_compra,
      dias_sem_comprar: diasSemComprar,
      produto_favorito: produtoFavorito,
    }
  })

  return NextResponse.json(resultado)
}
