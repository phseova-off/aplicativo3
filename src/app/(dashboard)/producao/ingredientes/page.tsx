'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Search, Upload, Download, Pencil, Trash2,
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
  X, Loader2, Package, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { Badge } from '@/shared/components/ui/Badge'
import { PageLoader } from '@/shared/components/ui/LoadingSpinner'
import { formatCurrency } from '@/shared/lib/utils'
import {
  useIngredientesCatalogo,
  useAtualizarPreco,
  useCriarIngrediente,
  useDeletarIngrediente,
  useImportarPreview,
  useImportarConfirmar,
  type IngredienteCatalogoItem,
  type ImportarResult,
} from '@/features/producao/hooks/useIngredientesCatalogo'

// ── Freshness helpers ───────────────────────────────────────────

function getFreshnessInfo(preco_updated_at: string | null, created_at: string): {
  label: string
  color: 'green' | 'yellow' | 'red'
  days: number
} {
  const ref = preco_updated_at ?? created_at
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 30) return { label: `${days}d`, color: 'green', days }
  if (days < 60) return { label: `${days}d`, color: 'yellow', days }
  return { label: `${days}d`, color: 'red', days }
}

const freshnessColors = {
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red: 'bg-red-100 text-red-700 border-red-200',
}

// ── Modal: Atualizar Preço ──────────────────────────────────────

interface ModalAtualizarPrecoProps {
  ingrediente: IngredienteCatalogoItem | null
  isOpen: boolean
  onClose: () => void
}

