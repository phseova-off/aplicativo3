'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'
import type { AlertaIngredienteUI } from '../types/financeiro.types'

interface Props {
  alertas: AlertaIngredienteUI[]
  totalDesatualizados: number
}

export function AlertaPrecos({ alertas, totalDesatualizados }: Props) {
  if (!totalDesatualizados && !alertas.length) return null

  const alertaMaisRecente = alertas[0]

  return (
    <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-yellow-800">
          {totalDesatualizados} produto{totalDesatualizados !== 1 ? 's' : ''} podem estar com preço desatualizado
        </p>

        {alertaMaisRecente && (
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            <p className="text-sm text-yellow-700">
              O custo de{' '}
              <strong className="font-semibold">{alertaMaisRecente.ingrediente_nome}</strong>
              {' '}subiu{' '}
              <span className="inline-flex items-center gap-0.5 font-semibold text-yellow-800">
                <TrendingUp className="w-3.5 h-3.5" />
                {alertaMaisRecente.variacao_percentual.toFixed(0)}%
              </span>
              {' '}desde a sua última precificação.
            </p>
          </div>
        )}

        {alertas.length > 1 && (
          <p className="text-xs text-yellow-600 mt-1">
            +{alertas.length - 1} outro{alertas.length - 1 !== 1 ? 's' : ''} ingrediente{alertas.length - 1 !== 1 ? 's' : ''} com variação de preço.
          </p>
        )}

        <a
          href="/financeiro/precificacao"
          className="mt-2 inline-block text-xs font-semibold text-yellow-800 underline underline-offset-2 hover:text-yellow-900 transition-colors"
        >
          Recalcular preços →
        </a>
      </div>
    </div>
  )
}
