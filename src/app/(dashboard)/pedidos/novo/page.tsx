'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Card } from '@/shared/components/ui/Card'
import { PedidoForm } from '@/features/pedidos/components/PedidoForm'
import { useCreatePedido } from '@/features/pedidos/hooks/usePedidos'
import type { PedidoFormValues } from '@/features/pedidos/schemas/pedido.schema'

export default function NovoPedidoPage() {
  const router = useRouter()
  const { mutateAsync: createPedido } = useCreatePedido()

  async function handleSubmit(values: PedidoFormValues) {
    const pedido = await createPedido(values)
    router.push(`/pedidos/${pedido.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/pedidos')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Pedidos
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os dados do pedido</p>
        </div>
      </div>

      <Card>
        <PedidoForm onSubmit={handleSubmit} submitLabel="Criar pedido" />
      </Card>
    </div>
  )
}
