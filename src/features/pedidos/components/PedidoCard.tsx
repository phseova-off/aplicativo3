'use client'

import Link from 'next/link'
import { Calendar, Phone, ChevronRight } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { PedidoStatusBadge } from './PedidoStatusBadge'
import type { PedidoWithItens } from '../types/pedido.types'

interface PedidoCardProps {
  pedido: PedidoWithItens
}

export function PedidoCard({ pedido }: PedidoCardProps) {
  return (
    <Link href={`/pedidos/${pedido.id}`}>
      <Card
        padding="md"
        className="hover:border-primary-200 hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 truncate">
                {pedido.cliente_nome}
              </span>
              <PedidoStatusBadge status={pedido.status} />
            </div>
            {pedido.descricao && (
              <p className="text-sm text-gray-600 truncate">{pedido.descricao}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {pedido.cliente_telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {pedido.cliente_telefone}
                </span>
              )}
              {pedido.data_entrega && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Entrega: {formatDate(pedido.data_entrega)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-primary-700">{formatCurrency(pedido.valor)}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  )
}
