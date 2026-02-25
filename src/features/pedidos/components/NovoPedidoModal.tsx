'use client'

import { Modal } from '@/shared/components/ui/Modal'
import { PedidoForm } from './PedidoForm'
import { useCreatePedido } from '../hooks/usePedidos'
import type { PedidoFormValues } from '../schemas/pedido.schema'

interface NovoPedidoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NovoPedidoModal({ isOpen, onClose, onSuccess }: NovoPedidoModalProps) {
  const { mutateAsync } = useCreatePedido()

  async function handleSubmit(values: PedidoFormValues) {
    await mutateAsync(values)
    onClose()
    onSuccess?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo pedido" size="xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <PedidoForm onSubmit={handleSubmit} submitLabel="Criar pedido" />
      </div>
    </Modal>
  )
}
