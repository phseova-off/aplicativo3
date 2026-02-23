'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { pedidoSchema, type PedidoFormValues } from '../schemas/pedido.schema'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { CanalIcon } from './CanalIcon'
import { ClienteAutocomplete } from './ClienteAutocomplete'
import { ProdutoAutocomplete } from './ProdutoAutocomplete'
import { formatCurrency } from '@/shared/lib/utils'
import type { PedidoCanal } from '@/server/db/types'

const statusOptions = [
  { value: 'novo',       label: 'Novo'        },
  { value: 'confirmado', label: 'Confirmado'  },
  { value: 'producao',   label: 'Em Produção' },
  { value: 'pronto',     label: 'Pronto'      },
  { value: 'entregue',   label: 'Entregue'    },
  { value: 'cancelado',  label: 'Cancelado'   },
]

const canalOptions: { value: PedidoCanal; label: string }[] = [
  { value: 'whatsapp',   label: 'WhatsApp'   },
  { value: 'instagram',  label: 'Instagram'  },
  { value: 'presencial', label: 'Presencial' },
]

interface PedidoFormProps {
  defaultValues?: Partial<PedidoFormValues>
  onSubmit: (values: PedidoFormValues) => Promise<void>
  submitLabel?: string
}

export function PedidoForm({ defaultValues, onSubmit, submitLabel = 'Salvar pedido' }: PedidoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      status: 'novo',
      canal: 'presencial',
      itens: [],
      valor_total: 0,
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' })

  // Auto-calculate total from items
  const itens = useWatch({ control, name: 'itens' })
  useEffect(() => {
    if (!itens || itens.length === 0) return
    const total = itens.reduce((sum, it) => {
      return sum + (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0)
    }, 0)
    setValue('valor_total', parseFloat(total.toFixed(2)))
  }, [itens, setValue])

  const selectedCanal = useWatch({ control, name: 'canal' })
  const nomeCliente = watch('cliente_nome') ?? ''
  const telefoneCliente = watch('cliente_telefone') ?? ''
  const valorTotal = watch('valor_total') ?? 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Client autocomplete */}
      <Controller
        name="cliente_nome"
        control={control}
        render={({ field }) => (
          <ClienteAutocomplete
            nomeValue={field.value ?? ''}
            telefoneValue={telefoneCliente}
            onNomeChange={(val) => setValue('cliente_nome', val)}
            onTelefoneChange={(val) => setValue('cliente_telefone', val)}
            nomeError={errors.cliente_nome?.message}
            telefoneError={errors.cliente_telefone?.message}
          />
        )}
      />

      {/* Canal + Data + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Canal de origem</label>
          <div className="flex gap-2">
            {canalOptions.map((opt) => {
              const active = selectedCanal === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('canal', opt.value)}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all',
                    active
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  ].join(' ')}
                >
                  <CanalIcon canal={opt.value} size="md" />
                  {opt.label}
                </button>
              )
            })}
          </div>
          {errors.canal && <p className="text-xs text-red-600">{errors.canal.message}</p>}
          <input type="hidden" {...register('canal')} />
        </div>

        <Input
          label="Data de entrega"
          type="date"
          error={errors.data_entrega?.message}
          {...register('data_entrega')}
        />

        <Select
          label="Status"
          options={statusOptions}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>

      {/* Items with product autocomplete */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Itens do pedido</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => append({ nome_produto: '', quantidade: 1, preco_unitario: 0.01, produto_id: null })}
          >
            Adicionar item
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              {/* Product autocomplete replaces the plain text input */}
              <Controller
                name={`itens.${index}.nome_produto`}
                control={control}
                render={({ field: f }) => (
                  <ProdutoAutocomplete
                    value={f.value}
                    onChange={(nome, preco, produtoId) => {
                      setValue(`itens.${index}.nome_produto`, nome)
                      if (preco !== undefined) setValue(`itens.${index}.preco_unitario`, preco)
                      if (produtoId !== undefined) setValue(`itens.${index}.produto_id`, produtoId)
                    }}
                    error={errors.itens?.[index]?.nome_produto?.message}
                  />
                )}
              />
              <div className="w-20">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  error={errors.itens?.[index]?.quantidade?.message}
                  {...register(`itens.${index}.quantidade`, { valueAsNumber: true })}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$ Preço"
                  error={errors.itens?.[index]?.preco_unitario?.message}
                  {...register(`itens.${index}.preco_unitario`, { valueAsNumber: true })}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-0.5 p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 py-3 text-center border-2 border-dashed border-gray-200 rounded-lg">
              Nenhum item — clique em &ldquo;Adicionar item&rdquo;
            </p>
          )}
        </div>

        {fields.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-600 font-medium">Total</span>
            <span className="text-base font-bold text-primary-700">
              {formatCurrency(valorTotal)}
            </span>
            <input type="hidden" {...register('valor_total', { valueAsNumber: true })} />
          </div>
        )}
      </div>

      <Textarea
        label="Observações internas"
        placeholder="Notas para produção, preferências do cliente..."
        {...register('observacoes')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
