'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, Search, Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Modal } from '@/shared/components/ui/Modal'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { FichaTecnica } from '@/features/producao/components/FichaTecnica'
import { useReceitas, useCreateReceita, useUpdateReceita, useDeleteReceita } from '@/features/producao/hooks/useReceitas'
import { formatCurrency } from '@/shared/lib/utils'
import type { ReceitaComCusto } from '@/features/producao/types/producao.types'
import type { ReceitaFormValues } from '@/features/producao/schemas/producao.schema'

const CATEGORIA_LABELS: Record<string, string> = {
  trufa: 'Trufa', bombom: 'Bombom', kit: 'Kit', outro: 'Outro',
}
const CATEGORIA_VARIANTS: Record<string, 'default' | 'purple' | 'info' | 'orange'> = {
  trufa: 'purple', bombom: 'info', kit: 'orange', outro: 'default',
}

function ReceitaCard({
  receita,
  onEdit,
  onDelete,
}: {
  receita: ReceitaComCusto
  onEdit: () => void
  onDelete: () => void
}) {
  const margem = receita.margem_percentual
  const margemColor = margem >= 40 ? 'text-green-600' : margem >= 20 ? 'text-yellow-600' : 'text-red-600'

  return (
    <Card padding="sm" className={receita.ativo ? '' : 'opacity-60'}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{receita.nome}</h3>
            <Badge variant={CATEGORIA_VARIANTS[receita.categoria] ?? 'default'}>
              {CATEGORIA_LABELS[receita.categoria] ?? receita.categoria}
            </Badge>
            {!receita.ativo && <Badge variant="error">Inativo</Badge>}
          </div>
          {receita.descricao && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{receita.descricao}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center bg-gray-50 rounded-lg p-1.5">
          <p className="text-xs text-gray-500">Custo</p>
          <p className="text-xs font-bold text-gray-700">{formatCurrency(receita.custo_calculado)}</p>
        </div>
        <div className="text-center bg-primary-50 rounded-lg p-1.5">
          <p className="text-xs text-gray-500">Preço</p>
          <p className="text-xs font-bold text-primary-700">{formatCurrency(receita.preco)}</p>
        </div>
        <div className={`text-center rounded-lg p-1.5 ${margem >= 40 ? 'bg-green-50' : margem >= 20 ? 'bg-yellow-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500">Margem</p>
          <p className={`text-xs font-bold ${margemColor}`}>{margem}%</p>
        </div>
      </div>

      {/* Ingredients preview */}
      {receita.ingredientes && receita.ingredientes.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs text-gray-400 mb-1">{receita.ingredientes.length} ingrediente(s)</p>
          <div className="flex flex-wrap gap-1">
            {receita.ingredientes.slice(0, 4).map((ing, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {ing.nome}
              </span>
            ))}
            {receita.ingredientes.length > 4 && (
              <span className="text-xs text-gray-400">+{receita.ingredientes.length - 4}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function ReceitasPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<ReceitaComCusto | null>(null)

  const { data: receitas = [], isLoading } = useReceitas()
  const { mutateAsync: criar } = useCreateReceita()
  const { mutateAsync: atualizar } = useUpdateReceita()
  const { mutate: excluir } = useDeleteReceita()

  const filtradas = receitas.filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit(values: ReceitaFormValues) {
    if (editando) {
      await atualizar({ id: editando.id, data: values })
    } else {
      await criar(values)
    }
    setModalOpen(false)
    setEditando(null)
  }

  function openEdit(r: ReceitaComCusto) {
    setEditando(r)
    setModalOpen(true)
  }

  function openNew() {
    setEditando(null)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir esta receita?')) return
    excluir(id)
  }

  const totalReceitas = receitas.length
  const ativas = receitas.filter((r) => r.ativo).length
  const margemMedia = receitas.length > 0
    ? Math.round(receitas.reduce((s, r) => s + r.margem_percentual, 0) / receitas.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/producao"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Produção
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Fichas Técnicas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Receitas com custo calculado e sugestão de preço
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
          Nova receita
        </Button>
      </div>

      {/* Summary stats */}
      {totalReceitas > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-gray-800">{totalReceitas}</p>
            <p className="text-xs text-gray-500">receitas</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{ativas}</p>
            <p className="text-xs text-gray-500">ativas</p>
          </div>
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-center">
            <div className="flex items-center gap-1 justify-center">
              <Star className="w-3.5 h-3.5 text-primary-600" />
              <p className="text-xl font-bold text-primary-700">{margemMedia}%</p>
            </div>
            <p className="text-xs text-gray-500">margem média</p>
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Buscar receita..."
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {/* Grid */}
      {isLoading ? (
        <PageLoader />
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="font-medium text-gray-600">
            {search ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'}
          </p>
          {!search && (
            <p className="text-sm mt-1">
              Crie fichas técnicas para calcular custos automaticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((r) => (
            <ReceitaCard
              key={r.id}
              receita={r}
              onEdit={() => openEdit(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        title={editando ? `Editar — ${editando.nome}` : 'Nova Receita'}
        size="xl"
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <FichaTecnica
            key={editando?.id ?? 'new'}
            defaultValues={editando
              ? {
                  nome: editando.nome,
                  descricao: editando.descricao,
                  preco: editando.preco,
                  custo: editando.custo,
                  categoria: editando.categoria,
                  ativo: editando.ativo,
                  ingredientes: editando.ingredientes,
                }
              : undefined}
            onSubmit={handleSubmit}
            submitLabel={editando ? 'Salvar alterações' : 'Criar receita'}
          />
        </div>
      </Modal>
    </div>
  )
}
