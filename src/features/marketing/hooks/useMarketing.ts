'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { MarketingCronogramaInput } from '../types/marketing.types'
import type { CronogramaMarketing } from '@/server/db/types'

// ─── Legacy API (existing /api/marketing/gerar) ───────────────

async function fetchCronogramas(): Promise<CronogramaMarketing[]> {
  const res = await fetch('/api/marketing/gerar')
  if (!res.ok) throw new Error('Erro ao buscar cronogramas')
  return res.json()
}

async function gerarCronograma(data: MarketingCronogramaInput): Promise<CronogramaMarketing> {
  const res = await fetch('/api/marketing/gerar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 429) throw new Error('Limite diário atingido. Tente amanhã.')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erro ao gerar cronograma')
  }
  return res.json()
}

async function deleteCronograma(id: string): Promise<void> {
  const res = await fetch(`/api/marketing/gerar?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir cronograma')
}

export function useCronogramas() {
  return useQuery({ queryKey: ['marketing_cronogramas'], queryFn: fetchCronogramas })
}

export function useGerarCronograma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gerarCronograma,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing_cronogramas'] })
      toast.success('Cronograma gerado com sucesso!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCronograma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCronograma,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing_cronogramas'] })
      toast.success('Cronograma excluído.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
