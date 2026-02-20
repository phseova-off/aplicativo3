'use client'

import { useProducao, useUpdateProducao } from '../hooks/useProducao'
import { ETAPA_LABELS, ETAPA_EMOJIS, ETAPAS_ORDER, type ProducaoEtapa, type ProducaoWithPedido } from '../types/producao.types'
import { ProducaoCard } from './ProducaoCard'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { CakeSlice } from 'lucide-react'

export function ProducaoKanban() {
  const { data: items = [], isLoading } = useProducao()
  const updateMutation = useUpdateProducao()

  if (isLoading) return <PageLoader />

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <CakeSlice className="w-12 h-12 mb-3 text-gray-300" />
        <p className="font-medium text-gray-700">Sem itens em produção</p>
        <p className="text-sm mt-1">Os pedidos em produção aparecerão aqui.</p>
      </div>
    )
  }

  const byEtapa = ETAPAS_ORDER.reduce<Record<ProducaoEtapa, ProducaoWithPedido[]>>(
    (acc, etapa) => {
      acc[etapa] = items.filter((i) => i.etapa === etapa)
      return acc
    },
    {} as Record<ProducaoEtapa, ProducaoWithPedido[]>
  )

  function handleMove(item: ProducaoWithPedido, direction: 'next' | 'prev') {
    const idx = ETAPAS_ORDER.indexOf(item.etapa)
    const nextEtapa = direction === 'next' ? ETAPAS_ORDER[idx + 1] : ETAPAS_ORDER[idx - 1]
    if (!nextEtapa) return
    updateMutation.mutate({ id: item.id, data: { etapa: nextEtapa } })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {ETAPAS_ORDER.map((etapa) => (
        <div key={etapa} className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{ETAPA_EMOJIS[etapa]}</span>
            <h3 className="text-sm font-semibold text-gray-700">{ETAPA_LABELS[etapa]}</h3>
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {byEtapa[etapa].length}
            </span>
          </div>
          <div className="flex flex-col gap-2 min-h-[100px]">
            {byEtapa[etapa].map((item) => (
              <ProducaoCard
                key={item.id}
                item={item}
                onNext={() => handleMove(item, 'next')}
                onPrev={() => handleMove(item, 'prev')}
                canNext={ETAPAS_ORDER.indexOf(etapa) < ETAPAS_ORDER.length - 1}
                canPrev={ETAPAS_ORDER.indexOf(etapa) > 0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
