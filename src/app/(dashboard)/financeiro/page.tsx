'use client'

import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { FinanceiroNav } from '@/features/financeiro/components/FinanceiroNav'
import { KPICard } from '@/features/financeiro/components/KPICard'
import { AlertaPrecos } from '@/features/financeiro/components/AlertaPrecos'
import { useDashboardFinanceiro } from '@/features/financeiro/hooks/useFinanceiro'

// Recharts: lazy-load para evitar problemas de SSR
const GraficoReceita = dynamic(
  () => import('@/features/financeiro/components/GraficoReceita').then(m => ({ default: m.GraficoReceita })),
  { ssr: false, loading: () => <div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" /> }
)
const GraficoProdutos = dynamic(
  () => import('@/features/financeiro/components/GraficoProdutos').then(m => ({ default: m.GraficoProdutos })),
  { ssr: false, loading: () => <div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" /> }
)

export default function FinanceiroDashboard() {
  const { data, isLoading, error } = useDashboardFinanceiro()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão completa da saúde financeira da sua confeitaria
        </p>
      </div>

      <FinanceiroNav />

      {/* Alerta de preços desatualizados */}
      {data && (data.totalProdutosDesatualizados > 0 || data.alertasPreco.length > 0) && (
        <AlertaPrecos
          alertas={data.alertasPreco}
          totalDesatualizados={data.totalProdutosDesatualizados}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-500 text-sm">
          Erro ao carregar dados financeiros. Tente recarregar a página.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Receita Bruta" kpi={data.receitaBruta} />
            <KPICard label="Despesas" kpi={data.despesas} inverterCor />
            <KPICard label="Lucro Líquido" kpi={data.lucroLiquido} />
            <KPICard label="Margem %" kpi={data.margemPercentual} formato="percentual" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficoReceita dados={data.historicoMensal} />
            <GraficoProdutos dados={data.topProdutosMargem} />
          </div>
        </>
      )}

      {!isLoading && !error && data &&
        data.receitaBruta.valor === 0 &&
        data.despesas.valor === 0 &&
        data.topProdutosMargem.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 text-sm">Nenhuma transação este mês ainda.</p>
            <p className="text-gray-400 text-xs mt-1">
              Transações são geradas automaticamente quando pedidos são entregues ou lotes de produção concluídos.
            </p>
          </div>
        )}
    </div>
  )
}
