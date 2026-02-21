'use client'

import { Calendar, Package, Play, CheckCircle, Loader2 } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { useIniciarProducao, useConcluirProducao } from '../hooks/useProducaoDiario'
import type { PedidoProducao } from '../types/producao.types'

interface ProducaoCardProps {
  pedido: PedidoProducao
  urgente?: boolean
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={[
          'h-2 rounded-full transition-all duration-500',
          value === 100 ? 'bg-green-500' : value > 50 ? 'bg-blue-500' : 'bg-yellow-500',
        ].join(' ')}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function ProducaoCard({ pedido, urgente = false }: ProducaoCardProps) {
  const { mutate: iniciar, isPending: isIniciando } = useIniciarProducao()
  const { mutate: concluir, isPending: isConcluindo } = useConcluirProducao()

  const isEmProducao = pedido.status === 'producao'
  // Simple progress: confirmado=0%, producao=50%
  const progresso = isEmProducao ? 50 : 0

  const itens = pedido.itens_pedido ?? []
  const totalItens = itens.reduce((s, it) => s + it.quantidade, 0)

  const hoje = new Date().toISOString().split('T')[0]
  const isHoje = pedido.data_entrega?.startsWith(hoje)
  const isAtrasado =
    pedido.data_entrega && pedido.data_entrega < hoje + 'T'

  return (
    <Card
      padding="sm"
      className={[
        'transition-all',
        urgente || isAtrasado ? 'border-red-300 bg-red-50' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {pedido.cliente_nome}
            </p>
            {isAtrasado && (
              <Badge variant="error">Atrasado</Badge>
            )}
            {isHoje && !isAtrasado && (
              <Badge variant="warning">Hoje</Badge>
            )}
          </div>
          {pedido.data_entrega && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Calendar className="w-3 h-3" />
              Entrega: {formatDate(pedido.data_entrega)}
            </p>
          )}
        </div>
        <span className="text-sm font-bold text-primary-700 flex-shrink-0">
          {formatCurrency(pedido.valor_total)}
        </span>
      </div>

      {/* Items */}
      {itens.length > 0 && (
        <div className="mb-3 space-y-1">
          {itens.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{item.quantidade}×</span>
              <span className="truncate">{item.nome_produto}</span>
            </div>
          ))}
          {itens.length > 3 && (
            <p className="text-xs text-gray-400 pl-4">+{itens.length - 3} item(s)</p>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{isEmProducao ? 'Em produção' : 'Aguardando início'}</span>
          <span className="font-medium">{progresso}%</span>
        </div>
        <ProgressBar value={progresso} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isEmProducao ? (
          <Button
            size="sm"
            className="flex-1"
            leftIcon={isIniciando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            onClick={() => iniciar(pedido.id)}
            loading={isIniciando}
          >
            Iniciar Produção
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
            onClick={() => concluir(pedido.id)}
            loading={isConcluindo}
          >
            Concluir
          </Button>
        )}
      </div>

      {pedido.observacoes && (
        <p className="text-xs text-gray-400 mt-2 truncate" title={pedido.observacoes}>
          {pedido.observacoes}
        </p>
      )}
    </Card>
  )
}
