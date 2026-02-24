'use client'

import { FinanceiroNav } from '@/features/financeiro/components/FinanceiroNav'
import { ExtratoCompleto } from '@/features/financeiro/components/ExtratoCompleto'

export default function TransacoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Extrato completo de receitas e despesas
        </p>
      </div>

      <FinanceiroNav />

      <ExtratoCompleto />
    </div>
  )
}
