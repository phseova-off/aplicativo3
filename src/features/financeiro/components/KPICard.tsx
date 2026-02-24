'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type { KPIComparativo } from '../types/financeiro.types'

interface KPICardProps {
  label: string
  kpi: KPIComparativo
  formato?: 'moeda' | 'percentual'
  inverterCor?: boolean // para despesas: alta = ruim (vermelho)
}

export function KPICard({ label, kpi, formato = 'moeda', inverterCor = false }: KPICardProps) {
  const valorFormatado = formato === 'moeda'
    ? formatCurrency(kpi.valor)
    : `${kpi.valor.toFixed(1)}%`

  const isAlta = kpi.tendencia === 'alta'
  const isBaixa = kpi.tendencia === 'baixa'

  // Alta é boa por padrão; se inverterCor, alta é ruim
  const corBoa = inverterCor ? isBaixa : isAlta
  const corRuim = inverterCor ? isAlta : isBaixa

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-500">{label}</p>

      <p className={cn(
        'text-2xl font-bold',
        corBoa ? 'text-green-700' : corRuim ? 'text-red-600' : 'text-gray-900'
      )}>
        {valorFormatado}
      </p>

      <div className="flex items-center gap-1.5 text-xs">
        {isAlta ? (
          <TrendingUp className={cn('w-3.5 h-3.5', corBoa ? 'text-green-600' : 'text-red-500')} />
        ) : isBaixa ? (
          <TrendingDown className={cn('w-3.5 h-3.5', corBoa ? 'text-green-600' : 'text-red-500')} />
        ) : (
          <Minus className="w-3.5 h-3.5 text-gray-400" />
        )}

        <span className={cn(
          'font-medium',
          corBoa ? 'text-green-600' : corRuim ? 'text-red-500' : 'text-gray-500'
        )}>
          {kpi.variacao > 0 ? '+' : ''}{kpi.variacao.toFixed(1)}%
        </span>

        <span className="text-gray-400">vs mês anterior</span>
      </div>
    </Card>
  )
}
