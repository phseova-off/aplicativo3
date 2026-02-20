'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { PedidoStatusBadge } from '@/features/pedidos/components/PedidoStatusBadge'
import { usePedido, useDeletePedido } from '@/features/pedidos/hooks/usePedidos'
import { formatCurrency, formatDate, formatDateTime } from '@/shared/lib/utils'

interface PedidoDetailPageProps {
  params: Promise<{ id: string }>
}

export default function PedidoDetailPage({ params }: PedidoDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: pedido, isLoading } = usePedido(id)
  const { mutate: deletePedido, isPending: isDeleting } = useDeletePedido()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pedido não encontrado.</p>
        <Button variant="ghost" onClick={() => router.push('/pedidos')} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return
    deletePedido(id, { onSuccess: () => router.push('/pedidos') })
  }

  const total = pedido.itens_pedido?.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  ) ?? pedido.valor

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/pedidos')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{pedido.cliente_nome}</h1>
          <p className="text-sm text-gray-500">Pedido #{id.slice(0, 8)}</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Pedido</CardTitle>
          <PedidoStatusBadge status={pedido.status} />
        </CardHeader>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Cliente</dt>
            <dd className="font-medium text-gray-900">{pedido.cliente_nome}</dd>
          </div>
          {pedido.cliente_telefone && (
            <div>
              <dt className="text-gray-500">Telefone</dt>
              <dd className="font-medium text-gray-900">{pedido.cliente_telefone}</dd>
            </div>
          )}
          {pedido.data_entrega && (
            <div>
              <dt className="text-gray-500">Data de entrega</dt>
              <dd className="font-medium text-gray-900">{formatDate(pedido.data_entrega)}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Valor total</dt>
            <dd className="font-bold text-primary-700 text-base">{formatCurrency(total)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Criado em</dt>
            <dd className="font-medium text-gray-900">{formatDateTime(pedido.created_at)}</dd>
          </div>
        </dl>
        {pedido.descricao && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Descrição</p>
            <p className="text-sm text-gray-900 mt-1">{pedido.descricao}</p>
          </div>
        )}
        {pedido.observacoes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Observações</p>
            <p className="text-sm text-gray-900 mt-1">{pedido.observacoes}</p>
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
                  <p className="text-sm font-medium text-gray-900">{item.produto}</p>
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
  )
}
