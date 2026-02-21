import { Wallet, ShoppingBag, Star, TrendingUp } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/lib/utils'
import type { KPIData } from '../types/dashboard.types'

interface KPICardProps {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

function KPICard({ label, value, sub, subPositive, icon: Icon, iconBg, iconColor }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 mb-1 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          {sub && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              subPositive === undefined ? 'text-gray-500' :
              subPositive ? 'text-green-600' : 'text-red-500'
            )}>
              {sub}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}

interface KPIGridProps {
  data: KPIData
}

export function KPIGrid({ data }: KPIGridProps) {
  const { faturamento, pedidos, topProduto, margemMedia } = data

  const pctStr = faturamento.percentualVsMesAnterior !== null
    ? `${faturamento.percentualVsMesAnterior >= 0 ? '+' : ''}${faturamento.percentualVsMesAnterior.toFixed(1)}% vs mês anterior`
    : 'Sem histórico anterior'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        label="Faturamento do mês"
        value={formatCurrency(faturamento.valor)}
        sub={pctStr}
        subPositive={faturamento.percentualVsMesAnterior !== null
          ? faturamento.percentualVsMesAnterior >= 0
          : undefined}
        icon={Wallet}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
      <KPICard
        label="Pedidos do mês"
        value={String(pedidos.total)}
        sub={`${pedidos.percentualEntregues.toFixed(0)}% entregues`}
        subPositive={pedidos.percentualEntregues >= 80}
        icon={ShoppingBag}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <KPICard
        label="Produto top"
        value={topProduto?.nome ?? '—'}
        sub={topProduto ? `${topProduto.quantidade} und. vendidas` : 'Sem vendas ainda'}
        icon={Star}
        iconBg="bg-amber-50"
        iconColor="text-amber-500"
      />
      <KPICard
        label="Margem média"
        value={`${margemMedia.toFixed(1)}%`}
        sub={margemMedia >= 40 ? 'Margem saudável' : margemMedia > 0 ? 'Abaixo do ideal' : 'Sem produtos ativos'}
        subPositive={margemMedia > 0 ? margemMedia >= 40 : undefined}
        icon={TrendingUp}
        iconBg="bg-primary-50"
        iconColor="text-primary-600"
      />
    </div>
  )
}

