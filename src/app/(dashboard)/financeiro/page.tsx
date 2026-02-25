'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { FinanceiroNav } from '@/features/financeiro/components/FinanceiroNav'
import { ResumoMes, mesAtual } from '@/features/financeiro/components/ResumoMes'
import { MetaMensal } from '@/features/financeiro/components/MetaMensal'
import { RelatorioExporter } from '@/features/financeiro/components/RelatorioExporter'
import { NovaTransacaoModal } from '@/features/financeiro/components/NovaTransacaoModal'
import { ExtratoCompleto } from '@/features/financeiro/components/ExtratoCompleto'
import { useResumoMes } from '@/features/financeiro/hooks/useFinanceiro'

// Recharts: lazy-load para evitar SSR
const GraficoPizzaDespesas = dynamic(
  () =>
    import('@/features/financeiro/components/GraficoPizzaDespesas').then(
      (m) => ({ default: m.GraficoPizzaDespesas }),
    ),
  { ssr: false, loading: () => <div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" /> },
)

// ─── Seção de gráfico (precisa dos dados do resumo) ───────────

function GraficoPizzaSection({ mes }: { mes: string }) {
  const { data } = useResumoMes(mes)
  return (
    <GraficoPizzaDespesas
      despesasPorCategoria={data?.despesasPorCategoria ?? {}}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [mes, setMes] = useState(mesAtual)
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Receitas, despesas e metas da sua confeitaria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RelatorioExporter mes={mes} />
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModalAberto(true)}
          >
            Nova transação
          </Button>
        </div>
      </div>

      {/* ── Nav tabs ───────────────────────────────────────── */}
      <FinanceiroNav />

      {/* ── Resumo do mês (selector + KPIs) ───────────────── */}
      <ResumoMes mes={mes} onChangeMes={setMes} />

      {/* ── Pie chart + Meta mensal ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoPizzaSection mes={mes} />
        <MetaMensal mes={mes} />
      </div>

      {/* ── Extrato de transações ──────────────────────────── */}
      <ExtratoCompleto mes={mes} />

      {/* ── Modal nova transação ──────────────────────────── */}
      <NovaTransacaoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
      />
    </div>
  )
}
