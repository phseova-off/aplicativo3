'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { useResumoMes } from '../hooks/useFinanceiro'

// ─── Month navigation helpers ─────────────────────────────────

export function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function labelMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  const d = new Date(ano, m - 1, 1)
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// ─── Component ────────────────────────────────────────────────

interface ResumoMesProps {
  mes: string
  onChangeMes: (mes: string) => void
}

export function ResumoMes({ mes, onChangeMes }: ResumoMesProps) {
  const { data, isLoading } = useResumoMes(mes)

  const receitas     = data?.receitas     ?? 0
  const despesas     = data?.despesas     ?? 0
  const lucroLiquido = data?.lucroLiquido ?? 0

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChangeMes(addMeses(mes, -1))}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[180px] text-center">
          {labelMes(mes)}
        </span>
        <button
          onClick={() => onChangeMes(addMeses(mes, 1))}
          disabled={mes >= mesAtual()}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIBox
          label="Total Receitas"
          valor={receitas}
          cor="green"
          qtd={data?.qtdReceitas}
          isLoading={isLoading}
        />
        <KPIBox
          label="Total Despesas"
          valor={despesas}
          cor="red"
          qtd={data?.qtdDespesas}
          isLoading={isLoading}
        />
        <KPIBox
          label="Lucro Líquido"
          valor={lucroLiquido}
          cor={lucroLiquido >= 0 ? 'blue' : 'red'}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

// ─── KPI box ──────────────────────────────────────────────────

const COR = {
  green: {
    bg:    'bg-green-50',
    border: 'border-green-200',
    value: 'text-green-700',
    label: 'text-green-600',
  },
  red: {
    bg:    'bg-red-50',
    border: 'border-red-200',
    value: 'text-red-700',
    label: 'text-red-600',
  },
  blue: {
    bg:    'bg-blue-50',
    border: 'border-blue-200',
    value: 'text-blue-700',
    label: 'text-blue-600',
  },
} as const

function KPIBox({
  label, valor, cor, qtd, isLoading,
}: {
  label: string
  valor: number
  cor: keyof typeof COR
  qtd?: number
  isLoading: boolean
}) {
  const c = COR[cor]
  return (
    <div className={cn('rounded-xl border p-5', c.bg, c.border)}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', c.label)}>{label}</p>
      {isLoading ? (
        <div className="h-8 w-32 bg-white/60 rounded animate-pulse mt-2" />
      ) : (
        <p className={cn('text-2xl font-bold mt-1', c.value)}>{formatCurrency(valor)}</p>
      )}
      {qtd !== undefined && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">{qtd} transaç{qtd !== 1 ? 'ões' : 'ão'}</p>
      )}
    </div>
  )
}
