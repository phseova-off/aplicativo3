'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingBag } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { formatCurrency } from '@/shared/lib/utils'
import type { Transacao } from '@/server/db/types'

interface ResumoFinanceiroProps {
  transacoes: Transacao[]
}

export function ResumoFinanceiro({ transacoes }: ResumoFinanceiroProps) {
  const receitas = transacoes.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = transacoes.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const lucro = receitas - despesas
  const totalReceitas = transacoes.filter((t) => t.tipo === 'receita').length

  const stats = [
    {
      label: 'Receitas',
      value: formatCurrency(receitas),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Despesas',
      value: formatCurrency(despesas),
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Lucro Líquido',
      value: formatCurrency(lucro),
      icon: DollarSign,
      color: lucro >= 0 ? 'text-primary-600' : 'text-red-600',
      bg: lucro >= 0 ? 'bg-primary-50' : 'bg-red-50',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(totalReceitas > 0 ? receitas / totalReceitas : 0),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} padding="md">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
