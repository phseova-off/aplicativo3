'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import type { ProducaoWithPedido } from '../types/producao.types'

interface ProducaoCardProps {
  item: ProducaoWithPedido
  onNext: () => void
  onPrev: () => void
  canNext: boolean
  canPrev: boolean
}

export function ProducaoCard({ item, onNext, onPrev, canNext, canPrev }: ProducaoCardProps) {
  const pedido = item.pedidos

  return (
    <Card padding="sm" className="text-sm">
      <p className="font-medium text-gray-900 truncate mb-1">
        {pedido?.cliente_nome ?? 'Cliente'}
      </p>
      {pedido?.descricao && (
        <p className="text-xs text-gray-500 truncate mb-1">{pedido.descricao}</p>
      )}
      {pedido?.valor !== undefined && (
        <p className="text-xs font-semibold text-primary-600 mb-1">
          {formatCurrency(pedido.valor)}
        </p>
      )}
      {pedido?.data_entrega && (
        <p className="text-xs text-gray-400">Entrega: {formatDate(pedido.data_entrega)}</p>
      )}
      <div className="flex gap-1 mt-2">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="flex-1 flex justify-center p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Etapa anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex-1 flex justify-center p-1 rounded text-primary-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Próxima etapa"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}
