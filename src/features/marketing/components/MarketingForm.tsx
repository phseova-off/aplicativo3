'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/Select'
import { marketingSchema, type MarketingFormValues } from '../schemas/marketing.schema'
import { useGerarCronograma } from '../hooks/useMarketing'
import { TIPOS_NEGOCIO, PUBLICOS_ALVO, FOCOS_PERIODO } from '../types/marketing.types'

const periodOptions = [
  { value: '7', label: '7 dias (1 semana)' },
  { value: '14', label: '14 dias (2 semanas)' },
  { value: '21', label: '21 dias (3 semanas)' },
  { value: '30', label: '30 dias (1 mês)' },
]

export function MarketingForm() {
  const { mutate: gerar, isPending } = useGerarCronograma()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarketingFormValues>({
    resolver: zodResolver(marketingSchema),
    defaultValues: { periodo_dias: 7 },
  })

  function onSubmit(values: MarketingFormValues) {
    gerar(values)
  }

  const tipoOptions = TIPOS_NEGOCIO.map((t) => ({ value: t, label: t }))
  const publicoOptions = PUBLICOS_ALVO.map((p) => ({ value: p, label: p }))
  const focoOptions = FOCOS_PERIODO.map((f) => ({ value: f, label: f }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Tipo de negócio"
        options={tipoOptions}
        placeholder="Selecione o tipo"
        {...register('tipo_negocio')}
        error={errors.tipo_negocio?.message}
        required
      />

      <Select
        label="Público-alvo"
        options={publicoOptions}
        placeholder="Selecione o público"
        {...register('publico_alvo')}
        error={errors.publico_alvo?.message}
        required
      />

      <Select
        label="Período"
        options={periodOptions}
        {...register('periodo_dias', { valueAsNumber: true })}
        error={errors.periodo_dias?.message}
        required
      />

      <Select
        label="Foco do período"
        options={focoOptions}
        placeholder="Selecione o foco"
        {...register('foco')}
        error={errors.foco?.message}
        required
      />

      <Button
        type="submit"
        loading={isPending}
        className="w-full"
        leftIcon={<Sparkles className="w-4 h-4" />}
      >
        {isPending ? 'Gerando cronograma...' : 'Gerar com IA'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Limite de 5 cronogramas por dia. A geração pode levar alguns segundos.
      </p>
    </form>
  )
}
