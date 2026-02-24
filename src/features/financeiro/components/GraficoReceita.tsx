'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import type { MesHistorico } from '../types/financeiro.types'

interface Props {
  dados: MesHistorico[]
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export function GraficoReceita({ dados }: Props) {
  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Receita vs Despesa — últimos 6 meses</CardTitle>
      </CardHeader>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip
            formatter={(v: number) => formatBRL(v)}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            formatter={(v) => v === 'receita' ? 'Receita' : 'Despesa'}
          />
          <Line
            type="monotone"
            dataKey="receita"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="despesa"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
