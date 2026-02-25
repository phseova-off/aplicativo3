'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, DollarSign, CalendarDays, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { NovoPedidoModal } from '@/features/pedidos/components/NovoPedidoModal'
import { usePlano } from '@/features/planos/hooks/usePlano'

export function AcessoRapido() {
  const [showModal, setShowModal] = useState(false)
  const { plano } = usePlano()
  const isFree = plano === 'free'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Acesso rápido
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
            size="sm"
          >
            Novo pedido
          </Button>

          <Link href="/financeiro">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<DollarSign className="w-4 h-4" />}
            >
              Nova despesa
            </Button>
          </Link>

          <Link href="/marketing/cronograma">
            <Button
              variant={isFree ? 'outline' : 'secondary'}
              size="sm"
              leftIcon={
                isFree
                  ? <Lock className="w-3.5 h-3.5" />
                  : <CalendarDays className="w-4 h-4" />
              }
            >
              Gerar cronograma
              {isFree && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  Starter+
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      <NovoPedidoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
