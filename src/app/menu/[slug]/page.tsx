import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CardapioPublico } from '@/features/cardapio-publico/components/CardapioPublico'

interface Props {
  params: Promise<{ slug: string }>
}

async function getCardapio(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/cardapio/${slug}`, {
    next: { revalidate: 300 }, // ISR: revalida a cada 5 minutos
  })

  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCardapio(slug)

  if (!data) {
    return { title: 'Cardápio não encontrado' }
  }

  const { confeitaria } = data
  return {
    title: `Cardápio — ${confeitaria.nome}`,
    description: confeitaria.descricao ?? `Conheça os produtos da ${confeitaria.nome}`,
    openGraph: {
      title: confeitaria.nome,
      description: confeitaria.descricao ?? `Peça online na ${confeitaria.nome}`,
      images: confeitaria.logo_url ? [{ url: confeitaria.logo_url }] : [],
    },
  }
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params
  const data = await getCardapio(slug)

  if (!data) {
    notFound()
  }

  const { confeitaria, produtos } = data as {
    confeitaria: {
      id: string; nome: string; cidade: string | null; telefone: string | null
      descricao: string | null; logo_url: string | null; area_entrega: string | null
      prazo_padrao_dias: number | null; horarios_atendimento: string | null; slug: string | null
    }
    produtos: Array<{
      id: string; nome: string; descricao: string | null; preco: number
      categoria: string; foto_url: string | null
    }>
  }

  return <CardapioPublico confeitaria={confeitaria} produtos={produtos} />
}
