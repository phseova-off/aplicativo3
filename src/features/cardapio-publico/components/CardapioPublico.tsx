'use client'

import { useState, useMemo } from 'react'
import { MessageCircle, MapPin, Clock, Package, Search, Share2, Check, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import type { ProdutoCategoria } from '@/server/db/types'

const CATEGORIA_LABELS: Record<ProdutoCategoria, string> = {
  trufa: 'Trufas',
  bombom: 'Bombons',
  kit: 'Kits',
  outro: 'Outros',
}

const CATEGORIA_EMOJI: Record<ProdutoCategoria, string> = {
  trufa: '🍫',
  bombom: '🍬',
  kit: '🎁',
  outro: '✨',
}

interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: number
  categoria: string
  foto_url: string | null
}

interface Confeitaria {
  id: string
  nome: string
  cidade: string | null
  telefone: string | null
  descricao: string | null
  logo_url: string | null
  area_entrega: string | null
  prazo_padrao_dias: number | null
  horarios_atendimento: string | null
  slug: string | null
}

interface CardapioPublicoProps {
  confeitaria: Confeitaria
  produtos: Produto[]
}

export function CardapioPublico({ confeitaria, produtos }: CardapioPublicoProps) {
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string[]>([])
  const [copiado, setCopiado] = useState(false)

  // Group products by category
  const categorias = useMemo(() => {
    const groups = new Map<string, Produto[]>()
    for (const p of produtos) {
      const cat = p.categoria ?? 'outro'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(p)
    }
    return groups
  }, [produtos])

  const categoriasDisponveis = Array.from(categorias.keys()) as ProdutoCategoria[]

  // Filter by search and category
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca =
        !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = !categoriaAtiva || p.categoria === categoriaAtiva
      return matchBusca && matchCat
    })
  }, [produtos, busca, categoriaAtiva])

  const categoriasFiltradas = useMemo(() => {
    const groups = new Map<string, Produto[]>()
    for (const p of produtosFiltrados) {
      const cat = p.categoria ?? 'outro'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(p)
    }
    return groups
  }, [produtosFiltrados])

  function toggleItem(nome: string) {
    setPedidoSelecionado((prev) =>
      prev.includes(nome) ? prev.filter((n) => n !== nome) : [...prev, nome]
    )
  }

  function montarMensagemWhatsApp() {
    const itens = pedidoSelecionado.length > 0
      ? pedidoSelecionado.join(', ')
      : 'Gostaria de saber mais sobre seus produtos'

    const msg = `Olá! Vi o cardápio da ${confeitaria.nome} e quero pedir: ${itens}.`
    const tel = confeitaria.telefone?.replace(/\D/g, '') ?? ''
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: confeitaria.nome, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const linkPedido = confeitaria.slug ? `/menu/${confeitaria.slug}/pedido` : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-pink-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {confeitaria.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={confeitaria.logo_url}
              alt={confeitaria.nome}
              className="w-10 h-10 rounded-full object-cover border border-pink-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
              {confeitaria.nome.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base leading-tight truncate">{confeitaria.nome}</h1>
            {confeitaria.cidade && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {confeitaria.cidade}
              </p>
            )}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado!' : 'Compartilhar'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-40">
        {/* Hero info */}
        {(confeitaria.descricao || confeitaria.horarios_atendimento || confeitaria.area_entrega || confeitaria.prazo_padrao_dias) && (
          <div className="py-4 space-y-2">
            {confeitaria.descricao && (
              <p className="text-sm text-gray-600">{confeitaria.descricao}</p>
            )}
            <div className="flex flex-wrap gap-3">
              {confeitaria.horarios_atendimento && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2.5 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <Clock className="w-3 h-3 text-primary-500" />
                  {confeitaria.horarios_atendimento}
                </div>
              )}
              {confeitaria.area_entrega && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2.5 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <MapPin className="w-3 h-3 text-primary-500" />
                  {confeitaria.area_entrega}
                </div>
              )}
              {confeitaria.prazo_padrao_dias && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2.5 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <Package className="w-3 h-3 text-primary-500" />
                  Prazo: {confeitaria.prazo_padrao_dias} dia{confeitaria.prazo_padrao_dias > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 shadow-sm"
          />
        </div>

        {/* Category tabs */}
        {categoriasDisponveis.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
            <button
              onClick={() => setCategoriaAtiva(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !categoriaAtiva
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              Todos
            </button>
            {categoriasDisponveis.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat === categoriaAtiva ? null : cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  categoriaAtiva === cat
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                <span>{CATEGORIA_EMOJI[cat as ProdutoCategoria] ?? '✨'}</span>
                {CATEGORIA_LABELS[cat as ProdutoCategoria] ?? cat}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(categoriasFiltradas.entries()).map(([cat, prods]) => (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CATEGORIA_EMOJI[cat as ProdutoCategoria] ?? '✨'}</span>
                  <h2 className="text-base font-bold text-gray-800">
                    {CATEGORIA_LABELS[cat as ProdutoCategoria] ?? cat}
                  </h2>
                  <span className="text-xs text-gray-400 ml-auto">{prods.length} item{prods.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {prods.map((produto) => {
                    const selecionado = pedidoSelecionado.includes(produto.nome)
                    return (
                      <div
                        key={produto.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selecionado
                            ? 'border-primary-400 bg-primary-50 shadow-sm'
                            : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Foto ou placeholder */}
                        <button
                          onClick={() => toggleItem(produto.nome)}
                          className="flex-shrink-0"
                          aria-label={`Selecionar ${produto.nome}`}
                        >
                          {produto.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={produto.foto_url}
                              alt={produto.nome}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-2xl">
                              {CATEGORIA_EMOJI[cat as ProdutoCategoria] ?? '🍬'}
                            </div>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => toggleItem(produto.nome)}
                              className="text-left"
                            >
                              <p className="font-semibold text-gray-900 text-sm leading-tight">{produto.nome}</p>
                              {produto.descricao && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{produto.descricao}</p>
                              )}
                            </button>
                            <span className="text-sm font-bold text-primary-700 flex-shrink-0">
                              {formatCurrency(produto.preco)}
                            </span>
                          </div>

                          {/* "Fazer Pedido" button per product */}
                          {linkPedido && (
                            <a
                              href={`${linkPedido}?produto=${produto.id}`}
                              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-full border border-primary-200 transition-colors"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Fazer Pedido
                            </a>
                          )}
                        </div>

                        {selecionado && (
                          <button
                            onClick={() => toggleItem(produto.nome)}
                            className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* MANDATORY viral loop footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-xs text-gray-400">
            Gerenciado com{' '}
            <a
              href={`/cadastro?ref=${confeitaria.id}`}
              className="text-primary-400 hover:text-primary-600 font-medium transition-colors"
            >
              Doceria Pro
            </a>
            {' '}— crie o seu grátis
          </p>
        </div>
      </div>

      {/* Sticky CTA — WhatsApp + Pedido via formulário */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-gray-100 shadow-2xl z-40">
        <div className="max-w-2xl mx-auto space-y-2">
          {pedidoSelecionado.length > 0 && (
            <p className="text-xs text-center text-gray-500">
              {pedidoSelecionado.length} item{pedidoSelecionado.length !== 1 ? 's' : ''} selecionado{pedidoSelecionado.length !== 1 ? 's' : ''}
              {' · '}
              <button onClick={() => setPedidoSelecionado([])} className="text-red-400 hover:text-red-600">
                Limpar
              </button>
            </p>
          )}

          <div className="flex gap-2">
            {/* Pedido pelo formulário (principal) */}
            {linkPedido && (
              <a
                href={linkPedido}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                {pedidoSelecionado.length > 0 ? `Fazer Pedido (${pedidoSelecionado.length})` : 'Fazer Pedido'}
              </a>
            )}

            {/* WhatsApp (secundário, se tiver telefone) */}
            {confeitaria.telefone && (
              <a
                href={montarMensagemWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm ${
                  linkPedido ? 'px-4' : 'flex-1'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                {!linkPedido && 'Pedir via WhatsApp'}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
