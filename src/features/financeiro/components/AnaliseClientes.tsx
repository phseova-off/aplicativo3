'use client'

import { Users, Clock, Star, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { cn, formatCurrency, formatDate } from '@/shared/lib/utils'
import { useClientesAnalise } from '../hooks/useFinanceiro'

export function AnaliseClientes() {
  const { data: clientes, isLoading, error } = useClientesAnalise()

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500 text-sm">
        Erro ao carregar análise de clientes.
      </div>
    )
  }

  if (!clientes?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Nenhum cliente cadastrado ainda.
        <br />Clientes são criados automaticamente ao registrar pedidos.
      </div>
    )
  }

  const inativos = clientes.filter(c => (c.dias_sem_comprar ?? 0) > 30)
  const ativos = clientes.filter(c => (c.dias_sem_comprar ?? 0) <= 30)

  return (
    <div className="space-y-6">
      {/* Alerta inatividade */}
      {inativos.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {inativos.length} cliente{inativos.length !== 1 ? 's' : ''} sem comprar há mais de 30 dias
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Considere ações de retenção: desconto exclusivo, mensagem personalizada no WhatsApp ou lançamento de produto.
            </p>
          </div>
        </div>
      )}

      {/* Ranking principal */}
      <Card padding="none">
        <div className="p-5 border-b border-gray-100">
          <CardHeader className="mb-0">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Ranking por Valor Total Gasto
            </CardTitle>
            <span className="text-xs text-gray-400">{clientes.length} clientes</span>
          </CardHeader>
        </div>

        <div className="divide-y divide-gray-50">
          {clientes.map((c, idx) => {
            const inativo = (c.dias_sem_comprar ?? 0) > 30
            return (
              <div
                key={c.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors',
                  inativo && 'opacity-75'
                )}
              >
                {/* Posição */}
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                )}>
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">
                    {c.nome.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Dados */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{c.nome}</p>
                    {inativo && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 font-medium px-1.5 py-0.5 rounded">
                        Inativo {c.dias_sem_comprar}d
                      </span>
                    )}
                    {c.produto_favorito && (
                      <span className="text-[10px] bg-purple-100 text-purple-600 font-medium px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        ❤ {c.produto_favorito}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400">
                      <span className="font-medium text-gray-600">{c.total_pedidos}</span> pedido{c.total_pedidos !== 1 ? 's' : ''}
                    </p>
                    {c.ultima_compra && (
                      <p className="text-xs text-gray-400">
                        Última: <span className="text-gray-600">{formatDate(c.ultima_compra)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Valor total */}
                <p className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">
                  {formatCurrency(c.valor_total_compras)}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Clientes inativos */}
      {inativos.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Clientes Inativos (mais de 30 dias)
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {inativos.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                  <p className="text-xs text-gray-400">
                    {c.telefone && <span>{c.telefone} · </span>}
                    Último pedido: {c.ultima_compra ? formatDate(c.ultima_compra) : 'nunca'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-orange-600">
                    {c.dias_sem_comprar} dias sem comprar
                  </p>
                  {c.produto_favorito && (
                    <p className="text-xs text-gray-400">Favorito: {c.produto_favorito}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 p-3 bg-gray-50 rounded-lg">
            <strong className="text-gray-600">Dica:</strong> Envie uma mensagem personalizada no WhatsApp lembrando que você tem produtos novos.
            Clientes inativos respondem bem a ofertas exclusivas de &quot;voltou a comprar&quot;.
          </p>
        </Card>
      )}

      {/* Clientes ativos */}
      {ativos.length > 0 && (
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              Clientes Ativos (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ativos.map(c => (
              <div key={c.id} className="border border-gray-100 rounded-xl p-3 bg-green-50/30">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.total_pedidos} pedidos</p>
                <p className="text-xs font-bold text-green-700 mt-1">{formatCurrency(c.valor_total_compras)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
