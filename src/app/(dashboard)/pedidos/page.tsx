'use client'

import { useState, useDeferredValue } from 'react'
import Link from 'next/link'
import { Plus, Search, X, Filter } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { PedidoKanban } from '@/features/pedidos/components/PedidoKanban'
import { usePedidos } from '@/features/pedidos/hooks/usePedidos'
import type { PedidoFilters } from '@/features/pedidos/types/pedido.types'
import type { PedidoCanal } from '@/server/db/types'

const canalOptions = [
  { value: '',           label: 'Todos os canais' },
  { value: 'whatsapp',   label: 'WhatsApp'        },
  { value: 'instagram',  label: 'Instagram'       },
  { value: 'presencial', label: 'Presencial'      },
]

export default function PedidosPage() {
  const [search, setSearch] = useState('')
  const [canal, setCanal] = useState<PedidoCanal | ''>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const deferredSearch = useDeferredValue(search)

  const filters: PedidoFilters = {
    search: deferredSearch || undefined,
    canal: canal || undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
  }

  const { data: pedidos, isLoading } = usePedidos(filters)

  const hasActiveFilters = !!canal || !!dataInicio || !!dataFim

  function clearFilters() {
    setCanal('')
    setDataInicio('')
    setDataFim('')
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pedidos?.length ?? 0} pedido{pedidos?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/pedidos/novo">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Novo pedido</Button>
        </Link>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Buscar cliente..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            rightIcon={
              search ? (
                <button onClick={() => setSearch('')} className="hover:text-gray-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null
            }
          />
        </div>

        <Button
          variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
          size="sm"
          leftIcon={<Filter className="w-4 h-4" />}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filtros{hasActiveFilters ? ' •' : ''}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-40">
            <Select
              label="Canal"
              options={canalOptions}
              value={canal}
              onChange={(e) => setCanal(e.target.value as PedidoCanal | '')}
            />
          </div>
          <Input
            label="Entrega de"
            type="date"
            className="w-36"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <Input
            label="Entrega até"
            type="date"
            className="w-36"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      )}

      {/* Board */}
      {isLoading ? (
        <PageLoader />
      ) : (
        <PedidoKanban pedidos={pedidos ?? []} />
      )}
    </div>
  )
}
