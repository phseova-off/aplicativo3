'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { receitaSchema, type ReceitaFormValues } from '../schemas/producao.schema'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { CustoCalculadora } from './CustoCalculadora'

const categoriaOptions = [
  { value: 'trufa',  label: 'Trufa'  },
  { value: 'bombom', label: 'Bombom' },
  { value: 'kit',    label: 'Kit'    },
  { value: 'outro',  label: 'Outro'  },
]

const unidadeOptions = [
  { value: 'g',    label: 'g (gramas)'   },
  { value: 'kg',   label: 'kg'            },
  { value: 'ml',   label: 'ml'            },
  { value: 'l',    label: 'L (litros)'    },
  { value: 'un',   label: 'un (unidade)'  },
  { value: 'cx',   label: 'cx (caixa)'    },
  { value: 'pct',  label: 'pct (pacote)'  },
]

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
      ingredientes: [],
      preco: 0,
      custo: 0,
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredientes' })
  const ingredientes = useWatch({ control, name: 'ingredientes' })
  const preco = useWatch({ control, name: 'preco' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Basic info */}
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

      {/* Ingredientes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Ingredientes</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => append({ nome: '', quantidade: 100, unidade: 'g', custo_unitario: 0 })}
          >
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  placeholder="Ingrediente"
                  error={errors.ingredientes?.[index]?.nome?.message}
                  {...register(`ingredientes.${index}.nome`)}
                />
              </div>
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
              <div className="w-24">
                <Select
                  options={unidadeOptions}
                  {...register(`ingredientes.${index}.unidade`)}
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="R$/un"
                  error={errors.ingredientes?.[index]?.custo_unitario?.message}
                  {...register(`ingredientes.${index}.custo_unitario`)}
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
              Adicione os ingredientes da receita
            </p>
          )}
        </div>
      </div>

      {/* Cost calculator */}
      <CustoCalculadora
        ingredientes={ingredientes ?? []}
        preco={Number(preco) || 0}
        onPrecoChange={(val) => setValue('preco', val)}
      />

      {/* Price */}
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
