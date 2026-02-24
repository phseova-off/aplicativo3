'use client'

import { FinanceiroNav } from '@/features/financeiro/components/FinanceiroNav'
import { CalculadoraPrecificacao } from '@/features/financeiro/components/CalculadoraPrecificacao'

export default function PrecificacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calculadora de precificação transparente — veja o custo real de cada produto
        </p>
      </div>

      <FinanceiroNav />

      <div className="max-w-2xl">
        <CalculadoraPrecificacao />
      </div>
    </div>
  )
}
