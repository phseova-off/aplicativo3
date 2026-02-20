'use client'

import { PedidoCard } from './PedidoCard'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { ClipboardList } from 'lucide-react'
import type { PedidoWithItens } from '../types/pedido.types'

interface PedidoListProps {
  pedidos: PedidoWithItens[]
  isLoading?: boolean
}

export function PedidoList({ pedidos, isLoading }: PedidoListProps) {
  if (isLoading) return <PageLoader />

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <ClipboardList className="w-12 h-12 mb-3 text-gray-300" />
        <p className="font-medium text-gray-700">Nenhum pedido encontrado</p>
        <p className="text-sm mt-1">Crie seu primeiro pedido para começar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => (
        <PedidoCard key={pedido.id} pedido={pedido} />
      ))}
    </div>
  )
}
