'use client'

import { useState } from 'react'
import { Download, ShoppingBag, ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { NovaTransacaoModal } from './NovaTransacaoModal'
import { cn, formatCurrency, formatDate } from '@/shared/lib/utils'
import { useTransacoesPaginadas, useDeleteTransacao } from '../hooks/useFinanceiro'
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '../types/financeiro.types'
import type { Transacao } from '@/server/db/types'

// ─── Helpers ──────────────────────────────────────────────────

const CATEGORIAS_TODAS = [
  ...CATEGORIAS_RECEITA,
  ...CATEGORIAS_DESPESA.filter((c) => !CATEGORIAS_RECEITA.includes(c as never)),
]

function mesAtualStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MESES_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - i)
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) }
})

function exportCSV(transacoes: Transacao[]) {
  const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Origem']
  const rows = transacoes.map((t) => [
    t.data,
    t.tipo === 'receita' ? 'Receita' : 'Despesa',
    t.categoria,
    t.descricao ?? '',
    t.valor.toFixed(2).replace('.', ','),
    (t as Transacao & { origem?: string }).origem ?? 'manual',
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transacoes-${new Date().toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────

interface ExtratoCompletoProps {
  /** When provided from parent, this month is used (controlled). */
  mes?: string
}

export function ExtratoCompleto({ mes: mesProp }: ExtratoCompletoProps) {
  const [mesInterno, setMesInterno] = useState(mesAtualStr)
  const mes = mesProp ?? mesInterno

  const [tipo, setTipo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [page, setPage] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const LIMIT = 20

  const { data, isLoading } = useTransacoesPaginadas({ mes, tipo, categoria, page, limit: LIMIT })
  const { mutate: deletar } = useDeleteTransacao()

  const transacoes = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  function handleFiltroChange() {
    setPage(1)
  }

  return (
    <>
      <Card padding="none">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <CardHeader className="mb-0">
            <CardTitle>Extrato de Transações</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => exportCSV(transacoes)}
                disabled={!transacoes.length}
              >
                CSV
              </Button>
            </div>
          </CardHeader>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-gray-50/50">
          {/* Internal month selector only when not controlled externally */}
          {!mesProp && (
            <select
              value={mesInterno}
              onChange={(e) => { setMesInterno(e.target.value); handleFiltroChange() }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MESES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); handleFiltroChange() }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select
            value={categoria}
            onChange={(e) => { setCategoria(e.target.value); handleFiltroChange() }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS_TODAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className="ml-auto text-xs text-gray-400 self-center">
            {total} transaç{total !== 1 ? 'ões' : 'ão'}
          </span>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : transacoes.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Nenhuma transação encontrada para este período.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transacoes.map((t) => {
              const isReceita = t.tipo === 'receita'
              const isAutomatica = (t as Transacao & { origem?: string }).origem !== 'manual'
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 group transition-colors"
                >
                  {/* Ícone */}
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      isReceita ? 'bg-green-100' : 'bg-red-100',
                    )}
                  >
                    <ShoppingBag
                      className={cn('w-4 h-4', isReceita ? 'text-green-600' : 'text-red-500')}
                    />
                  </div>

                  {/* Dados */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao || t.categoria}
                      </p>
                      {isAutomatica && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                          Automático
                        </span>
                      )}
                      {isReceita && t.pedido_id && (
                        <Link
                          href={`/pedidos/${t.pedido_id}`}
                          className="text-[10px] bg-green-100 text-green-600 font-medium px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-0.5 hover:bg-green-200 transition-colors"
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          Pedido
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.categoria} · {formatDate(t.data)}
                    </p>
                  </div>

                  {/* Valor */}
                  <p
                    className={cn(
                      'text-sm font-bold flex-shrink-0',
                      isReceita ? 'text-green-600' : 'text-red-500',
                    )}
                  >
                    {isReceita ? '+' : '-'}{formatCurrency(t.valor)}
                  </p>

                  {/* Excluir (manual only) */}
                  {!isAutomatica && (
                    <button
                      onClick={() => deletar(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                      title="Excluir transação"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Card>

      {/* Modal nova transação (toggle receita/despesa) */}
      <NovaTransacaoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
      />
    </>
  )
}
