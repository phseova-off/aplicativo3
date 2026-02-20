'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { pedidoSchema, type PedidoFormValues } from '../schemas/pedido.schema'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
]

interface PedidoFormProps {
  defaultValues?: Partial<PedidoFormValues>
  onSubmit: (values: PedidoFormValues) => Promise<void>
  submitLabel?: string
}

export function PedidoForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Salvar pedido',
}: PedidoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      status: 'pendente',
      itens: [],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome do cliente"
          placeholder="Maria Silva"
          required
          error={errors.cliente_nome?.message}
          {...register('cliente_nome')}
        />
        <Input
          label="WhatsApp"
          type="tel"
          placeholder="(11) 99999-9999"
          error={errors.cliente_telefone?.message}
          {...register('cliente_telefone')}
        />
      </div>

      <Textarea
        label="Descrição do pedido"
        placeholder="Bolo de aniversário 2 andares, cobertura de chantilly..."
        {...register('descricao')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Valor total (R$)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          required
          error={errors.valor?.message}
          {...register('valor')}
        />
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

      {/* Itens */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Itens do pedido</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => append({ produto: '', quantidade: 1, preco_unitario: 0 })}
          >
            Adicionar item
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Nome do produto"
                  error={errors.itens?.[index]?.produto?.message}
                  {...register(`itens.${index}.produto`)}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  error={errors.itens?.[index]?.quantidade?.message}
                  {...register(`itens.${index}.quantidade`)}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Preço"
                  error={errors.itens?.[index]?.preco_unitario?.message}
                  {...register(`itens.${index}.preco_unitario`)}
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
            <p className="text-sm text-gray-400 py-2">Nenhum item adicionado.</p>
          )}
        </div>
      </div>

      <Textarea
        label="Observações internas"
        placeholder="Notas para produção..."
        {...register('observacoes')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