function ModalAtualizarPreco({ ingrediente, isOpen, onClose }: ModalAtualizarPrecoProps) {
  const [novoPreco, setNovoPreco] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const { mutateAsync: atualizar, isPending } = useAtualizarPreco()

  useEffect(() => {
    if (ingrediente) {
      setNovoPreco(ingrediente.preco_atual.toString())
      setFornecedor(ingrediente.fornecedor ?? '')
    }
  }, [ingrediente])

  if (!ingrediente) return null

  const preco = parseFloat(novoPreco.replace(',', '.'))
  const mudou = !isNaN(preco) && preco !== ingrediente.preco_atual
  const variacao = ingrediente.preco_atual > 0
    ? ((preco - ingrediente.preco_atual) / ingrediente.preco_atual) * 100
    : 0
  const subiu = variacao > 0

  async function handleSalvar() {
    if (isNaN(preco) || preco <= 0) return
    await atualizar({
      id: ingrediente!.id,
      payload: { preco_atual: preco, fornecedor: fornecedor || null },
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Atualizar preço: ${ingrediente.nome}`} size="sm">
      <div className="space-y-4">
        {/* Preço anterior */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Preço atual</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(ingrediente.preco_atual)}
              <span className="text-xs font-normal text-gray-400 ml-1">/{ingrediente.unidade}</span>
            </p>
          </div>
          {ingrediente.preco_anterior && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Anterior</p>
              <p className="text-sm text-gray-500">{formatCurrency(ingrediente.preco_anterior)}</p>
            </div>
          )}
        </div>

        {/* Novo preço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Novo preço (R$/{ingrediente.unidade}) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={novoPreco}
            onChange={(e) => setNovoPreco(e.target.value)}
            placeholder="0,00"
            autoFocus
          />
          {/* Indicador de variação */}
          {mudou && !isNaN(preco) && preco > 0 && (
            <div className={`mt-2 flex items-center gap-1.5 text-sm ${subiu ? 'text-red-600' : 'text-green-600'}`}>
              {subiu ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {subiu ? '+' : ''}{variacao.toFixed(1)}% ({subiu ? 'alta' : 'baixa'})
              </span>
              {ingrediente.produtos_count > 0 && (
                <span className="text-gray-500">
                  — {ingrediente.produtos_count} produto{ingrediente.produtos_count > 1 ? 's' : ''} afetado{ingrediente.produtos_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
          <Input
            type="text"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            placeholder="Nome do fornecedor (opcional)"
          />
        </div>

        {/* Aviso cascata */}
        {mudou && ingrediente.produtos_count > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-medium">Impacto nos produtos</p>
            <p className="mt-0.5">
              {ingrediente.produtos_count} produto{ingrediente.produtos_count > 1 ? 's' : ''} terão
              seu custo recalculado e serão marcados como &quot;preço desatualizado&quot;.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            loading={isPending}
            onClick={handleSalvar}
            disabled={!preco || preco <= 0}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: Novo Ingrediente ─────────────────────────────────────

interface ModalNovoIngredienteProps {
  isOpen: boolean
  onClose: () => void
}

const UNIDADES = ['g', 'kg', 'ml', 'l', 'un', 'cx', 'pct']

function ModalNovoIngrediente({ isOpen, onClose }: ModalNovoIngredienteProps) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState('kg')
  const [fornecedor, setFornecedor] = useState('')
  const { mutateAsync: criar, isPending } = useCriarIngrediente()

  async function handleSalvar() {
    const precoNum = parseFloat(preco.replace(',', '.'))
    if (!nome.trim() || isNaN(precoNum) || precoNum <= 0) return
    await criar({ nome: nome.trim(), preco_atual: precoNum, unidade, fornecedor: fornecedor || null })
    setNome(''); setPreco(''); setUnidade('kg'); setFornecedor('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Ingrediente" size="sm">
      <div className="space-y-4">
        <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Farinha de Trigo" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço (R$) *" type="number" min="0.01" step="0.01" value={preco}
            onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <Input label="Fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="(opcional)" />
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={isPending} onClick={handleSalvar}
            disabled={!nome.trim() || !preco}>
            Adicionar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: Importar CSV ─────────────────────────────────────────

interface ModalImportarCSVProps {
  isOpen: boolean
  onClose: () => void
}

function ModalImportarCSV({ isOpen, onClose }: ModalImportarCSVProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<ImportarResult | null>(null)
  const { mutateAsync: gerarPreview, isPending: isPreview } = useImportarPreview()
  const { mutateAsync: confirmar, isPending: isConfirmar } = useImportarConfirmar()

  function handleClose() {
    setCsvText(''); setPreview(null)
    onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    const result = await gerarPreview(text)
    setPreview(result)
  }

  async function handleConfirmar() {
    if (!csvText) return
    await confirmar(csvText)
    handleClose()
  }

  const statusIcon = {
    novo: <span className="text-green-600 font-medium">+ Novo</span>,
    atualizar: <span className="text-blue-600 font-medium">↑ Atualizar</span>,
    erro: <span className="text-red-600 font-medium">✕ Erro</span>,
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Ingredientes (CSV)" size="lg">
      <div className="space-y-4">
        {/* Template download */}
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
          <div>
            <p className="font-medium">Formato esperado</p>
            <p className="text-xs text-blue-600 mt-0.5">Colunas: nome, preco, unidade (opcional), fornecedor (opcional)</p>
          </div>
          <a
            href="/api/ingredientes-catalogo/importar"
            download="template_ingredientes.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </a>
        </div>

        {/* File upload */}
        <div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Clique para selecionar o arquivo CSV</p>
            <p className="text-xs text-gray-400 mt-1">Formato: .csv, separado por vírgulas</p>
          </button>
        </div>

        {/* Preview */}
        {isPreview && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-600 mr-2" />
            <span className="text-sm text-gray-600">Processando arquivo...</span>
          </div>
        )}

        {preview && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Novos', value: preview.inseridos, color: 'bg-green-50 text-green-700 border-green-200' },
                { label: 'Atualizar', value: preview.atualizados, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Erros', value: preview.erros, color: 'bg-red-50 text-red-700 border-red-200' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border p-2 ${s.color}`}>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Line list */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
              {preview.linhas.map((l) => (
                <div key={l.linha} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-xs text-gray-400 w-8">#{l.linha}</span>
                  <span className="flex-1 truncate">{l.nome || '—'}</span>
                  <span className="text-xs text-gray-500 w-16 text-right">{l.preco_atual > 0 ? formatCurrency(l.preco_atual) : '—'}</span>
                  <span className="w-20 text-right text-xs">
                    {l.status === 'erro' ? (
                      <span className="text-red-500">{l.erro}</span>
                    ) : statusIcon[l.status]}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button
                className="flex-1"
                loading={isConfirmar}
                onClick={handleConfirmar}
                disabled={preview.inseridos + preview.atualizados === 0}
              >
                Confirmar importação
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── IngredienteRow ──────────────────────────────────────────────

interface IngredienteRowProps {
  item: IngredienteCatalogoItem
  onAtualizar: (item: IngredienteCatalogoItem) => void
  onDeletar: (item: IngredienteCatalogoItem) => void
}

function IngredienteRow({ item, onAtualizar, onDeletar }: IngredienteRowProps) {
  const [expanded, setExpanded] = useState(false)
  const freshness = getFreshnessInfo(item.preco_updated_at, item.created_at)
  const variacaoPerc = item.preco_anterior && item.preco_anterior > 0
    ? ((item.preco_atual - item.preco_anterior) / item.preco_anterior) * 100
    : null

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Nome + fornecedor */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.nome}</p>
          {item.fornecedor && (
            <p className="text-xs text-gray-400 truncate">{item.fornecedor}</p>
          )}
        </div>

        {/* Preço */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(item.preco_atual)}
            <span className="text-xs font-normal text-gray-400 ml-0.5">/{item.unidade}</span>
          </p>
          {variacaoPerc !== null && (
            <p className={`text-xs ${variacaoPerc > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {variacaoPerc > 0 ? '+' : ''}{variacaoPerc.toFixed(1)}%
            </p>
          )}
        </div>

        {/* Freshness badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${freshnessColors[freshness.color]}`}>
          {freshness.color === 'red' ? <AlertTriangle className="w-3 h-3 inline mr-0.5" /> : null}
          {freshness.label}
        </span>

        {/* Produtos count */}
        {item.produtos_count > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <Package className="w-3.5 h-3.5" />
            {item.produtos_count}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onAtualizar(item)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Atualizar preço"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeletar(item)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && item.produtos_count > 0 && (
        <div className="px-4 pb-2 text-xs text-gray-500 bg-gray-50">
          <p className="py-1 italic">
            Usado em {item.produtos_count} produto{item.produtos_count > 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────

export default function IngredientesPage() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [modalAtualizar, setModalAtualizar] = useState<IngredienteCatalogoItem | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalCSV, setModalCSV] = useState(false)
  const [filtroFrescor, setFiltroFrescor] = useState<'todos' | 'atualizar'>('todos')

  const { mutate: deletar } = useDeletarIngrediente()

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data: ingredientes = [], isLoading } = useIngredientesCatalogo(debouncedQ)

  const filtrados = filtroFrescor === 'atualizar'
    ? ingredientes.filter((i) => {
        const { color } = getFreshnessInfo(i.preco_updated_at, i.created_at)
        return color !== 'green'
      })
    : ingredientes

  const desatualizados = ingredientes.filter((i) => {
    const { color } = getFreshnessInfo(i.preco_updated_at, i.created_at)
    return color === 'red'
  }).length

  function handleDeletar(item: IngredienteCatalogoItem) {
    if (item.produtos_count > 0) {
      if (!confirm(`"${item.nome}" está em uso por ${item.produtos_count} produto(s). Deseja excluir mesmo assim?`)) return
    } else {
      if (!confirm(`Excluir "${item.nome}"?`)) return
    }
    deletar(item.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Ingredientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie preços e fornecedores dos ingredientes usados nas fichas técnicas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/producao/receitas"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <BookOpen className="w-4 h-4" /> Receitas
          </Link>
          <Button
            variant="secondary"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setModalCSV(true)}
          >
            Importar CSV
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModalNovo(true)}
          >
            Novo
          </Button>
        </div>
      </div>

      {/* Alerta desatualizados */}
      {desatualizados > 0 && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{desatualizados} ingrediente{desatualizados > 1 ? 's' : ''} sem atualização há mais de 60 dias</p>
            <p className="text-xs text-red-600 mt-0.5">Preços desatualizados podem distorcer o custo dos seus produtos.</p>
          </div>
          <button
            type="button"
            onClick={() => setFiltroFrescor('atualizar')}
            className="ml-auto text-xs font-medium underline whitespace-nowrap"
          >
            Ver só esses
          </button>
        </div>
      )}

      {/* Legenda de frescor */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="font-medium">Última atualização:</span>
        {[
          { color: 'green', label: 'Menos de 30 dias', cls: 'bg-green-100 text-green-700' },
          { color: 'yellow', label: '30–60 dias', cls: 'bg-yellow-100 text-yellow-700' },
          { color: 'red', label: 'Mais de 60 dias', cls: 'bg-red-100 text-red-700' },
        ].map((f) => (
          <span key={f.color} className={`px-2 py-0.5 rounded-full ${f.cls}`}>{f.label}</span>
        ))}
      </div>

      {/* Search + filtro */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ingrediente..."
            className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {q && (
            <button type="button" onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'atualizar', label: 'Desatualizados' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltroFrescor(f.key as 'todos' | 'atualizar')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filtroFrescor === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {ingredientes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: ingredientes.length, color: 'text-gray-900', bg: 'bg-gray-50' },
            {
              label: 'Em uso',
              value: ingredientes.filter((i) => i.produtos_count > 0).length,
              color: 'text-primary-700',
              bg: 'bg-primary-50',
            },
            {
              label: 'Desatualizados',
              value: desatualizados,
              color: desatualizados > 0 ? 'text-red-700' : 'text-green-700',
              bg: desatualizados > 0 ? 'bg-red-50' : 'bg-green-50',
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <PageLoader />
      ) : filtrados.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Package className="w-10 h-10 mb-3 text-gray-200" />
            {ingredientes.length === 0 ? (
              <>
                <p className="font-medium text-gray-600">Nenhum ingrediente cadastrado</p>
                <p className="text-sm mt-1">Adicione ingredientes para usar nas fichas técnicas.</p>
                <Button className="mt-4" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalNovo(true)}>
                  Adicionar primeiro ingrediente
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-600">Nenhum resultado para &quot;{q}&quot;</p>
                <button type="button" onClick={() => setQ('')} className="text-sm text-primary-600 hover:underline mt-1">
                  Limpar busca
                </button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card padding="none">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span className="flex-1">Nome / Fornecedor</span>
            <span className="w-28 text-right">Preço / unid.</span>
            <span className="w-16 text-center">Atualiz.</span>
            <span className="w-12 text-center">Prods</span>
            <span className="w-16 text-center">Ações</span>
          </div>
          {filtrados.map((item) => (
            <IngredienteRow
              key={item.id}
              item={item}
              onAtualizar={setModalAtualizar}
              onDeletar={handleDeletar}
            />
          ))}
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            {filtrados.length} ingrediente{filtrados.length !== 1 ? 's' : ''}
          </div>
        </Card>
      )}

      {/* Modals */}
      <ModalAtualizarPreco
        ingrediente={modalAtualizar}
        isOpen={!!modalAtualizar}
        onClose={() => setModalAtualizar(null)}
      />
      <ModalNovoIngrediente isOpen={modalNovo} onClose={() => setModalNovo(false)} />
      <ModalImportarCSV isOpen={modalCSV} onClose={() => setModalCSV(false)} />
    </div>
  )
}
