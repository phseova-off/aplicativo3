'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Globe,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  Share2,
  MessageCircle,
  Package,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/server/db/client'
import { useConfeitaria } from '@/features/auth/hooks/useConfeitaria'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/utils'

// ─── Produto (para seleção de visibilidade) ───────────────────────────────────

interface Produto {
  id: string
  nome: string
  categoria: string
  preco: number
  ativo: boolean
  visivel_no_cardapio: boolean
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CardapioPublicoConfigPage() {
  const { confeitaria, loading, refresh } = useConfeitaria()
  const [toggling, setToggling] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [salvandoProdutos, setSalvandoProdutos] = useState<string | null>(null)

  const slug = confeitaria?.slug
  const ativo = confeitaria?.menu_publico_ativo ?? false

  const linkPublico =
    typeof window !== 'undefined' && slug
      ? `${window.location.origin}/menu/${slug}`
      : slug
        ? `https://doceriapro.com/menu/${slug}`
        : null

  const whatsappMsg = linkPublico
    ? `https://wa.me/?text=${encodeURIComponent(`Olha meu cardápio online! 🍫 ${linkPublico}`)}`
    : null

  // Buscar produtos da confeiteira
  useEffect(() => {
    if (!confeitaria) return
    setLoadingProdutos(true)
    const supabase = createSupabaseBrowserClient()
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('produtos')
          .select('id, nome, categoria, preco, ativo, visivel_no_cardapio')
          .eq('confeiteiro_id', user.id)
          .order('categoria')
          .order('nome')
        setProdutos((data as Produto[]) ?? [])
      } finally {
        setLoadingProdutos(false)
      }
    })()
  }, [confeitaria])

  async function handleToggle() {
    if (!confeitaria || !slug) return
    setToggling(true)
    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setToggling(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('confeitarias')
      .update({ menu_publico_ativo: !ativo })
      .eq('id', user.id)

    if (error) {
      toast.error('Erro ao atualizar. Tente novamente.')
    } else {
      await refresh()
      toast.success(!ativo ? 'Cardápio público ativado!' : 'Cardápio desativado.')
    }
    setToggling(false)
  }

  async function handleCopyLink() {
    if (!linkPublico) return
    await navigator.clipboard.writeText(linkPublico)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
    toast.success('Link copiado!')
  }

  async function toggleVisibilidadeProduto(produtoId: string, atual: boolean) {
    setSalvandoProdutos(produtoId)
    const supabase = createSupabaseBrowserClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('produtos')
      .update({ visivel_no_cardapio: !atual })
      .eq('id', produtoId)

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
    } else {
      setProdutos((prev) =>
        prev.map((p) => (p.id === produtoId ? { ...p, visivel_no_cardapio: !atual } : p))
      )
    }
    setSalvandoProdutos(null)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cardápio Público</h1>
          <p className="text-sm text-gray-500">Configure seu link de vendas online</p>
        </div>
      </div>

      {/* Status & Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-600" />
            Status do Cardápio
          </CardTitle>
        </CardHeader>

        {!slug ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm text-amber-800 font-medium mb-1">Endereço não configurado</p>
            <p className="text-xs text-amber-700 mb-3">
              Configure o endereço público da sua doceria nas{' '}
              <Link href="/configuracoes" className="underline font-medium">
                configurações gerais
              </Link>{' '}
              para ativar o cardápio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle principal */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                {ativo ? (
                  <Eye className="w-5 h-5 text-green-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {ativo ? 'Cardápio visível ao público' : 'Cardápio oculto'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ativo
                      ? 'Clientes podem ver e fazer pedidos'
                      : 'O link não está acessível para clientes'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={cn('transition-colors', toggling && 'opacity-60 cursor-not-allowed')}
                aria-label={ativo ? 'Desativar cardápio' : 'Ativar cardápio'}
              >
                {ativo ? (
                  <ToggleRight className="w-10 h-10 text-primary-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
              </button>
            </div>

            {/* Link preview */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Seu link público
              </label>
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200">
                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate font-mono text-xs">
                  {linkPublico}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1 gap-2"
                >
                  {linkCopiado ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar link
                    </>
                  )}
                </Button>
                {ativo && linkPublico && (
                  <a
                    href={linkPublico}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visualizar
                  </a>
                )}
              </div>
            </div>

            {/* Compartilhar */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Compartilhar
              </label>
              <div className="flex gap-2">
                {whatsappMsg && (
                  <a
                    href={whatsappMsg}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2.5 px-4 rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar no WhatsApp
                  </a>
                )}
                <button
                  onClick={async () => {
                    if (linkPublico && navigator.share) {
                      await navigator.share({
                        title: confeitaria?.nome,
                        url: linkPublico,
                      })
                    } else {
                      handleCopyLink()
                    }
                  }}
                  className="flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-xs font-medium py-2.5 px-4 rounded-xl transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Produtos visíveis no cardápio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-600" />
            Produtos no Cardápio
          </CardTitle>
        </CardHeader>

        <p className="text-sm text-gray-500 mb-4">
          Escolha quais produtos aparecem no seu cardápio público. Produtos inativos não aparecem mesmo que selecionados.
        </p>

        {loadingProdutos ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum produto cadastrado.</p>
            <Link
              href="/produtos/novo"
              className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
            >
              Cadastrar produtos →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {produtos.map((produto) => {
              const salvando = salvandoProdutos === produto.id
              const visivelEfetivo = produto.ativo && produto.visivel_no_cardapio
              return (
                <div
                  key={produto.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    visivelEfetivo
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-gray-100 bg-white opacity-70'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{produto.nome}</p>
                    <p className="text-xs text-gray-400">
                      {produto.categoria}
                      {!produto.ativo && (
                        <span className="ml-2 text-amber-500 font-medium">• produto inativo</span>
                      )}
                    </p>
                  </div>
                  <button
                    disabled={salvando || !produto.ativo}
                    onClick={() => toggleVisibilidadeProduto(produto.id, produto.visivel_no_cardapio)}
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      salvando && 'opacity-60 cursor-not-allowed',
                      !produto.ativo && 'opacity-30 cursor-not-allowed'
                    )}
                    aria-label={
                      produto.visivel_no_cardapio ? 'Ocultar do cardápio' : 'Mostrar no cardápio'
                    }
                  >
                    {salvando ? (
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : produto.visivel_no_cardapio ? (
                      <ToggleRight className="w-8 h-8 text-primary-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Dica viral */}
      <div className="bg-gradient-to-r from-primary-50 to-pink-50 rounded-2xl border border-primary-100 p-5">
        <h3 className="text-sm font-bold text-primary-900 mb-1">💡 Dica de crescimento</h3>
        <p className="text-xs text-primary-700">
          Compartilhe o link do seu cardápio no status do WhatsApp, stories do Instagram e grupos de clientes.
          Cada pedido feito pelo link já entra direto no seu Kanban, sem precisar digitar nada!
        </p>
      </div>
    </div>
  )
}
