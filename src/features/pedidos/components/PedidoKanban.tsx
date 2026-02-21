'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { PedidoCard } from './PedidoCard'
import {
  PEDIDO_STATUS_LABELS,
  PEDIDO_STATUS_ORDER,
  PEDIDO_STATUS_COLUMN_COLORS,
  type PedidoWithItens,
  type PedidoStatus,
} from '../types/pedido.types'
import { useUpdatePedido } from '../hooks/usePedidos'

// ─── Droppable Column ────────────────────────────────────────

function KanbanColumn({
  status,
  pedidos,
}: {
  status: PedidoStatus
  pedidos: PedidoWithItens[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const colors = PEDIDO_STATUS_COLUMN_COLORS[status]

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0 md:min-w-0 md:w-auto md:flex-1">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${colors.header}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {PEDIDO_STATUS_LABELS[status]}
        </span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/60">
          {pedidos.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 rounded-b-xl space-y-2 min-h-[200px] transition-colors
          ${isOver ? 'bg-primary-50 ring-2 ring-primary-300 ring-inset' : colors.body}`}
      >
        <SortableContext
          items={pedidos.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {pedidos.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} draggable />
          ))}
        </SortableContext>

        {pedidos.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Arraste aqui
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Board ────────────────────────────────────────────

interface PedidoKanbanProps {
  pedidos: PedidoWithItens[]
}

const VISIBLE_COLUMNS: PedidoStatus[] = ['novo', 'confirmado', 'producao', 'pronto', 'entregue']

export function PedidoKanban({ pedidos }: PedidoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { mutate: updatePedido } = useUpdatePedido()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const columns = VISIBLE_COLUMNS.reduce<Record<PedidoStatus, PedidoWithItens[]>>(
    (acc, status) => {
      acc[status] = pedidos.filter((p) => p.status === status)
      return acc
    },
    {} as Record<PedidoStatus, PedidoWithItens[]>
  )

  const activePedido = activeId ? pedidos.find((p) => p.id === activeId) ?? null : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const pedidoId = active.id as string
    const targetStatus = over.id as PedidoStatus

    // over.id can be a column id (PedidoStatus) or a pedido id
    const newStatus = VISIBLE_COLUMNS.includes(targetStatus as PedidoStatus)
      ? targetStatus
      : (pedidos.find((p) => p.id === over.id)?.status ?? null)

    if (!newStatus) return

    const current = pedidos.find((p) => p.id === pedidoId)
    if (!current || current.status === newStatus) return

    updatePedido({ id: pedidoId, data: { status: newStatus } })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Scrollable horizontal board */}
      <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-5">
        {VISIBLE_COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} pedidos={columns[status] ?? []} />
        ))}
      </div>

      {/* Drag overlay (ghost card while dragging) */}
      <DragOverlay>
        {activePedido && (
          <div className="opacity-90 rotate-1 shadow-xl">
            <PedidoCard pedido={activePedido} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
