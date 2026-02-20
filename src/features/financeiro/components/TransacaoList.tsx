'use client'

import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCurrency, formatDate } from '@/shared/lib/utils'
import { useDeleteTransacao } from '../hooks/useFinanceiro'
import type { Transacao } from '@/server/db/types'

interface TransacaoListProps {
  transacoes: Transacao[]
}

export function TransacaoList({ transacoes }: TransacaoListProps) {
  const { mutate: deleteTransacao, isPending } = useDeleteTransacao()

  if (transacoes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Nenhuma transação encontrada.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {transacoes.map((transacao) => (
        <div key={transacao.id} className="flex items-center gap-4 py-3">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              transacao.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            {transacao.tipo === 'receita' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {transacao.categoria}
              </p>
              <Badge variant={transacao.tipo === 'receita' ? 'success' : 'error'}>
                {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
              </Badge>
            </div>
            {transacao.descricao && (
              <p className="text-xs text-gray-500 truncate">{transacao.descricao}</p>
            )}
            <p className="text-xs text-gray-400">{formatDate(transacao.data)}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold ${
                transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {transacao.tipo === 'receita' ? '+' : '-'}
              {formatCurrency(transacao.valor)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTransacao(transacao.id)}
              disabled={isPending}
              aria-label="Excluir transação"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
