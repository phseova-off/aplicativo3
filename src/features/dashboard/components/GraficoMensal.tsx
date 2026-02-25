'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/shared/lib/utils'
import type { SemanaMes } from '../types/dashboard.types'

interface GraficoMensalProps {
  data: SemanaMes[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const { receita, pedidos } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-green-700 font-medium">{formatCurrency(receita)}</p>
      <p className="text-gray-500">{pedidos} pedido{pedidos !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function GraficoMensal({ data }: GraficoMensalProps) {
  const maxReceita = Math.max(...data.map((d) => d.receita), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Receita por semana — mês atual</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis
            dataKey="semana"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="receita" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.receita === maxReceita && entry.receita > 0 ? '#d946ef' : '#e9d5ff'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
