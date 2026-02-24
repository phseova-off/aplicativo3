'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import type { ProdutoMargem } from '../types/financeiro.types'

interface Props {
  dados: ProdutoMargem[]
}

const CORES = ['#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#ddd6fe']

function nomeCurto(nome: string, max = 14) {
  return nome.length > max ? nome.slice(0, max) + '…' : nome
}

export function GraficoProdutos({ dados }: Props) {
  if (!dados.length) {
    return (
      <Card padding="md">
        <CardHeader>
          <CardTitle>Top 5 Produtos — Margem de Lucro</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-400 text-center py-10">
          Nenhum produto com custo calculado ainda.
        </p>
      </Card>
    )
  }

  const chartData = dados.map(p => ({
    nome: nomeCurto(p.nome),
    margem: Math.round(p.margem * 10) / 10,
  }))

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Top 5 Produtos — Margem de Lucro</CardTitle>
      </CardHeader>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            unit="%"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="nome"
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            formatter={(v: number) => [`${v}%`, 'Margem']}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
