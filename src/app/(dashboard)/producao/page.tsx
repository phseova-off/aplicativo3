'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, BookOpen, CakeSlice, Play, CheckCircle,
  XCircle, Clock, Calendar, Package, Loader2, ChevronRight, ShoppingBasket,
} from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { ProgressoLote, LoteStatusBadge } from '@/features/producao/components/ProgressoLote'
import { ModalConclusao } from '@/features/producao/components/ModalConclusao'
import {
  useLotesHoje,
  useIniciarLote,
  useConcluirLote,
  useCancelarLote,
  type LoteHoje,
} from '@/features/producao/hooks/useLotesHoje'
import type { ConcluirLoteValues } from '@/features/producao/schemas/producao.schema'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

function LoteCard({
  lote,
  onIniciar,
  onConcluir,
}: {
  lote: LoteHoje
  onIniciar: (id: string) => void
  onConcluir: (lote: LoteHoje) => void
}) {
  const { mutate: cancelar, isPending: isCancelando } = useCancelarLote()
  const isAtrasado = lote.urgencia === 'atrasado'
  const isHoje = lote.data_producao === new Date().toISOString().split('T')[0]

  return (
    <Card
      padding="sm"
      className={[
        'transition-all',
        isAtrasado ? 'border-red-300 bg-red-50' : '',
        lote.status === 'concluido' ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">{lote.nome_produto}</p>
            {isAtrasado && <Badge variant="error">Atrasado</Badge>}
            {isHoje && !isAtrasado && <Badge variant="warning">Hoje</Badge>}
            <LoteStatusBadge status={lote.status} />
          </div>
          {lote.pedido && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <span className="font-medium">{lote.pedido.cliente_nome}</span>
              {lote.pedido.data_entrega && (
                <>
                  <span className="text-gray-300">·</span>
                  <Calendar className="w-3 h-3" />
                  {formatDate(lote.pedido.data_entrega)}
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-800">
            {lote.quantidade_planejada}<span className="text-xs font-normal text-gray-400 ml-0.5">un</span>
          </p>
          {lote.custo_estimado > 0 && (
            <p className="text-xs text-gray-400">{formatCurrency(lote.custo_estimado)}</p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <ProgressoLote status={lote.status} progresso={lote.progresso} />
      </div>

      {lote.status === 'concluido' && lote.custo_real != null && (
        <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 mb-3">
          <Package className="w-3 h-3" />
          Custo real: <strong className="ml-1">{formatCurrency(lote.custo_real)}</strong>
          {lote.quantidade_produzida !== lote.quantidade_planejada && (
            <span className="ml-1 text-amber-600">({lote.quantidade_produzida} produzidos)</span>
          )}
        </div>
      )}

      {lote.pedido_id && (
        <Link href={`/pedidos/${lote.pedido_id}`}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mb-2">
          Ver pedido <ChevronRight className="w-3 h-3" />
        </Link>
      )}

      {lote.status === 'planejado' && (
        <Button size="sm" className="w-full" leftIcon={<Play className="w-3.5 h-3.5" />}
          onClick={() => onIniciar(lote.id)}>
          Iniciar Produção
        </Button>
      )}

      {lote.status === 'em_andamento' && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1"
            leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
            onClick={() => onConcluir(lote)}>
            Concluir
          </Button>
          <button
            onClick={() => { if (confirm('Cancelar este lote? O histórico será mantido.')) cancelar(lote.id) }}
            disabled={isCancelando}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
            title="Cancelar lote"
          >
            {isCancelando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </Card>
  )
}

export default function ProducaoPage() {
  const { data: lotes = [], isLoading } = useLotesHoje()
  const { mutateAsync: iniciarLote, isPending: isIniciando } = useIniciarLote()
  const { mutateAsync: concluirLoteMutation } = useConcluirLote()
  const [loteParaConcluir, setLoteParaConcluir] = useState<LoteHoje | null>(null)

  const hoje = new Date().toISOString().split('T')[0]
  const atrasados   = lotes.filter((l) => l.urgencia === 'atrasado' && l.status !== 'concluido' && l.status !== 'cancelado')
  const emAndamento = lotes.filter((l) => l.status === 'em_andamento' && l.urgencia !== 'atrasado')
  const planejadosHoje = lotes.filter((l) => l.status === 'planejado' && l.data_producao === hoje)
  const proximos    = lotes.filter((l) => l.status === 'planejado' && l.data_producao !== hoje && l.urgencia !== 'atrasado')
  const concluidos  = lotes.filter((l) => l.status === 'concluido')
  const proxData    = lotes.find((l) => l.status !== 'concluido' && l.status !== 'cancelado' && l.data_producao > hoje)?.data_producao
  const nenhum      = lotes.filter((l) => l.status !== 'concluido' && l.status !== 'cancelado').length === 0

  async function handleConcluir(loteId: string, values: ConcluirLoteValues) {
    return await concluirLoteMutation({ id: loteId, values })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produção</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lotes do dia ordenados por urgência</p>
        </div>
        <div className="flex gap-2">
          <Link href="/producao/planejamento"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <CalendarDays className="w-4 h-4" /> Planejamento
          </Link>
          <Link href="/producao/receitas"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <BookOpen className="w-4 h-4" /> Receitas
          </Link>
          <Link href="/producao/ingredientes"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ShoppingBasket className="w-4 h-4" /> Ingredientes
          </Link>
        </div>
      </div>

      {lotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Planejados',      value: lotes.filter((l) => l.status === 'planejado').length,   color: 'text-gray-700',   bg: 'bg-gray-50'   },
            { label: 'Em andamento',    value: lotes.filter((l) => l.status === 'em_andamento').length, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Atrasados',       value: atrasados.length,                                        color: 'text-red-700',    bg: 'bg-red-50'    },
            { label: 'Concluídos hoje', value: concluidos.length,                                       color: 'text-green-700',  bg: 'bg-green-50'  },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? <PageLoader /> : nenhum ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <CakeSlice className="w-12 h-12 mb-3 text-gray-200" />
          <p className="font-medium text-gray-600">Nenhuma produção pendente para hoje</p>
          {proxData ? (
            <p className="text-sm mt-1">Próximo lote: <strong>{formatDate(proxData)}</strong></p>
          ) : (
            <p className="text-sm mt-1">Pedidos confirmados geram lotes automaticamente.</p>
          )}
          <Link href="/producao/planejamento"
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
            <CalendarDays className="w-4 h-4" /> Ver planejamento semanal
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {atrasados.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-red-500" />
                <h2 className="text-base font-semibold text-gray-800">Atrasados</h2>
                <Badge variant="error">{atrasados.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {atrasados.map((l) => (
                  <LoteCard key={l.id} lote={l} onIniciar={(id) => iniciarLote(id)} onConcluir={setLoteParaConcluir} />
                ))}
              </div>
            </section>
          )}

          {emAndamento.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Play className="w-4 h-4 text-yellow-500" />
                <h2 className="text-base font-semibold text-gray-800">Em andamento</h2>
                <Badge variant="warning">{emAndamento.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {emAndamento.map((l) => (
                  <LoteCard key={l.id} lote={l} onIniciar={(id) => iniciarLote(id)} onConcluir={setLoteParaConcluir} />
                ))}
              </div>
            </section>
          )}

          {planejadosHoje.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary-500" />
                <h2 className="text-base font-semibold text-gray-800">Para hoje</h2>
                <Badge variant="info">{planejadosHoje.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {planejadosHoje.map((l) => (
                  <LoteCard key={l.id} lote={l} onIniciar={(id) => iniciarLote(id)} onConcluir={setLoteParaConcluir} />
                ))}
              </div>
            </section>
          )}

          {proximos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800">Próximos</h2>
                <Badge variant="default">{proximos.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {proximos.map((l) => (
                  <LoteCard key={l.id} lote={l} onIniciar={(id) => iniciarLote(id)} onConcluir={setLoteParaConcluir} />
                ))}
              </div>
            </section>
          )}

          {concluidos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h2 className="text-base font-semibold text-gray-800">Concluídos</h2>
                <Badge variant="success">{concluidos.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {concluidos.map((l) => (
                  <LoteCard key={l.id} lote={l} onIniciar={() => {}} onConcluir={() => {}} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ModalConclusao
        lote={loteParaConcluir}
        isOpen={!!loteParaConcluir}
        onClose={() => setLoteParaConcluir(null)}
        onConfirm={handleConcluir}
      />

      {isIniciando && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            <span className="text-sm font-medium">Iniciando produção...</span>
          </div>
        </div>
      )}
    </div>
  )
}
