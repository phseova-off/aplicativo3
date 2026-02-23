'use client'

import type { LoteStatus } from '@/server/db/types'

interface ProgressoLoteProps {
  status: LoteStatus
  progresso?: number // 0–100, usado quando status='em_andamento'
  showLabel?: boolean
}

const STATUS_CONFIG: Record<LoteStatus, {
  label: string
  barColor: string
  bgColor: string
  textColor: string
  width: string
}> = {
  planejado: {
    label: 'Planejado',
    barColor: 'bg-gray-300',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    width: '0%',
  },
  em_andamento: {
    label: 'Em andamento',
    barColor: 'bg-yellow-400',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    width: '50%',
  },
  concluido: {
    label: 'Concluído',
    barColor: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    width: '100%',
  },
  cancelado: {
    label: 'Cancelado',
    barColor: 'bg-red-400',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    width: '100%',
  },
}

export function ProgressoLote({ status, progresso, showLabel = true }: ProgressoLoteProps) {
  const cfg = STATUS_CONFIG[status]
  const barWidth = status === 'em_andamento' && progresso !== undefined
    ? `${Math.max(10, progresso)}%`
    : cfg.width

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${cfg.textColor}`}>{cfg.label}</span>
          {status === 'em_andamento' && progresso !== undefined && (
            <span className={`${cfg.textColor}`}>{progresso}%</span>
          )}
          {status === 'concluido' && (
            <span className="text-green-600">✓</span>
          )}
          {status === 'cancelado' && (
            <span className="text-red-500">✗</span>
          )}
        </div>
      )}
      <div className={`w-full h-2 rounded-full overflow-hidden ${cfg.bgColor}`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${cfg.barColor} ${
            status === 'cancelado' ? 'opacity-60' : ''
          }`}
          style={{ width: barWidth }}
        />
      </div>
    </div>
  )
}

/** Badge compacto para exibir status em listas */
export function LoteStatusBadge({ status }: { status: LoteStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.textColor} ${cfg.bgColor}`}
    >
      {cfg.label}
    </span>
  )
}
