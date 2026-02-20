'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { ProducaoWithPedido } from '../types/producao.types'

async function fetchProducao(): Promise<ProducaoWithPedido[]> {
  const res = await fetch('/api/producao')
  if (!res.ok) throw new Error('Erro ao buscar produção')
  return res.json()
}

async function updateProducao({
  id,
  data,
}: {
  id: string
  data: { etapa?: string; status?: string; observacoes?: string }
}): Promise<ProducaoWithPedido> {
  const res = await fetch(`/api/producao?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar produção')
  return res.json()
}

export function useProducao() {
  return useQuery({
    queryKey: ['producao'],
    queryFn: fetchProducao,
  })
}

export function useUpdateProducao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProducao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      toast.success('Produção atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
