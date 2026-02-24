'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Calculator, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { IngredienteCalculo, ResultadoPrecificacao } from '../types/financeiro.types'

// ── Tipos ─────────────────────────────────────────────────────

interface Produto {
  id: string
  nome: string
  preco_venda: number
  custo_calculado: number
  rendimento: number | null
  tempo_producao_minutos: number | null
  preco_desatualizado: boolean
}

interface Ingrediente {
  id: string
  nome: string
  preco_atual: number
  unidade: string
}

// ── Cálculo (puro, client-side) ───────────────────────────────

function calcular(params: {
  ingredientes: IngredienteCalculo[]
  rendimento: number
  tempoProducao: number
  valorHora: number
  custoEmbalagem: number
  incluirImpostos: boolean
  percImpostos: number
  precoAtual: number | null
}): ResultadoPrecificacao {
  const { ingredientes, rendimento, tempoProducao, valorHora, custoEmbalagem, incluirImpostos, percImpostos, precoAtual } = params

  const detalhes = ingredientes.map(ing => ({
    nome: ing.nome,
    quantidade: ing.quantidade,
    unidade: ing.unidade,
    custo: (ing.quantidade * ing.custo_unitario) / (rendimento || 1),
  }))

  const custo_ingredientes = detalhes.reduce((s, d) => s + d.custo, 0)
  const custo_mao_de_obra = rendimento > 0 ? ((tempoProducao / 60) * valorHora) / rendimento : 0
  const custo_base = custo_ingredientes + custoEmbalagem + custo_mao_de_obra
  const custo_impostos = incluirImpostos ? custo_base * (percImpostos / 100) : 0
  const custo_total = custo_base + custo_impostos

  const margem_atual = precoAtual && precoAtual > 0
    ? ((precoAtual - custo_total) / precoAtual) * 100
    : null

  return {
    custo_ingredientes,
    custo_embalagem: custoEmbalagem,
    custo_mao_de_obra,
    custo_impostos,
    custo_total,
    preco_sugerido_50: custo_total > 0 ? custo_total / 0.5 : 0,
    preco_sugerido_70: custo_total > 0 ? custo_total / 0.3 : 0,
    preco_sugerido_80: custo_total > 0 ? custo_total / 0.2 : 0,
    preco_atual: precoAtual,
    margem_atual,
    detalhes_ingredientes: detalhes,
    tempo_producao_minutos: tempoProducao,
    valor_hora_trabalho: valorHora,
    rendimento,
  }
}

// ── Linha de custo ────────────────────────────────────────────

