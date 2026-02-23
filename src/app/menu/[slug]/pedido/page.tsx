import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PedidoPublicoForm } from '@/features/cardapio-publico/components/PedidoPublicoForm'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ produto?: string }>
}

async function getCardapio(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/cardapio/${slug}`, {
    // Não cachear — sempre fresh para checar menu_publico_ativo
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCardapio(slug)
  if (!data) return { title: 'Pedido' }
  return {
    title: `Fazer pedido — ${data.confeitaria.nome}`,
    robots: 'noindex',
  }
}

export default async function PedidoPublicoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { produto: produtoId } = await searchParams

  const data = await getCardapio(slug)
  if (!data) notFound()

  const { confeitaria, produtos } = data

  // Produto pré-selecionado via query param ?produto=[id]
  const produtoPreSelecionado = produtoId
    ? produtos.find((p: { id: string }) => p.id === produtoId) ?? null
    : null

  return (
    <PedidoPublicoForm
      confeitaria={confeitaria}
      produtos={produtos}
      produtoPreSelecionado={produtoPreSelecionado}
    />
  )
}
