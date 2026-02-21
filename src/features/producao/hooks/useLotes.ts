'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { LoteComProgresso } from '../types/producao.types'
import type { LoteUpdateValues } from '../schemas/producao.schema'

async function fetchLotes(semana?: string): Promise<LoteComProgresso[]> {
  const qs = semana ? `?semana=${semana}` : ''
  const res = await fetch(`/api/producao/lotes${qs}`)
  if (!res.ok) throw new Error('Erro ao buscar lotes')
  return res.json()
}

async function updateLote({ id, data }: { id: string; data: LoteUpdateValues }) {
  const res = await fetch(`/api/producao/lotes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar lote')
  return res.json()
}

async function deleteLote(id: string) {
  const res = await fetch(`/api/producao/lotes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir lote')
}

export function useLotes(semana?: string) {
  return useQuery({
    queryKey: ['producao', 'lotes', semana],
    queryFn: () => fetchLotes(semana),
  })
}

export function useUpdateLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateLote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao', 'lotes'] })
      toast.success('Lote atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao', 'lotes'] })
      toast.success('Lote removido.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
