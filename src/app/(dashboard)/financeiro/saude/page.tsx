'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, Package, Pencil, ChevronRight, Bell, Loader2,
} from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { formatCurrency } from '@/shared/lib/utils'
import type { SaudeFinanceiraResponse, ProdutoSaude } from '@/app/api/financeiro/saude/route'

// ─── Fetch ────────────────────────────────────────────────────

async function fetchSaude(): Promise<SaudeFinanceiraResponse> {
  const res = await fetch('/api/financeiro/saude')
  if (!res.ok) throw new Error('Erro ao carregar dados de saúde financeira')
  return res.json()
}

function useSaudeFinanceira() {
  return useQuery({
    queryKey: ['financeiro', 'saude'],
    queryFn: fetchSaude,
    staleTime: 60_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────

function getMargemInfo(margem: number): {
  cor: string
  bg: string
  border: string
  label: string
  icon: React.ReactNode
} {
  if (margem >= 60) return {
    cor: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
    label: 'Excelente', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  }
  if (margem >= 40) return {
    cor: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
    label: 'Boa', icon: <TrendingUp className="w-3.5 h-3.5 text-green-500" />,
  }
  if (margem >= 20) return {
    cor: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',
    label: 'Regular', icon: <TrendingDown className="w-3.5 h-3.5 text-yellow-500" />,
  }
  return {
    cor: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
    label: margem < 0 ? 'Prejuízo' : 'Crítica',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  }
}

// ─── ProdutoMargemRow ──────────────────────────────────────────

function ProdutoMargemRow({ produto }: { produto: ProdutoSaude }) {
  const info = getMargemInfo(produto.margem_percentual)
  const barWidth = Math.max(0, Math.min(100, produto.margem_percentual))

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
      produto.margem_percentual < 0 ? 'bg-red-50/30' : ''
    }`}>
      {/* Nome + aviso preço desatualizado */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{produto.nome}</p>
          {produto.preco_desatualizado && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Custo desatualizado
            </span>
          )}
        </div>
        {/* Margem bar */}
        <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              produto.margem_percentual >= 40 ? 'bg-green-500' :
              produto.margem_percentual >= 20 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Preço venda */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-xs text-gray-400">Venda</p>
        <p className="text-sm font-medium text-gray-700">{formatCurrency(produto.preco_venda)}</p>
      </div>

      {/* Custo */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-xs text-gray-400">Custo</p>
        <p className="text-sm font-medium text-gray-600">{formatCurrency(produto.custo_calculado)}</p>
      </div>

      {/* Margem */}
      <div className={`text-center flex-shrink-0 px-2.5 py-1 rounded-lg border ${info.bg} ${info.border}`}>
        <p className={`text-sm font-bold ${info.cor}`}>
          {produto.margem_percentual.toFixed(1)}%
        </p>
        <div className={`flex items-center gap-0.5 justify-center text-xs ${info.cor}`}>
          {info.icon}
          <span>{info.label}</span>
        </div>
      </div>

      {/* Lucro por unidade */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-400">Lucro/un.</p>
        <p className={`text-sm font-bold ${produto.margem_valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(produto.margem_valor)}
        </p>
      </div>

      {/* Ação */}
      <Link
        href={`/producao/receitas?produto=${produto.id}`}
        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
        title="Ajustar preço na ficha técnica"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function SaudeFinanceiraPage() {
  const { data, isLoading, error } = useSaudeFinanceira()
  const [filtro, setFiltro] = useState<'todos' | 'criticos' | 'saudaveis'>('todos')

  const produtos = data?.produtos ?? []

  const filtrados = filtro === 'criticos'
    ? produtos.filter((p) => p.margem_percentual < 20)
    : filtro === 'saudaveis'
    ? produtos.filter((p) => p.margem_percentual >= 40)
    : produtos

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saúde Financeira</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análise de margem dos seus produtos — ordenados do pior ao melhor.
          </p>
        </div>
        <div className="flex gap-2">
          {(data?.alertas_nao_lidos ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>{data!.alertas_nao_lidos} alerta{data!.alertas_nao_lidos > 1 ? 's' : ''} de preço</span>
            </div>
          )}
          <Link href="/financeiro"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-4 h-4" /> Financeiro
          </Link>
          <Link href="/producao/ingredientes"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Package className="w-4 h-4" /> Ingredientes
          </Link>
        </div>
      </div>

      {isLoading ? <PageLoader /> : error ? (
        <Card>
          <p className="text-center text-red-500 py-8">Erro ao carregar dados.</p>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Total de produtos',
                value: produtos.length,
                color: 'text-gray-900',
                bg: 'bg-gray-50',
              },
              {
                label: 'Margem saudável (≥40%)',
                value: data?.produtos_saudaveis ?? 0,
                color: 'text-green-700',
                bg: 'bg-green-50',
              },
              {
                label: 'Margem crítica (<20%)',
                value: data?.produtos_criticos ?? 0,
                color: data?.produtos_criticos ? 'text-red-700' : 'text-gray-500',
                bg: data?.produtos_criticos ? 'bg-red-50' : 'bg-gray-50',
              },
              {
                label: 'Custo desatualizado',
                value: produtos.filter((p) => p.preco_desatualizado).length,
                color: produtos.some((p) => p.preco_desatualizado) ? 'text-amber-700' : 'text-gray-500',
                bg: produtos.some((p) => p.preco_desatualizado) ? 'bg-amber-50' : 'bg-gray-50',
              },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          {data && data.top_n > 0 && (
            <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl text-sm text-primary-800">
              <TrendingUp className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
              <p>
                Seus <strong>{data.top_n}</strong> produto{data.top_n > 1 ? 's' : ''} mais rentável{data.top_n > 1 ? 'is' : ''}
                {' '}geram{' '}
                <strong>{data.top_n_receita_percentual}%</strong> da margem total do seu catálogo.
              </p>
            </div>
          )}

          {/* Alertas de preço desatualizado */}
          {produtos.some((p) => p.preco_desatualizado) && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">
                  {produtos.filter((p) => p.preco_desatualizado).length} produto{produtos.filter((p) => p.preco_desatualizado).length > 1 ? 's' : ''} com custo desatualizado
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  O preço de um ou mais ingredientes foi alterado. As margens abaixo podem estar incorretas.
                </p>
              </div>
              <Link href="/producao/ingredientes" className="flex items-center gap-1 text-xs font-medium underline whitespace-nowrap">
                Ver ingredientes <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Legenda de margem */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="font-medium">Margem:</span>
            {[
              { cls: 'bg-green-100 text-green-700', label: '≥ 60% Excelente' },
              { cls: 'bg-green-50 text-green-600', label: '40–60% Boa' },
              { cls: 'bg-yellow-50 text-yellow-700', label: '20–40% Regular' },
              { cls: 'bg-red-50 text-red-700', label: '< 20% Crítica' },
            ].map((f) => (
              <span key={f.label} className={`px-2 py-0.5 rounded-full border ${f.cls}`}>{f.label}</span>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'todos', label: `Todos (${produtos.length})` },
              { key: 'criticos', label: `Críticos (${data?.produtos_criticos ?? 0})` },
              { key: 'saudaveis', label: `Saudáveis (${data?.produtos_saudaveis ?? 0})` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key as typeof filtro)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filtro === f.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Product list */}
          {filtrados.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mb-3 text-green-200" />
                {produtos.length === 0 ? (
                  <>
                    <p className="font-medium text-gray-600">Nenhum produto cadastrado</p>
                    <Link href="/producao/receitas"
                      className="mt-3 text-sm text-primary-600 hover:underline flex items-center gap-1">
                      Criar ficha técnica <ChevronRight className="w-3 h-3" />
                    </Link>
                  </>
                ) : (
                  <p className="font-medium text-gray-600">Nenhum produto neste filtro.</p>
                )}
              </div>
            </Card>
          ) : (
            <Card padding="none">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span className="flex-1">Produto</span>
                <span className="w-20 text-right hidden sm:block">Venda</span>
                <span className="w-20 text-right hidden sm:block">Custo</span>
                <span className="w-24 text-center">Margem</span>
                <span className="w-20 text-right">Lucro/un.</span>
                <span className="w-8"></span>
              </div>
              {filtrados.map((p) => (
                <ProdutoMargemRow key={p.id} produto={p} />
              ))}
              <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                {filtrados.length} produto{filtrados.length !== 1 ? 's' : ''}
                {filtro !== 'todos' && ` (filtro: ${filtro})`}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
