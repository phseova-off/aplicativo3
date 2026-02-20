'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/Select'
import { CategoriaSelect } from './CategoriaSelect'
import { transacaoSchema, type TransacaoFormValues } from '../schemas/transacao.schema'
import { useCreateTransacao } from '../hooks/useFinanceiro'

interface TransacaoFormProps {
  onSuccess?: () => void
}

const tipoOptions = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
]

export function TransacaoForm({ onSuccess }: TransacaoFormProps) {
  const { mutate: create, isPending } = useCreateTransacao()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransacaoFormValues>({
    resolver: zodResolver(transacaoSchema),
    defaultValues: {
      tipo: 'receita',
      data: new Date().toISOString().split('T')[0],
    },
  })

  const tipo = watch('tipo')
  const categoria = watch('categoria')

  function onSubmit(values: TransacaoFormValues) {
    create(values, {
      onSuccess: () => {
        reset()
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Tipo"
        options={tipoOptions}
        {...register('tipo')}
        error={errors.tipo?.message}
        required
      />

      <CategoriaSelect
        tipo={tipo}
        value={categoria ?? ''}
        onChange={(val) => setValue('categoria', val, { shouldValidate: true })}
        error={errors.categoria?.message}
      />

      <Input
        label="Valor (R$)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0,00"
        {...register('valor', { valueAsNumber: true })}
        error={errors.valor?.message}
        required
      />

      <Input
        label="Data"
        type="date"
        {...register('data')}
        error={errors.data?.message}
        required
      />

      <Input
        label="Descrição"
        placeholder="Descrição opcional..."
        {...register('descricao')}
        error={errors.descricao?.message}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending} className="flex-1">
          Registrar transação
        </Button>
        <Button type="button" variant="ghost" onClick={() => reset()}>
          Limpar
        </Button>
      </div>
    </form>
  )
}
