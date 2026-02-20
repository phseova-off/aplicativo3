'use client'

import {
  ShoppingBag,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import { PedidosRecentes } from '@/features/dashboard/components/PedidosRecentes'
import { useDashboardMetricas } from '@/features/dashboard/hooks/useDashboard'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { formatCurrency } from '@/shared/lib/utils'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardMetricas()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Erro ao carregar métricas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumo do seu negócio</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total de Pedidos"
          value={data.totalPedidos}
          icon={ShoppingBag}
          iconColor="text-primary-600"
          iconBg="bg-primary-50"
        />
        <MetricCard
          label="Pedidos Pendentes"
          value={data.pedidosPendentes}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
        />
        <MetricCard
          label="Em Produção"
          value={data.pedidosEmProducao}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <MetricCard
          label="Receita do Mês"
          value={formatCurrency(data.receitaMes)}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <MetricCard
          label="Despesas do Mês"
          value={formatCurrency(data.despesaMes)}
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <MetricCard
          label="Lucro do Mês"
          value={formatCurrency(data.lucroMes)}
          icon={Wallet}
          iconColor={data.lucroMes >= 0 ? 'text-primary-600' : 'text-red-600'}
          iconBg={data.lucroMes >= 0 ? 'bg-primary-50' : 'bg-red-50'}
        />
      </div>

      {/* Recent orders */}
      <PedidosRecentes pedidos={data.pedidosRecentes} />
    </div>
  )
}
