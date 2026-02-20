import { Badge } from '@/shared/components/ui/Badge'
import { PEDIDO_STATUS_LABELS, PEDIDO_STATUS_VARIANTS, type PedidoStatus } from '../types/pedido.types'

export function PedidoStatusBadge({ status }: { status: PedidoStatus }) {
  return (
    <Badge variant={PEDIDO_STATUS_VARIANTS[status]}>
      {PEDIDO_STATUS_LABELS[status]}
    </Badge>
  )
}
