'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, AlertCircle, Package, DollarSign } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { concluirLoteSchema, type ConcluirLoteValues } from '../schemas/producao.schema'
import { formatCurrency } from '@/shared/lib/utils'

interface LoteParaConcluir {
  id: string
  nome_produto: string
  quantidade_planejada: number
  custo_estimado: number
  pedido?: {
    cliente_nome: string
  } | null
}

interface ModalConclusaoProps {
  lote: LoteParaConcluir | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (loteId: string, values: ConcluirLoteValues) => Promise<{ sugestao_pronto?: boolean } | void>
}

const MOTIVOS_DESVIO = [
  'Ingrediente faltou',
  'Perda durante produção',
  'Mudança no pedido do cliente',
  'Problema com equipamento',
  'Outro motivo',
]

export function ModalConclusao({ lote, isOpen, onClose, onConfirm }: ModalConclusaoProps) {
  const [salvando, setSalvando] = useState(false)
  const [sugestaoProducao, setSugestaoProducao] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ConcluirLoteValues>({
    resolver: zodResolver(concluirLoteSchema),
    defaultValues: {
      quantidade_produzida: lote?.quantidade_planejada ?? 0,
      observacoes: '',
      motivo_desvio: '',
    },
  })

  const qtdProduzida = watch('quantidade_produzida')
  const temDesvio = lote ? Number(qtdProduzida) < lote.quantidade_planejada : false
  const desvio = lote ? lote.quantidade_planejada - Number(qtdProduzida || 0) : 0

  // Reset form quando o lote muda
  useEffect(() => {
    if (lote) {
      reset({
        quantidade_produzida: lote.quantidade_planejada,
        observacoes: '',
        motivo_desvio: '',
      })
      setSugestaoProducao(false)
    }
  }, [lote, reset])

  async function onSubmit(values: ConcluirLoteValues) {
    if (!lote) return
    setSalvando(true)
    try {
      const result = await onConfirm(lote.id, values)
      if (result && 'sugestao_pronto' in result && result.sugestao_pronto) {
        setSugestaoProducao(true)
        return // Não fechar ainda — mostrar sugestão
      }
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  if (!lote) return null

  if (sugestaoProducao) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Produção concluída!">
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Todos os lotes concluídos!</p>
            <p className="text-sm text-gray-600 mt-1">
              Todos os produtos do pedido de{' '}
              <strong>{lote.pedido?.cliente_nome}</strong> foram produzidos.
            </p>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-800">
            <p className="font-medium">Deseja mover o pedido para &quot;Pronto&quot;?</p>
            <p className="text-xs mt-1 text-primary-600">
              O pedido ficará aguardando a entrega ou retirada pelo cliente.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Não agora
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                // Emitir evento para a página mover o pedido — página lida com isso via invalidateQueries
                onClose()
              }}
            >
              Mover para Pronto
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Concluir: ${lote.nome_produto}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Info do lote */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{lote.nome_produto}</p>
            {lote.pedido?.cliente_nome && (
              <p className="text-xs text-gray-500">Pedido de {lote.pedido.cliente_nome}</p>
            )}
          </div>
          {lote.custo_estimado > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Est. {formatCurrency(lote.custo_estimado)}</span>
            </div>
          )}
        </div>

        {/* Quantidade produzida */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade produzida <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={1}
              className={`w-32 h-10 px-3 rounded-xl border text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                errors.quantidade_produzida ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
              {...register('quantidade_produzida')}
            />
            <span className="text-sm text-gray-500">
              de <strong>{lote.quantidade_planejada}</strong> planejado{lote.quantidade_planejada !== 1 ? 's' : ''}
            </span>
          </div>
          {errors.quantidade_produzida && (
            <p className="text-xs text-red-500 mt-1">{errors.quantidade_produzida.message}</p>
          )}

          {/* Alerta de desvio */}
          {temDesvio && desvio > 0 && (
            <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>{desvio} unidade{desvio !== 1 ? 's' : ''}</strong> a menos que o planejado.
                Informe o motivo abaixo.
              </p>
            </div>
          )}
        </div>

        {/* Motivo do desvio (obrigatório se houver desvio) */}
        {temDesvio && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo do desvio <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {MOTIVOS_DESVIO.map((motivo) => (
                <button
                  key={motivo}
                  type="button"
                  onClick={() => setValue('motivo_desvio', motivo)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  {motivo}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Descreva o motivo..."
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              {...register('motivo_desvio')}
            />
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações{Number(qtdProduzida) === 0 && ' (obrigatório quando produção = 0)'}
          </label>
          <textarea
            rows={2}
            placeholder="Anotações sobre esta produção..."
            className={`w-full px-3 py-2 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 ${
              errors.observacoes ? 'border-red-400 bg-red-50' : 'border-gray-200'
            }`}
            {...register('observacoes')}
          />
          {errors.observacoes && (
            <p className="text-xs text-red-500 mt-1">{errors.observacoes.message}</p>
          )}
        </div>

        {/* Info custo real */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          <p className="font-medium mb-0.5">Custo real será calculado automaticamente</p>
          <p>O sistema usará os preços atuais do seu catálogo de ingredientes ao confirmar.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={salvando}
            className="flex-1"
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirmar conclusão
          </Button>
        </div>
      </form>
    </Modal>
  )
}
