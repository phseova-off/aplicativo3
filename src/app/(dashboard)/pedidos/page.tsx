'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { PedidoList } from '@/features/pedidos/components/PedidoList'
import { PedidoForm } from '@/features/pedidos/components/PedidoForm'
import { usePedidos, useCreatePedido } from '@/features/pedidos/hooks/usePedidos'
import type { PedidoFormValues } from '@/features/pedidos/schemas/pedido.schema'

export default function PedidosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: pedidos, isLoading } = usePedidos()
  const { mutateAsync: createPedido } = useCreatePedido()

  async function handleSubmit(values: PedidoFormValues) {
    await createPedido(values)
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pedidos?.length ?? 0} pedido{pedidos?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Novo pedido
        </Button>
      </div>

      <PedidoList pedidos={pedidos ?? []} isLoading={isLoading} />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Pedido"
        size="lg"
      >
        <PedidoForm onSubmit={handleSubmit} submitLabel="Criar pedido" />
      </Modal>
    </div>
  )
}
