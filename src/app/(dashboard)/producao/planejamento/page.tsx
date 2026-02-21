'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CalendarioProducao } from '@/features/producao/components/CalendarioProducao'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { useProducaoDiario } from '@/features/producao/hooks/useProducaoDiario'
import { formatCurrency } from '@/shared/lib/utils'

/** Returns the Monday of the week containing `date` */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PlanejamentoPage() {
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => getMondayOf(new Date()))
  const { data: pedidos = [], isLoading } = useProducaoDiario()

  function handleSemanaChange(delta: number) {
    setSemanaInicio((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      return d
    })
  }

  // Stats for selected week
  const weekStart = semanaInicio.toISOString().split('T')[0]
  const weekEnd = (() => {
    const d = new Date(semanaInicio)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  })()

  const pedidosSemana = useMemo(
    () =>
      pedidos.filter((p) => {
        if (!p.data_entrega) return false
        const d = p.data_entrega.split('T')[0]
        return d >= weekStart && d <= weekEnd
      }),
    [pedidos, weekStart, weekEnd]
  )

  const totalSemana = pedidosSemana.reduce((s, p) => s + p.valor_total, 0)
  const totalItens = pedidosSemana.reduce(
    (s, p) => s + (p.itens_pedido ?? []).reduce((si, it) => si + it.quantidade, 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/producao"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Produção
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Planejamento Semanal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visão dos pedidos agrupados por dia de entrega
          </p>
        </div>
      </div>

      {/* Week summary */}
      {pedidosSemana.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-primary-700">{pedidosSemana.length}</p>
            <p className="text-xs text-gray-500">pedidos na semana</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalSemana)}</p>
            <p className="text-xs text-gray-500">valor total</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-blue-700">{totalItens}</p>
            <p className="text-xs text-gray-500">itens a produzir</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <PageLoader />
      ) : (
        <CalendarioProducao
          pedidos={pedidos}
          semanaInicio={semanaInicio}
          onSemanaChange={handleSemanaChange}
        />
      )}
    </div>
  )
}
