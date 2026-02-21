import Link from 'next/link'
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCurrency } from '@/shared/lib/utils'
import type { ParaFazerHojeData } from '../types/dashboard.types'

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  producao: 'Em produção',
  pronto: 'Pronto',
}

const statusVariants: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'default'> = {
  novo: 'warning',
  confirmado: 'info',
  producao: 'purple',
  pronto: 'success',
}

interface Props {
  data: ParaFazerHojeData
}

export function ParaFazerHoje({ data }: Props) {
  const { pedidosHoje, lotesPendentes } = data
  const total = pedidosHoje.length + lotesPendentes.length

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <CardHeader className="mb-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" />
            Para fazer hoje
          </CardTitle>
          {total > 0 ? (
            <Badge variant="warning">{total} {total === 1 ? 'item' : 'itens'}</Badge>
          ) : (
            <Badge variant="success">Tudo em dia</Badge>
          )}
        </CardHeader>
      </div>

      {total === 0 ? (
        <div className="px-5 pb-5 flex items-center gap-3 text-sm text-gray-500">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span>Nenhuma entrega ou produção pendente para hoje.</span>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 border-t border-gray-100">
          {pedidosHoje.map((p) => (
            <Link
              key={p.id}
              href={`/pedidos/${p.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.cliente_nome}</p>
                <p className="text-xs text-gray-500">
                  {p.hora_entrega ? `Entrega às ${p.hora_entrega}` : 'Entrega hoje'} · {formatCurrency(p.valor_total)}
                </p>
              </div>
              <Badge variant={statusVariants[p.status] ?? 'default'}>
                {statusLabels[p.status] ?? p.status}
              </Badge>
            </Link>
          ))}

          {lotesPendentes.map((l) => {
            const pct = Math.round((l.quantidade_produzida / l.quantidade_planejada) * 100)
            return (
              <Link
                key={l.id}
                href="/producao"
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <ChefHat className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{l.nome_produto}</p>
                  <p className="text-xs text-gray-500">
                    {l.quantidade_produzida}/{l.quantidade_planejada} produzidos ({pct}%)
                  </p>
                </div>
                <Badge variant="info">Produção</Badge>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
