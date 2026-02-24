'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Transacao } from '@/server/db/types'
import type { DashboardFinanceiro, ClienteAnalise } from '../types/financeiro.types'

interface TransacaoInput {
  tipo: 'receita' | 'despesa'
  categoria: string
  valor: number
  descricao?: string | null
  data: string
  pedido_id?: string | null
}

interface TransacoesResponse {
  data: Transacao[]
  total: number
  page: number
  limit: number
}

async function fetchTransacoes(params?: {
  mes?: string
  tipo?: string
  categoria?: string
  page?: number
  limit?: number
}): Promise<TransacoesResponse> {
  const sp = new URLSearchParams()
  if (params?.mes) sp.set('mes', params.mes)
  if (params?.tipo) sp.set('tipo', params.tipo)
  if (params?.categoria) sp.set('categoria', params.categoria)
  if (params?.page) sp.set('page', String(params.page))
  sp.set('limit', String(params?.limit ?? 100))

  const res = await fetch(`/api/financeiro?${sp.toString()}`)
  if (!res.ok) throw new Error('Erro ao buscar transações')
  return res.json()
}

async function createTransacao(data: TransacaoInput): Promise<Transacao> {
  const res = await fetch('/api/financeiro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao criar transação')
  return res.json()
}

async function deleteTransacao(id: string): Promise<void> {
  const res = await fetch(`/api/financeiro?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir transação')
}

async function fetchDashboard(): Promise<DashboardFinanceiro> {
  const res = await fetch('/api/financeiro/dashboard')
  if (!res.ok) throw new Error('Erro ao carregar dashboard financeiro')
  return res.json()
}

async function fetchClientes(): Promise<ClienteAnalise[]> {
  const res = await fetch('/api/financeiro/clientes')
  if (!res.ok) throw new Error('Erro ao carregar análise de clientes')
  return res.json()
}

/** Hook legado — array plano de transações */
export function useTransacoes(params?: {
  mes?: string
  tipo?: string
  categoria?: string
}) {
  return useQuery({
    queryKey: ['transacoes', params],
    queryFn: () => fetchTransacoes({ ...params, limit: 100 }),
    select: (res) => res.data,
  })
}

export function useTransacoesPaginadas(params: {
  mes?: string
  tipo?: string
  categoria?: string
  page: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['transacoes-paginadas', params],
    queryFn: () => fetchTransacoes(params),
  })
}

export function useCreateTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTransacao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes'] })
      qc.invalidateQueries({ queryKey: ['transacoes-paginadas'] })
      qc.invalidateQueries({ queryKey: ['financeiro-dashboard'] })
      toast.success('Transação registrada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTransacao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes'] })
      qc.invalidateQueries({ queryKey: ['transacoes-paginadas'] })
      qc.invalidateQueries({ queryKey: ['financeiro-dashboard'] })
      toast.success('Transação excluída.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDashboardFinanceiro() {
  return useQuery({
    queryKey: ['financeiro-dashboard'],
    queryFn: fetchDashboard,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientesAnalise() {
  return useQuery({
    queryKey: ['financeiro-clientes'],
    queryFn: fetchClientes,
    staleTime: 1000 * 60 * 5,
  })
}
