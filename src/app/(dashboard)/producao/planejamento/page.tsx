'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, RefreshCw, Clock } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarioProducao } from '@/features/producao/components/CalendarioProducao'
import { AlertaCargaDia } from '@/features/producao/components/AlertaCargaDia'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { formatCurrency } from '@/shared/lib/utils'
import type { PedidoProducao } from '@/features/producao/types/producao.types'

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatarTempo(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

interface SemanaData {
  inicio: string
  fim: string
  dias: Array<{
    data: string
    pedidos: PedidoProducao[]
    total_pedidos: number
    total_valor: number
    tempo_estimado_minutos: number
    sobrecarregado: boolean
    agrupamento_produtos: Array<{ nome: string; quantidade: number; produto_id: string | null }>
  }>
}

async function fetchSemana(inicio: string): Promise<SemanaData> {
  const res = await fetch(`/api/producao/semana?inicio=${inicio}`)
  if (!res.ok) throw new Error('Erro ao carregar semana')
  return res.json()
}

export default function PlanejamentoPage() {
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => getMondayOf(new Date()))

  const inicioStr = semanaInicio.toISOString().split('T')[0]

  const { data: semana, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['producao', 'semana', inicioStr],
    queryFn: () => fetchSemana(inicioStr),
    staleTime: 10 * 60 * 1000, // 10 min
  })

  function handleSemanaChange(delta: number) {
    setSemanaInicio((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      return d
    })
  }

  // Stats da semana
  const stats = useMemo(() => {
    if (!semana) return { pedidos: 0, valor: 0, tempo: 0, diasSobrecarregados: 0 }
    return semana.dias.reduce(
      (acc, dia) => ({
        pedidos: acc.pedidos + dia.total_pedidos,
        valor: acc.valor + dia.total_valor,
        tempo: acc.tempo + dia.tempo_estimado_minutos,
        diasSobrecarregados: acc.diasSobrecarregados + (dia.sobrecarregado ? 1 : 0),
      }),
      { pedidos: 0, valor: 0, tempo: 0, diasSobrecarregados: 0 }
    )
  }, [semana])

  // Todos os pedidos da semana (para CalendarioProducao legacy)
  const pedidosSemana = useMemo(
    () => semana?.dias.flatMap((d) => d.pedidos) ?? [],
    [semana]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/producao"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />Produção
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Planejamento Semanal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pedidos agrupados por dia com estimativa de tempo</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Week summary */}
      {stats.pedidos > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-primary-700">{stats.pedidos}</p>
            <p className="text-xs text-gray-500">pedidos na semana</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{formatCurrency(stats.valor)}</p>
            <p className="text-xs text-gray-500">valor total</p>
          </div>
          {stats.tempo > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
              <div className="flex items-center gap-1 justify-center">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-xl font-bold text-blue-700">{formatarTempo(stats.tempo)}</p>
              </div>
              <p className="text-xs text-gray-500">estimado na semana</p>
            </div>
          )}
          {stats.diasSobrecarregados > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-bold text-red-600">{stats.diasSobrecarregados}</p>
              <p className="text-xs text-gray-500">dia{stats.diasSobrecarregados !== 1 ? 's' : ''} sobrecarregado{stats.diasSobrecarregados !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Alertas de carga por dia */}
      {semana?.dias.some((d) => d.tempo_estimado_minutos > 0) && (
        <div className="space-y-2">
          {semana.dias.filter((d) => d.tempo_estimado_minutos > 0).map((dia) => {
            const d = new Date(dia.data + 'T12:00')
            const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <div key={dia.data} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0 capitalize">{label}</span>
                <div className="flex-1">
                  <AlertaCargaDia tempoMinutos={dia.tempo_estimado_minutos} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dica de reorganização se algum dia sobrecarregado */}
      {stats.diasSobrecarregados > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">💡 Sugestão de reorganização</p>
          <p className="text-xs">
            {stats.diasSobrecarregados} dia{stats.diasSobrecarregados !== 1 ? 's têm' : ' tem'} mais de 6h de produção estimada.
            Considere reagendar pedidos menos urgentes para dias mais leves —
            abra o pedido e altere a data de entrega, o lote será reposicionado automaticamente.
          </p>
        </div>
      )}

      {isLoading ? (
        <PageLoader />
      ) : (
        <CalendarioProducao
          pedidos={pedidosSemana}
          semanaInicio={semanaInicio}
          onSemanaChange={handleSemanaChange}
        />
      )}
    </div>
  )
}
