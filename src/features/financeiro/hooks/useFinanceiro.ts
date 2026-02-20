'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Transacao } from '@/server/db/types'

interface TransacaoInput {
  tipo: 'receita' | 'despesa'
  categoria: string
  valor: number
  descricao?: string
  data: string
}

async function fetchTransacoes(): Promise<Transacao[]> {
  const res = await fetch('/api/financeiro')
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

export function useTransacoes() {
  return useQuery({
    queryKey: ['transacoes'],
    queryFn: fetchTransacoes,
  })
}

export function useCreateTransacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTransacao,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transacoes'] })
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
      toast.success('Transação excluída.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
