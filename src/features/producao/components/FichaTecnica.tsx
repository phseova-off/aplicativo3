'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Search, Clock, Package } from 'lucide-react'
import { receitaSchema, type ReceitaFormValues } from '../schemas/producao.schema'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { CustoCalculadora } from './CustoCalculadora'
import { formatCurrency } from '@/shared/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────

interface IngredienteCatalogo {
  id: string
  nome: string
  unidade: string
  preco_atual: number
  fornecedor: string | null
}

// ─── Autocomplete ingrediente do catálogo ────────────────────

interface IngredienteAutocompleteProps {
  value: string
  onChange: (nome: string, ingredienteId?: string, unidade?: string, precoUnitario?: number) => void
  error?: string
  index: number
}

function IngredienteAutocomplete({ value, onChange, error, index }: IngredienteAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [opcoes, setOpcoes] = useState<IngredienteCatalogo[]>([])
  const [aberto, setAberto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const buscarIngredientes = useCallback(async (q: string) => {
    if (q.length < 1) { setOpcoes([]); return }
    setBuscando(true)
    try {
      const res = await fetch(`/api/ingredientes-catalogo?q=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setOpcoes(data)
        setAberto(true)
      }
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscarIngredientes(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, buscarIngredientes])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(ing: IngredienteCatalogo) {
    setQuery(ing.nome)
    setAberto(false)
    onChange(ing.nome, ing.id, ing.unidade, ing.preco_atual)
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Buscar ingrediente..."
          onFocus={() => { if (query.length >= 1) setAberto(true) }}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value) // campo livre enquanto digita
          }}
          className={`w-full h-9 pl-8 pr-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-200'
          }`}
          id={`ingrediente-nome-${index}`}
        />
        {buscando && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {aberto && opcoes.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-48 overflow-y-auto">
          {opcoes.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onClick={() => handleSelect(ing)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary-50 text-left transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{ing.nome}</p>
                {ing.fornecedor && (
                  <p className="text-xs text-gray-400">{ing.fornecedor}</p>
                )}
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="text-xs font-bold text-primary-700">
                  {formatCurrency(ing.preco_atual)}/{ing.unidade}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {aberto && !buscando && opcoes.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-3 text-xs text-gray-500 text-center">
          Nenhum ingrediente encontrado.{' '}
          <span className="text-primary-600">Cadastre no catálogo de ingredientes.</span>
        </div>
      )}
    </div>
  )
}

// ─── Constantes ───────────────────────────────────────────────

const categoriaOptions = [
  { value: 'trufa',  label: 'Trufa'  },
  { value: 'bombom', label: 'Bombom' },
  { value: 'kit',    label: 'Kit'    },
  { value: 'outro',  label: 'Outro'  },
]

const unidadeOptions = [
  { value: 'g',   label: 'g (gramas)'   },
  { value: 'kg',  label: 'kg'           },
  { value: 'ml',  label: 'ml'           },
  { value: 'l',   label: 'L (litros)'   },
  { value: 'un',  label: 'un (unidade)' },
  { value: 'cx',  label: 'cx (caixa)'   },
  { value: 'pct', label: 'pct (pacote)' },
]

// ─── Componente principal ─────────────────────────────────────

interface FichaTecnicaProps {
  defaultValues?: Partial<ReceitaFormValues>
  onSubmit: (values: ReceitaFormValues) => Promise<void>
  submitLabel?: string
}

export function FichaTecnica({ defaultValues, onSubmit, submitLabel = 'Salvar receita' }: FichaTecnicaProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReceitaFormValues>({
    resolver: zodResolver(receitaSchema),
    defaultValues: {
      categoria: 'outro',
      ativo: true,
      rendimento: 1,
      tempo_producao_minutos: 60,
      ingredientes: [],
      preco: 0,
      custo: 0,
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredientes' })
  const ingredientes = useWatch({ control, name: 'ingredientes' })
  const preco = useWatch({ control, name: 'preco' })
  const rendimento = watch('rendimento')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Informações básicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome do produto"
          placeholder="Ex: Trufa de Nutella"
          required
          error={errors.nome?.message}
          {...register('nome')}
        />
        <Select
          label="Categoria"
          options={categoriaOptions}
          error={errors.categoria?.message}
          {...register('categoria')}
        />
      </div>

      <Textarea
        label="Descrição"
        placeholder="Descrição detalhada do produto..."
        {...register('descricao')}
      />

      {/* Rendimento e tempo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Rendimento (unidades)"
            type="number"
            min="1"
            step="1"
            placeholder="Ex: 30"
            leftIcon={<Package className="w-4 h-4" />}
            error={errors.rendimento?.message}
            {...register('rendimento')}
          />
          <p className="text-xs text-gray-400 mt-1">
            Quantas unidades a receita produz
          </p>
        </div>
        <div>
          <Input
            label="Tempo de produção (min)"
            type="number"
            min="0"
            step="5"
            placeholder="Ex: 90"
            leftIcon={<Clock className="w-4 h-4" />}
            error={errors.tempo_producao_minutos?.message}
            {...register('tempo_producao_minutos')}
          />
          <p className="text-xs text-gray-400 mt-1">
            Usado para estimar carga semanal
          </p>
        </div>
      </div>

      {/* Ingredientes com autocomplete do catálogo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Ingredientes</label>
            <p className="text-xs text-gray-400 mt-0.5">
              Busque no catálogo para custo atualizado automaticamente
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => append({ nome: '', quantidade: 100, unidade: 'g', custo_unitario: 0, ingrediente_id: null })}
          >
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              {/* Autocomplete nome/catálogo */}
              <IngredienteAutocomplete
                index={index}
                value={watch(`ingredientes.${index}.nome`) || ''}
                error={errors.ingredientes?.[index]?.nome?.message}
                onChange={(nome, ingredienteId, unidade, precoUnitario) => {
                  setValue(`ingredientes.${index}.nome`, nome)
                  if (ingredienteId) setValue(`ingredientes.${index}.ingrediente_id`, ingredienteId)
                  if (unidade) setValue(`ingredientes.${index}.unidade`, unidade as 'g' | 'kg' | 'l' | 'ml' | 'un' | 'cx' | 'pct')
                  if (precoUnitario !== undefined) setValue(`ingredientes.${index}.custo_unitario`, precoUnitario)
                }}
              />

              {/* Quantidade */}
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Qtd"
                  error={errors.ingredientes?.[index]?.quantidade?.message}
                  {...register(`ingredientes.${index}.quantidade`)}
                />
              </div>

              {/* Unidade */}
              <div className="w-24">
                <Select
                  options={unidadeOptions}
                  {...register(`ingredientes.${index}.unidade`)}
                />
              </div>

              {/* Custo unitário */}
              <div className="w-24">
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="R$/un"
                  error={errors.ingredientes?.[index]?.custo_unitario?.message}
                  {...register(`ingredientes.${index}.custo_unitario`)}
                />
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 py-3 text-center border-2 border-dashed border-gray-200 rounded-xl">
              Adicione os ingredientes da receita
            </p>
          )}
        </div>
      </div>

      {/* Calculadora de custo */}
      <CustoCalculadora
        ingredientes={ingredientes ?? []}
        preco={Number(preco) || 0}
        rendimento={Number(rendimento) || 1}
        onPrecoChange={(val) => setValue('preco', val)}
      />

      {/* Preço e status */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Preço de venda (R$)"
          type="number"
          step="0.01"
          min="0"
          required
          error={errors.preco?.message}
          {...register('preco')}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-primary-600"
              {...register('ativo')}
            />
            Produto ativo no cardápio
          </label>
        </div>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
