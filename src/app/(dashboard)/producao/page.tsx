'use client'

import Link from 'next/link'
import { CalendarDays, BookOpen, AlertTriangle, CakeSlice } from 'lucide-react'
import { ProducaoCard } from '@/features/producao/components/ProducaoCard'
import { useProducaoDiario } from '@/features/producao/hooks/useProducaoDiario'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { Badge } from '@/shared/components/ui/Badge'
import type { PedidoProducao } from '@/features/producao/types/producao.types'

function AlertasIngredientes({ pedidos }: { pedidos: PedidoProducao[] }) {
  // Aggregate ingredients across all confirmed pedidos this week
  const ingredienteMap = new Map<string, number>()
  pedidos.forEach((p) => {
    ;(p.itens_pedido ?? []).forEach((item) => {
      const key = item.nome_produto
      ingredienteMap.set(key, (ingredienteMap.get(key) ?? 0) + item.quantidade)
    })
  })

  const top = Array.from(ingredienteMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (top.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          Itens mais demandados esta semana
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {top.map(([nome, qtd]) => (
          <span
            key={nome}
            className="inline-flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {nome}
            <span className="bg-amber-100 rounded-full px-1.5 font-bold">{qtd}×</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ProducaoPage() {
  const { data: pedidos = [], isLoading } = useProducaoDiario()

  const hoje = new Date().toISOString().split('T')[0]
  const confirmados = pedidos.filter((p) => p.status === 'confirmado')
  const emProducao  = pedidos.filter((p) => p.status === 'producao')
  const atrasados   = pedidos.filter(
    (p) => p.data_entrega && p.data_entrega < hoje + 'T'
  )
  const paraHoje = pedidos.filter((p) => p.data_entrega?.startsWith(hoje))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produção</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            O que produzir hoje com base nos pedidos confirmados
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/producao/planejamento"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Planejamento
          </Link>
          <Link
            href="/producao/receitas"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Receitas
          </Link>
        </div>
      </div>

      {/* Stats summary */}
      {pedidos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total pendente', value: pedidos.length, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Confirmados', value: confirmados.length, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Em produção', value: emProducao.length, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Atrasados', value: atrasados.length, color: 'text-red-700', bg: 'bg-red-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {pedidos.length > 0 && <AlertasIngredientes pedidos={pedidos} />}

      {isLoading ? (
        <PageLoader />
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <CakeSlice className="w-12 h-12 mb-3 text-gray-200" />
          <p className="font-medium text-gray-600">Nenhum pedido para produzir</p>
          <p className="text-sm mt-1">Pedidos confirmados e em produção aparecem aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's orders */}
          {paraHoje.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-800">Entregas hoje</h2>
                <Badge variant="error">{paraHoje.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paraHoje.map((p) => (
                  <ProducaoCard key={p.id} pedido={p} urgente />
                ))}
              </div>
            </section>
          )}

          {/* Em produção */}
          {emProducao.filter((p) => !p.data_entrega?.startsWith(hoje)).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-800">Em produção</h2>
                <Badge variant="info">{emProducao.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {emProducao
                  .filter((p) => !p.data_entrega?.startsWith(hoje))
                  .map((p) => (
                    <ProducaoCard key={p.id} pedido={p} />
                  ))}
              </div>
            </section>
          )}

          {/* Confirmados (awaiting start) */}
          {confirmados.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-800">Aguardando início</h2>
                <Badge variant="warning">{confirmados.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {confirmados.map((p) => (
                  <ProducaoCard key={p.id} pedido={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
