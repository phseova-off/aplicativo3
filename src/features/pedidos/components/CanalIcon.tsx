import { MessageCircle, Instagram, Store } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { PedidoCanal } from '@/server/db/types'
import { PEDIDO_CANAL_LABELS } from '../types/pedido.types'

interface CanalIconProps {
  canal: PedidoCanal
  showLabel?: boolean
  className?: string
  size?: 'sm' | 'md'
}

const canalConfig: Record<
  PedidoCanal,
  { icon: React.ElementType; color: string; bg: string }
> = {
  whatsapp:   { icon: MessageCircle, color: 'text-green-600',  bg: 'bg-green-100'  },
  instagram:  { icon: Instagram,     color: 'text-pink-600',   bg: 'bg-pink-100'   },
  presencial: { icon: Store,         color: 'text-blue-600',   bg: 'bg-blue-100'   },
}

export function CanalIcon({ canal, showLabel = false, className, size = 'sm' }: CanalIconProps) {
  const cfg = canalConfig[canal]
  const Icon = cfg.icon
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const badgeSize = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'

  if (showLabel) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium',
          cfg.bg,
          cfg.color,
          badgeSize,
          className
        )}
      >
        <Icon className={iconSize} />
        {PEDIDO_CANAL_LABELS[canal]}
      </span>
    )
  }

  return (
    <span
      title={PEDIDO_CANAL_LABELS[canal]}
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full',
        cfg.bg,
        cfg.color,
        className
      )}
    >
      <Icon className={iconSize} />
    </span>
  )
}
