'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Circle,
  Zap,
  Clock,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Select } from '@/shared/components/ui/Select'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { PedidoStatusBadge } from '@/features/pedidos/components/PedidoStatusBadge'
import { CanalIcon } from '@/features/pedidos/components/CanalIcon'
import { usePedido, useUpdatePedido, useDeletePedido } from '@/features/pedidos/hooks/usePedidos'
import {
  PEDIDO_STATUS_ORDER,
  PEDIDO_STATUS_LABELS,
  type PedidoStatus,
} from '@/features/pedidos/types/pedido.types'
import { formatCurrency, formatDate, formatDateTime } from '@/shared/lib/utils'

const statusOptions = PEDIDO_STATUS_ORDER.map((s) => ({
  value: s,
  label: PEDIDO_STATUS_LABELS[s],
}))

interface Props {
  params: Promise<{ id: string }>
}

// ─── Status Timeline ─────────────────────────────────────────

const TIMELINE_STATUSES: PedidoStatus[] = ['novo', 'confirmado', 'producao', 'pronto', 'entregue']

function StatusTimeline({
  currentStatus,
  createdAt,
  updatedAt,
}: {
  currentStatus: PedidoStatus
  createdAt: string
  updatedAt: string
}) {
  const currentIndex = TIMELINE_STATUSES.indexOf(currentStatus)
  const isCancelled = currentStatus === 'cancelado'

  return (
    <div className="space-y-1">
      {isCancelled ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Circle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">Cancelado</p>
            <p className="text-xs text-gray-400">{formatDateTime(updatedAt)}</p>
          </div>
        </div>
      ) : (
        TIMELINE_STATUSES.map((status, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex
          const isPending = idx > currentIndex

          return (
            <div key={status} className="flex items-center gap-3 py-1.5">
              <div className="relative flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-primary-100 border-2 border-primary-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  </div>
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
                {idx < TIMELINE_STATUSES.length - 1 && (
                  <div
                    className={[
                      'absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-4',
                      isDone ? 'bg-green-300' : 'bg-gray-200',
                    ].join(' ')}
                  />
                )}
              </div>
              <div className="pb-2">
                <p
                  className={[
                    'text-sm font-medium',
                    isCurrent
                      ? 'text-primary-700'
                      : isDone
                      ? 'text-gray-700'
                      : 'text-gray-400',
                  ].join(' ')}
                >
                  {PEDIDO_STATUS_LABELS[status]}
                </p>
                {isCurrent && (
                  <p className="text-xs text-gray-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatDateTime(updatedAt)}
                  </p>
                )}
                {isDone && idx === 0 && (
                  <p className="text-xs text-gray-400">{formatDateTime(createdAt)}</p>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function PedidoDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: pedido, isLoading } = usePedido(id)
  const { mutate: updatePedido, isPending: isUpdating } = useUpdatePedido()
  const { mutate: deletePedido, isPending: isDeleting } = useDeletePedido()

  const [editingStatus, setEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<PedidoStatus>('novo')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Pedido não encontrado.</p>
        <Button variant="ghost" onClick={() => router.push('/pedidos')}>
          Voltar para Pedidos
        </Button>
      </div>
    )
  }

  const total =
    pedido.itens_pedido && pedido.itens_pedido.length > 0
      ? pedido.itens_pedido.reduce((sum, it) => sum + it.quantidade * it.preco_unitario, 0)
      : pedido.valor_total

  function handleStatusSave() {
    updatePedido(
      { id, data: { status: selectedStatus } },
      { onSuccess: () => setEditingStatus(false) }
    )
  }

  function handleMoveToProducao() {
    updatePedido({ id, data: { status: 'producao' } })
  }

  function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return
    deletePedido(id, { onSuccess: () => router.push('/pedidos') })
  }

  const canMoveToProducao =
    pedido.status === 'novo' || pedido.status === 'confirmado'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/pedidos')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Pedidos
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{pedido.cliente_nome}</h1>
            <PedidoStatusBadge status={pedido.status} />
            <CanalIcon canal={pedido.canal} showLabel />
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">#{id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          loading={isDeleting}
          leftIcon={<Trash2 className="w-4 h-4" />}
        >
          Excluir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="md:col-span-2 space-y-4">
          {/* Order details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Pedido</CardTitle>
              <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
            </CardHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 text-xs">Cliente</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{pedido.cliente_nome}</dd>
              </div>
              {pedido.cliente_telefone && (
                <div>
                  <dt className="text-gray-500 text-xs">Telefone</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{pedido.cliente_telefone}</dd>
                </div>
              )}
              {pedido.data_entrega && (
                <div>
                  <dt className="text-gray-500 text-xs">Data de entrega</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{formatDate(pedido.data_entrega)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 text-xs">Criado em</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{formatDateTime(pedido.created_at)}</dd>
              </div>
            </dl>
            {pedido.observacoes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Observações</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{pedido.observacoes}</p>
              </div>
            )}
          </Card>

          {/* Items */}
          {pedido.itens_pedido && pedido.itens_pedido.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {pedido.itens_pedido.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.nome_produto}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantidade} × {formatCurrency(item.preco_unitario)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.quantidade * item.preco_unitario)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-base font-bold text-primary-700">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar: status + actions */}
        <div className="space-y-4">
          {/* Quick actions */}
          {canMoveToProducao && (
            <Card padding="sm">
              <Button
                className="w-full"
                leftIcon={<Zap className="w-4 h-4" />}
                onClick={handleMoveToProducao}
                loading={isUpdating}
              >
                Mover para Produção
              </Button>
            </Card>
          )}

          {/* Status editor */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              {!editingStatus && (
                <button
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  onClick={() => {
                    setSelectedStatus(pedido.status)
                    setEditingStatus(true)
                  }}
                >
                  Editar
                </button>
              )}
            </CardHeader>

            {editingStatus ? (
              <div className="space-y-3">
                <Select
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as PedidoStatus)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStatusSave} loading={isUpdating} className="flex-1">
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingStatus(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <StatusTimeline
                currentStatus={pedido.status}
                createdAt={pedido.created_at}
                updatedAt={pedido.updated_at}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
