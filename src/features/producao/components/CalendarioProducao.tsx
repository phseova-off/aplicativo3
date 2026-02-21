'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Package } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'
import type { PedidoProducao, DiaSemana } from '../types/producao.types'

interface CalendarioProducaoProps {
  pedidos: PedidoProducao[]
  semanaInicio: Date
  onSemanaChange: (delta: number) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDia(date: Date): string {
  return `${DIAS_SEMANA[date.getDay()]} ${date.getDate()}`
}

export function CalendarioProducao({ pedidos, semanaInicio, onSemanaChange }: CalendarioProducaoProps) {
  // Build 7-day week starting from semanaInicio (adjusted to Monday)
  const dias = useMemo<DiaSemana[]>(() => {
    const week: DiaSemana[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(semanaInicio)
      d.setDate(d.getDate() + i)
      const iso = d.toISOString().split('T')[0]

      const dayPedidos = pedidos.filter((p) => p.data_entrega?.startsWith(iso))
      const valorTotal = dayPedidos.reduce((s, p) => s + p.valor_total, 0)

      week.push({
        data: iso,
        label: formatDia(d),
        pedidos: dayPedidos,
        custo_estimado: 0,
        valor_total: valorTotal,
      })
    }
    return week
  }, [pedidos, semanaInicio])

  // Group products across week for optimization
  const agrupamentoProdutos = useMemo(() => {
    const map = new Map<string, number>()
    pedidos.forEach((p) => {
      ;(p.itens_pedido ?? []).forEach((it) => {
        map.set(it.nome_produto, (map.get(it.nome_produto) ?? 0) + it.quantidade)
      })
    })
    return Array.from(map.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
  }, [pedidos])

  const mesLabel = `${MESES[semanaInicio.getMonth()]} ${semanaInicio.getFullYear()}`
  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSemanaChange(-7)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Calendar className="w-4 h-4 text-primary-600" />
          {mesLabel} — Semana de {dias[0]?.label} a {dias[6]?.label}
        </div>
        <button
          onClick={() => onSemanaChange(7)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
        {dias.map((dia) => {
          const isHoje = dia.data === hoje
          const isWeekend = new Date(dia.data + 'T12:00').getDay() % 6 === 0

          return (
            <div
              key={dia.data}
              className={[
                'flex flex-col rounded-xl border min-h-[140px] p-2 transition-all',
                isHoje
                  ? 'border-primary-400 bg-primary-50 shadow-sm'
                  : isWeekend
                  ? 'border-gray-100 bg-gray-50'
                  : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              {/* Day header */}
              <div className={[
                'text-xs font-semibold mb-2 pb-1.5 border-b flex items-center justify-between',
                isHoje ? 'border-primary-200 text-primary-700' : 'border-gray-100 text-gray-500',
              ].join(' ')}>
                <span>{dia.label}</span>
                {dia.pedidos.length > 0 && (
                  <span className={[
                    'text-xs rounded-full px-1.5 font-bold',
                    isHoje ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700',
                  ].join(' ')}>
                    {dia.pedidos.length}
                  </span>
                )}
              </div>

              {/* Pedidos */}
              <div className="flex-1 space-y-1.5">
                {dia.pedidos.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-100 rounded-lg p-1.5 shadow-xs"
                  >
                    <p className="text-xs font-medium text-gray-800 truncate">{p.cliente_nome}</p>
                    <p className="text-xs text-primary-600 font-bold">{formatCurrency(p.valor_total)}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.itens_pedido?.map((i) => i.nome_produto).join(', ')}
                    </p>
                  </div>
                ))}
                {dia.pedidos.length > 3 && (
                  <p className="text-xs text-gray-400 pl-1">+{dia.pedidos.length - 3} mais</p>
                )}
              </div>

              {/* Day total */}
              {dia.valor_total > 0 && (
                <div className="mt-2 pt-1.5 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center">
                    {formatCurrency(dia.valor_total)}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Product grouping for optimization */}
      {agrupamentoProdutos.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-800">
              Agrupamento para otimizar produção da semana
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {agrupamentoProdutos.map(({ nome, quantidade }) => (
              <div
                key={nome}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100 shadow-xs"
              >
                <span className="text-xs text-gray-700 truncate">{nome}</span>
                <span className="text-xs font-bold text-blue-700 ml-2 flex-shrink-0">
                  {quantidade}un
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
