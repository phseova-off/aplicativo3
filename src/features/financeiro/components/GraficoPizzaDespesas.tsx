'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/shared/lib/utils'

// Colors matching the expense categories
const CORES: Record<string, string> = {
  Ingredientes: '#f87171',   // red-400
  Embalagens:   '#fb923c',   // orange-400
  Marketing:    '#a78bfa',   // violet-400
  Equipamentos: '#60a5fa',   // blue-400
  Energia:      '#34d399',   // emerald-400
  Aluguel:      '#f59e0b',   // amber-400
  Outros:       '#94a3b8',   // slate-400
}

const COR_PADRAO = '#cbd5e1'

interface GraficoPizzaDespesasProps {
  despesasPorCategoria: Record<string, number>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{name}</p>
      <p className="text-red-600 font-medium">{formatCurrency(value)}</p>
    </div>
  )
}

export function GraficoPizzaDespesas({ despesasPorCategoria }: GraficoPizzaDespesasProps) {
  const dados = Object.entries(despesasPorCategoria)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  if (dados.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
        <p className="text-sm text-gray-400">Nenhuma despesa registrada este mês.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Despesas por categoria</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={dados}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {dados.map((entry, index) => (
              <Cell
                key={index}
                fill={CORES[entry.name] ?? COR_PADRAO}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
