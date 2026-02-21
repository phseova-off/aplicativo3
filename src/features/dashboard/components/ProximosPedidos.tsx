import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import type { ProximoPedido } from '../types/dashboard.types'

const STATUS_LABELS: Record<string, string> = {
  novo:       'Novo',
  confirmado: 'Confirmado',
  producao:   'Em produção',
  pronto:     'Pronto',
  entregue:   'Entregue',
  cancelado:  'Cancelado',
}

const STATUS_VARIANTS: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'error' | 'default'> = {
  novo:       'warning',
  confirmado: 'info',
  producao:   'purple',
  pronto:     'success',
  entregue:   'default',
  cancelado:  'error',
}

interface Props {
  pedidos: ProximoPedido[]
}

export function ProximosPedidos({ pedidos }: Props) {
  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <CardHeader className="mb-0">
          <CardTitle>Próximas entregas</CardTitle>
          <Link
            href="/pedidos"
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
      </div>

      {pedidos.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-gray-500">
          Nenhum pedido pendente.{' '}
          <Link href="/pedidos" className="text-primary-600 hover:underline">
            Criar pedido
          </Link>
        </div>
      ) : (
        <div className="border-t border-gray-100">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100">
            <span>Cliente</span>
            <span className="text-right">Entrega</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Status</span>
          </div>

          {pedidos.map((p) => (
            <Link
              key={p.id}
              href={`/pedidos/${p.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <span className="text-sm font-medium text-gray-900 truncate">{p.cliente_nome}</span>
              <span className="text-xs text-gray-500 text-right whitespace-nowrap">
                {p.data_entrega ? formatDate(p.data_entrega.split('T')[0]) : '—'}
              </span>
              <span className="text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                {formatCurrency(p.valor_total)}
              </span>
              <div className="flex justify-end">
                <Badge variant={STATUS_VARIANTS[p.status] ?? 'default'}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
