'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { ReceitaComCusto } from '../types/producao.types'
import type { ReceitaFormValues } from '../schemas/producao.schema'

async function fetchReceitas(): Promise<ReceitaComCusto[]> {
  const res = await fetch('/api/producao/receitas')
  if (!res.ok) throw new Error('Erro ao buscar receitas')
  return res.json()
}

async function createReceita(data: ReceitaFormValues): Promise<ReceitaComCusto> {
  const res = await fetch('/api/producao/receitas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao criar receita')
  }
  return res.json()
}

async function updateReceita({ id, data }: { id: string; data: Partial<ReceitaFormValues> }) {
  const res = await fetch(`/api/producao/receitas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar receita')
  return res.json()
}

async function deleteReceita(id: string) {
  const res = await fetch(`/api/producao/receitas/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir receita')
}

export function useReceitas() {
  return useQuery({
    queryKey: ['producao', 'receitas'],
    queryFn: fetchReceitas,
  })
}

export function useCreateReceita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createReceita,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao', 'receitas'] })
      toast.success('Receita criada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateReceita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateReceita,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao', 'receitas'] })
      toast.success('Receita atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteReceita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteReceita,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao', 'receitas'] })
      toast.success('Receita excluída.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
