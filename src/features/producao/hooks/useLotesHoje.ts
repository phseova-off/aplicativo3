'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { LoteStatus } from '@/server/db/types'
import type { ConcluirLoteValues } from '../schemas/producao.schema'

// ─── Types ────────────────────────────────────────────────────

export interface LoteHoje {
  id: string
  confeiteiro_id: string
  produto_id: string | null
  nome_produto: string
  quantidade_planejada: number
  quantidade_produzida: number
  data_producao: string
  custo_total: number
  custo_estimado: number
  custo_real: number | null
  observacoes: string | null
  status: LoteStatus
  pedido_id: string | null
  progresso: number    // 0–100, calculado pelo servidor
  urgencia: 'atrasado' | 'amanha' | 'futuro'
  pedido?: {
    id: string
    cliente_nome: string
    cliente_telefone: string | null
    data_entrega: string | null
    valor_total: number
    status: string
    observacoes: string | null
  } | null
}

// ─── Fetchers ─────────────────────────────────────────────────

async function fetchLotesHoje(): Promise<LoteHoje[]> {
  const res = await fetch('/api/producao/hoje')
  if (!res.ok) throw new Error('Erro ao carregar lotes do dia')
  return res.json()
}

async function iniciarLote(id: string): Promise<LoteHoje> {
  const res = await fetch(`/api/producao/lotes/${id}/iniciar`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao iniciar lote')
  }
  return res.json()
}

async function concluirLote(id: string, values: ConcluirLoteValues): Promise<LoteHoje & { sugestao_pronto?: boolean }> {
  const res = await fetch(`/api/producao/lotes/${id}/concluir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      typeof err.error === 'string'
        ? err.error
        : err.error?.formErrors?.[0] ?? 'Erro ao concluir lote'
    )
  }
  return res.json()
}

async function cancelarLote(id: string): Promise<void> {
  const res = await fetch(`/api/producao/lotes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelado' }),
  })
  if (!res.ok) throw new Error('Erro ao cancelar lote')
}

// ─── Hooks ────────────────────────────────────────────────────

export function useLotesHoje() {
  return useQuery({
    queryKey: ['producao', 'hoje'],
    queryFn: fetchLotesHoje,
    refetchInterval: 120_000, // 2 min
  })
}

export function useIniciarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: iniciarLote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      toast.success('Produção iniciada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useConcluirLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ConcluirLoteValues }) =>
      concluirLote(id, values),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      if (!data.sugestao_pronto) {
        toast.success('Lote concluído!')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelarLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelarLote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      toast.success('Lote cancelado.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
