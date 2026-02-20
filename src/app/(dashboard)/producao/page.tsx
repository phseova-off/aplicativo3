'use client'

import { ProducaoKanban } from '@/features/producao/components/ProducaoKanban'

export default function ProducaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produção</h1>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhe o progresso de cada pedido em produção
        </p>
      </div>

      <ProducaoKanban />
    </div>
  )
}
