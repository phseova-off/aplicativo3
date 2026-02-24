'use client'

import { FinanceiroNav } from '@/features/financeiro/components/FinanceiroNav'
import { AnaliseClientes } from '@/features/financeiro/components/AnaliseClientes'

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Análise de comportamento e valor dos clientes
        </p>
      </div>

      <FinanceiroNav />

      <AnaliseClientes />
    </div>
  )
}
