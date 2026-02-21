'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { PedidoProducao, LoteComProgresso } from '../types/producao.types'

// ─── Fetchers ─────────────────────────────────────────────────

async function fetchDiario(): Promise<PedidoProducao[]> {
  const res = await fetch('/api/producao/diario')
  if (!res.ok) throw new Error('Erro ao carregar produção do dia')
  return res.json()
}

async function iniciarProducao(pedido_id: string): Promise<void> {
  const res = await fetch('/api/producao/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido_id }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao iniciar produção')
  }
}

async function concluirProducao(pedido_id: string): Promise<void> {
  const res = await fetch('/api/producao/concluir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido_id }),
  })
  if (!res.ok) throw new Error('Erro ao concluir produção')
}

// ─── Hooks ────────────────────────────────────────────────────

export function useProducaoDiario() {
  return useQuery({
    queryKey: ['producao', 'diario'],
    queryFn: fetchDiario,
    refetchInterval: 30_000,
  })
}

export function useIniciarProducao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: iniciarProducao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Produção iniciada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useConcluirProducao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: concluirProducao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao'] })
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Produção concluída! Pedido movido para Pronto.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
