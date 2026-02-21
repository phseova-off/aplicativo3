'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { CronogramaMarketing } from '@/server/db/types'
import type { CronogramaInput } from '../types/marketing.types'

async function fetchCronograma(mes: number, ano: number): Promise<CronogramaMarketing | null> {
  const res = await fetch(`/api/marketing/gerar-cronograma?mes=${mes}&ano=${ano}`)
  if (!res.ok) throw new Error('Erro ao buscar cronograma')
  const list: CronogramaMarketing[] = await res.json()
  return list[0] ?? null
}

async function gerarCronograma(input: CronogramaInput): Promise<CronogramaMarketing> {
  const res = await fetch('/api/marketing/gerar-cronograma', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (res.status === 429) throw new Error('Limite diário de 5 gerações atingido. Tente amanhã.')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erro ao gerar cronograma')
  }
  return res.json()
}

async function fetchProdutos(): Promise<{ id: string; nome: string }[]> {
  const res = await fetch('/api/producao/receitas')
  if (!res.ok) return []
  const data = await res.json()
  return (Array.isArray(data) ? data : data.receitas ?? []).map(
    (p: { id: string; nome: string }) => ({ id: p.id, nome: p.nome })
  )
}

export function useCronogramaDoMes(mes: number, ano: number) {
  return useQuery({
    queryKey: ['cronograma_marketing', mes, ano],
    queryFn: () => fetchCronograma(mes, ano),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGerarCronogramaMarketing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gerarCronograma,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['cronograma_marketing', data.mes, data.ano] })
      toast.success('Cronograma gerado com sucesso!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useProdutosMarketing() {
  return useQuery({
    queryKey: ['produtos_marketing'],
    queryFn: fetchProdutos,
    staleTime: 1000 * 60 * 10,
  })
}
