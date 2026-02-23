'use client'

import { AlertTriangle, Clock } from 'lucide-react'

interface AlertaCargaDiaProps {
  tempoMinutos: number
  /** Limiar de alerta em minutos (default: 360 = 6 horas) */
  limiarMinutos?: number
}

function formatarTempo(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export function AlertaCargaDia({
  tempoMinutos,
  limiarMinutos = 360,
}: AlertaCargaDiaProps) {
  const sobrecarregado = tempoMinutos > limiarMinutos
  const percentual = Math.min(Math.round((tempoMinutos / limiarMinutos) * 100), 150)

  if (tempoMinutos === 0) return null

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
        sobrecarregado
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      {sobrecarregado ? (
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-tight">
          {sobrecarregado
            ? `Dia sobrecarregado: ${formatarTempo(tempoMinutos)} estimado`
            : `Tempo estimado: ${formatarTempo(tempoMinutos)}`}
        </p>
        {sobrecarregado && (
          <p className="text-xs mt-0.5 opacity-80">
            Acima de {formatarTempo(limiarMinutos)} recomendado. Considere reorganizar os pedidos.
          </p>
        )}
        {/* Barra de progresso */}
        <div className="mt-2 w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${
              sobrecarregado ? 'bg-red-400' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
