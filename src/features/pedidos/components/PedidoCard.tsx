'use client'

import Link from 'next/link'
import { Calendar, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { CanalIcon } from './CanalIcon'
import type { PedidoWithItens } from '../types/pedido.types'

interface PedidoCardProps {
  pedido: PedidoWithItens
  draggable?: boolean
}

function getUrgencyBorder(pedido: PedidoWithItens): string {
  if (
    !pedido.data_entrega ||
    pedido.status === 'entregue' ||
    pedido.status === 'cancelado'
  ) {
    return ''
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const entrega = new Date(pedido.data_entrega)
  entrega.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 2) return 'border-l-4 border-l-red-400'
  if (diffDays <= 7) return 'border-l-4 border-l-amber-400'
  return 'border-l-4 border-l-green-400'
}

export function PedidoCard({ pedido, draggable = false }: PedidoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pedido.id, disabled: !draggable })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const total =
    pedido.itens_pedido && pedido.itens_pedido.length > 0
      ? pedido.itens_pedido.reduce((sum, it) => sum + it.quantidade * it.preco_unitario, 0)
      : pedido.valor_total

  const urgencyBorder = getUrgencyBorder(pedido)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white rounded-xl border shadow-sm transition-all ${urgencyBorder}
        ${isDragging
          ? 'opacity-50 shadow-lg scale-[1.02] z-50 border-primary-300'
          : 'border-gray-200 hover:border-primary-200 hover:shadow-md'}`}
    >
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-gray-300
            hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Arrastar pedido"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <Link href={`/pedidos/${pedido.id}`} className={`block p-3 ${draggable ? 'pl-8' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {pedido.cliente_nome}
          </span>
          <CanalIcon canal={pedido.canal} />
        </div>

        {pedido.itens_pedido && pedido.itens_pedido.length > 0 && (
          <p className="text-xs text-gray-500 truncate mb-2">
            {pedido.itens_pedido
              .slice(0, 2)
              .map((it) => `${it.quantidade}× ${it.nome_produto}`)
              .join(', ')}
            {pedido.itens_pedido.length > 2 && ` +${pedido.itens_pedido.length - 2}`}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-xs font-bold text-primary-700">{formatCurrency(total)}</span>
          {pedido.data_entrega && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(pedido.data_entrega)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
