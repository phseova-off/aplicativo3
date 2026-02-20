import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import type { PedidoRecente } from '../types/dashboard.types'

const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'purple' | 'error' | 'default'> = {
  pendente: 'warning',
  em_producao: 'info',
  pronto: 'success',
  entregue: 'purple',
  cancelado: 'error',
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

interface PedidosRecentesProps {
  pedidos: PedidoRecente[]
}

export function PedidosRecentes({ pedidos }: PedidosRecentesProps) {
  return (
    <Card padding="none">
      <div className="p-6">
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <Link
            href="/pedidos"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
      </div>

      {pedidos.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-gray-500">
          Nenhum pedido ainda.{' '}
          <Link href="/pedidos" className="text-primary-600 hover:underline">
            Criar primeiro pedido
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {pedidos.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/pedidos/${pedido.id}`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {pedido.cliente_nome}
                </p>
                {pedido.data_entrega && (
                  <p className="text-xs text-gray-500">
                    Entrega: {formatDate(pedido.data_entrega)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariants[pedido.status] ?? 'default'}>
                  {statusLabels[pedido.status] ?? pedido.status}
                </Badge>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(pedido.valor)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
