'use client'

import { Select } from '@/shared/components/ui/Select'
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '../types/financeiro.types'
import type { TransacaoTipo } from '../types/financeiro.types'

interface CategoriaSelectProps {
  tipo: TransacaoTipo
  value: string
  onChange: (value: string) => void
  error?: string
}

export function CategoriaSelect({ tipo, value, onChange, error }: CategoriaSelectProps) {
  const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  const options = categorias.map((cat) => ({ value: cat, label: cat }))

  return (
    <Select
      label="Categoria"
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      placeholder="Selecione uma categoria"
      required
    />
  )
}