function LinhaCusto({ label, valor, destaque, sub }: {
  label: string; valor: number; destaque?: boolean; sub?: boolean
}) {
  return (
    <div className={cn(
      'flex justify-between items-baseline py-1',
      destaque && 'border-t border-gray-200 pt-2 mt-1',
      sub ? 'pl-4 text-gray-500' : ''
    )}>
      <span className={cn('text-sm', destaque ? 'font-bold text-gray-900' : 'text-gray-600')}>
        {label}
      </span>
      <span className={cn('text-sm font-semibold tabular-nums', destaque ? 'text-gray-900 text-base' : 'text-gray-700')}>
        {formatCurrency(valor)}
      </span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export function CalculadoraPrecificacao() {
  const qc = useQueryClient()

  // Produto selecionado
  const [produtoId, setProdutoId] = useState<string>('')
  const [precoAtual, setPrecoAtual] = useState<number | null>(null)

  // Ingredientes da receita
  const [ingredientes, setIngredientes] = useState<IngredienteCalculo[]>([])
  const [ingredienteIdAdd, setIngredienteIdAdd] = useState('')
  const [qtdAdd, setQtdAdd] = useState('')

  // Parâmetros de produção
  const [rendimento, setRendimento] = useState(1)
  const [tempoProducao, setTempoProducao] = useState(60)
  const [valorHora, setValorHora] = useState(20)
  const [custoEmbalagem, setCustoEmbalagem] = useState(0.5)

  // Impostos
  const [incluirImpostos, setIncluirImpostos] = useState(false)
  const [percImpostos, setPercImpostos] = useState(6)

  // UI
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)
  const [novoPreco, setNovoPreco] = useState<number | null>(null)

  // ── Queries ───────────────────────────────────────────────

  const { data: produtos = [], isLoading: loadingProd } = useQuery<Produto[]>({
    queryKey: ['produtos-full'],
    queryFn: async () => {
      const r = await fetch('/api/produtos?full=true&limit=100')
      if (!r.ok) throw new Error('Erro ao buscar produtos')
      return r.json()
    },
  })

  const { data: catalogo = [], isLoading: loadingCat } = useQuery<Ingrediente[]>({
    queryKey: ['ingredientes-catalogo-prec'],
    queryFn: async () => {
      const r = await fetch('/api/ingredientes-catalogo')
      if (!r.ok) throw new Error('Erro ao buscar catálogo')
      return r.json()
    },
  })

  const { mutate: salvarPreco, isPending: salvando } = useMutation({
    mutationFn: async ({ id, preco }: { id: string; preco: number }) => {
      const r = await fetch('/api/produtos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, preco_venda: preco }),
      })
      if (!r.ok) throw new Error('Erro ao salvar preço')
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos-full'] })
      toast.success('Preço de venda atualizado!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // ── Handlers ──────────────────────────────────────────────

  const handleSelecionarProduto = useCallback((id: string) => {
    setProdutoId(id)
    const prod = produtos.find(p => p.id === id)
    if (!prod) { setPrecoAtual(null); return }
    setPrecoAtual(prod.preco_venda ?? null)
    if (prod.rendimento) setRendimento(prod.rendimento)
    if (prod.tempo_producao_minutos) setTempoProducao(prod.tempo_producao_minutos)
  }, [produtos])

  const handleAddIngrediente = () => {
    if (!ingredienteIdAdd || !qtdAdd) return
    const cat = catalogo.find(c => c.id === ingredienteIdAdd)
    if (!cat) return
    if (ingredientes.find(i => i.ingrediente_id === ingredienteIdAdd)) {
      toast.error('Ingrediente já adicionado')
      return
    }
    setIngredientes(prev => [...prev, {
      ingrediente_id: cat.id,
      nome: cat.nome,
      quantidade: parseFloat(qtdAdd),
      custo_unitario: cat.preco_atual,
      unidade: cat.unidade,
    }])
    setIngredienteIdAdd('')
    setQtdAdd('')
  }

  const handleRemoverIngrediente = (id: string) => {
    setIngredientes(prev => prev.filter(i => i.ingrediente_id !== id))
  }

  // ── Cálculo ───────────────────────────────────────────────

  const resultado: ResultadoPrecificacao | null = ingredientes.length > 0 || custoEmbalagem > 0
    ? calcular({ ingredientes, rendimento, tempoProducao, valorHora, custoEmbalagem, incluirImpostos, percImpostos, precoAtual })
    : null

  const margemNegativa = resultado && resultado.margem_atual !== null && resultado.margem_atual < 0

  if (loadingProd || loadingCat) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">

      {/* Passo 1 — Produto */}
      <Card padding="md">
        <CardHeader><CardTitle>① Produto (opcional)</CardTitle></CardHeader>
        <select
          value={produtoId}
          onChange={e => handleSelecionarProduto(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">— Cálculo avulso (sem produto cadastrado) —</option>
          {produtos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.preco_desatualizado ? '⚠️ preço desatualizado' : ''}
            </option>
          ))}
        </select>
      </Card>

      {/* Passo 2 — Ingredientes */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>② Ingredientes</CardTitle>
          <span className="text-xs text-gray-400">{ingredientes.length} adicionado(s)</span>
        </CardHeader>

        {/* Adicionar ingrediente */}
        <div className="flex gap-2 mb-4">
          <select
            value={ingredienteIdAdd}
            onChange={e => setIngredienteIdAdd(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Selecione o ingrediente...</option>
            {catalogo.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} — {formatCurrency(c.preco_atual)}/{c.unidade}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            min="0"
            value={qtdAdd}
            onChange={e => setQtdAdd(e.target.value)}
            placeholder="Qtd"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleAddIngrediente}
            disabled={!ingredienteIdAdd || !qtdAdd}
          >
            Adicionar
          </Button>
        </div>

        {ingredientes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            Nenhum ingrediente adicionado ainda.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 rounded-lg border border-gray-100 overflow-hidden">
            {ingredientes.map(ing => (
              <div key={ing.ingrediente_id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ing.nome}</p>
                  <p className="text-xs text-gray-400">
                    {ing.quantidade} {ing.unidade} × {formatCurrency(ing.custo_unitario)}/{ing.unidade}
                    {' = '}
                    <span className="font-medium text-gray-600">
                      {formatCurrency(ing.quantidade * ing.custo_unitario)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleRemoverIngrediente(ing.ingrediente_id)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Passo 3 — Parâmetros */}
      <Card padding="md">
        <CardHeader><CardTitle>③ Parâmetros de Produção</CardTitle></CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Rendimento (unidades)"
            type="number"
            min="1"
            value={rendimento}
            onChange={e => setRendimento(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <Input
            label="Tempo de produção (min)"
            type="number"
            min="0"
            value={tempoProducao}
            onChange={e => setTempoProducao(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <Input
            label="Valor da hora de trabalho (R$)"
            type="number"
            step="0.50"
            min="0"
            value={valorHora}
            onChange={e => setValorHora(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Custo de embalagem/unid (R$)"
            type="number"
            step="0.01"
            min="0"
            value={custoEmbalagem}
            onChange={e => setCustoEmbalagem(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Toggle impostos */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIncluirImpostos(v => !v)}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                incluirImpostos ? 'bg-primary-600' : 'bg-gray-200'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                incluirImpostos && 'translate-x-5'
              )} />
            </div>
            <span className="text-sm font-medium text-gray-700">Incluir DAS/Impostos no cálculo</span>
          </label>
          {incluirImpostos && (
            <div className="mt-3 ml-13">
              <Input
                label="Percentual de impostos (%)"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={percImpostos}
                onChange={e => setPercImpostos(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-400 mt-1">Padrão: 6% para MEI. Ajuste conforme seu regime tributário.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Passo 4 — Resultado */}
      {resultado && (
        <Card padding="md" className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary-600" />
              ④ Cálculo Transparente
            </CardTitle>
          </CardHeader>

          {/* Custo linha a linha */}
          <div className="space-y-0.5">
            <LinhaCusto
              label={`Custo dos ingredientes`}
              valor={resultado.custo_ingredientes}
            />

            {/* Sub-itens de ingredientes */}
            <button
              onClick={() => setMostrarDetalhes(v => !v)}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 pl-4 mb-1"
            >
              {mostrarDetalhes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {mostrarDetalhes ? 'Ocultar detalhes' : 'Ver por ingrediente'}
            </button>

            {mostrarDetalhes && resultado.detalhes_ingredientes.map(d => (
              <div key={d.nome} className="flex justify-between pl-6 py-0.5">
                <span className="text-xs text-gray-500">
                  {d.nome}: {d.quantidade} {d.unidade}
                </span>
                <span className="text-xs font-medium text-gray-600">{formatCurrency(d.custo)}</span>
              </div>
            ))}

            <LinhaCusto label="Custo de embalagem" valor={resultado.custo_embalagem} />
            <LinhaCusto
              label={`Mão de obra (${tempoProducao}min × ${formatCurrency(valorHora)}/h ÷ ${rendimento} unid.)`}
              valor={resultado.custo_mao_de_obra}
            />
            {incluirImpostos && (
              <LinhaCusto label={`Impostos (${percImpostos}%)`} valor={resultado.custo_impostos} />
            )}
            <LinhaCusto label="CUSTO TOTAL POR UNIDADE" valor={resultado.custo_total} destaque />
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-4" />

          {/* Preços sugeridos */}
          <div className="space-y-2">
            <PrecoSugerido label="Margem 50%" valor={resultado.preco_sugerido_50} />
            <PrecoSugerido label="Margem 70%" valor={resultado.preco_sugerido_70} recomendado />
            <PrecoSugerido label="Margem 80%" valor={resultado.preco_sugerido_80} />
          </div>

          {/* Comparativo com preço atual */}
          {resultado.preco_atual !== null && resultado.preco_atual > 0 && (
            <div className={cn(
              'mt-4 rounded-xl p-4 border',
              margemNegativa
                ? 'border-red-200 bg-red-50'
                : resultado.margem_atual! < 30
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-green-200 bg-green-50'
            )}>
              {margemNegativa ? (
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Preço abaixo do custo!</p>
                    <p className="text-sm text-red-600 mt-0.5">
                      Você cobra {formatCurrency(resultado.preco_atual)} mas o custo real é {formatCurrency(resultado.custo_total)}.
                      Cada unidade vendida gera <strong>prejuízo de {formatCurrency(resultado.custo_total - resultado.preco_atual)}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <CheckCircle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', resultado.margem_atual! < 30 ? 'text-yellow-500' : 'text-green-500')} />
                  <div>
                    <p className={cn('text-sm font-semibold', resultado.margem_atual! < 30 ? 'text-yellow-800' : 'text-green-800')}>
                      Você cobra {formatCurrency(resultado.preco_atual)}.
                      O custo real é {formatCurrency(resultado.custo_total)}.
                      Sua margem atual é <strong>{resultado.margem_atual!.toFixed(1)}%</strong>.
                    </p>
                    {resultado.margem_atual! < 30 && (
                      <p className="text-xs text-yellow-700 mt-1">Margem baixa — considere reajustar o preço.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Salvar novo preço */}
          {produtoId && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Atualizar preço de venda do produto:</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoPreco ?? resultado.preco_sugerido_70.toFixed(2)}
                  onChange={e => setNovoPreco(parseFloat(e.target.value) || 0)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Novo preço (R$)"
                />
                <Button
                  onClick={() => {
                    const preco = novoPreco ?? resultado!.preco_sugerido_70
                    salvarPreco({ id: produtoId, preco })
                  }}
                  loading={salvando}
                >
                  Atualizar preço de venda
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function PrecoSugerido({ label, valor, recomendado = false }: {
  label: string; valor: number; recomendado?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg px-4 py-2.5 border',
      recomendado
        ? 'border-primary-300 bg-primary-100 ring-1 ring-primary-400'
        : 'border-gray-200 bg-white'
    )}>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-medium', recomendado ? 'text-primary-800' : 'text-gray-700')}>
          {label}
        </span>
        {recomendado && (
          <span className="text-[10px] bg-primary-600 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
            Recomendado
          </span>
        )}
      </div>
      <span className={cn(
        'text-base font-bold tabular-nums',
        recomendado ? 'text-primary-700' : 'text-gray-800'
      )}>
        {formatCurrency(valor)}
      </span>
    </div>
  )
}
